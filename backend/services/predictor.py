"""
services/predictor.py
=====================
ChurnPredictor — the single source of truth for model loading and inference.

Design choices:
  - Loaded once at app startup via FastAPI lifespan (not per-request).
  - Supports ultra-fast pure NumPy inference runner (zero TF dependency, no OOM)
    with TensorFlow fallback if needed.
  - All model artifacts (model, scaler, feature_names, threshold) are
    encapsulated here so routers stay thin and do zero ML logic.
  - Stateless predict methods: take raw Pydantic objects, return typed dicts.
"""

from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from backend.config import (
    DEFAULT_THRESHOLD,
    FEATURE_NAMES_PATH,
    MODEL_PATH,
    RISK_BANDS,
    SCALER_PATH,
    THRESHOLD_PATH,
    METADATA_PATH,
    WEIGHTS_PATH,
)
from backend.models.schemas import CustomerFeatures, PredictionResponse, RiskLevel
from backend.services.numpy_model import NumPyANNModel
from backend.utils.preprocessing import preprocess_batch, preprocess_single

logger = logging.getLogger(__name__)


def _risk_level(prob: float) -> RiskLevel:
    """Map churn probability to a risk tier."""
    for level, (lo, hi) in RISK_BANDS.items():
        if lo <= prob < hi:
            return RiskLevel(level)
    return RiskLevel.critical


class ChurnPredictor:
    """
    Encapsulates the full inference pipeline for the Bank Churn ANN model.

    Usage:
        predictor = ChurnPredictor()
        predictor.load()                    # call once at startup
        result = predictor.predict_single(customer_obj)
    """

    def __init__(self) -> None:
        self._model = None
        self._scaler = None
        self._feature_names: Optional[list[str]] = None
        self._threshold: float = DEFAULT_THRESHOLD
        self._threshold_metric: str = "default"
        self._metadata: dict = {}
        self._loaded: bool = False
        self._artifacts_loaded: bool = False
        self._engine: str = "none"
        self._load_error: Optional[str] = None

    # ─── Loading ──────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load all artifacts. Uses NumPy runner if weights.json is present for maximum speed & stability."""
        logger.info("Loading ChurnPredictor artifacts …")
        self._load_error = None

        # 1. Model loading (Try NumPy model runner first, then TensorFlow)
        if Path(WEIGHTS_PATH).exists():
            try:
                self._model = NumPyANNModel(WEIGHTS_PATH)
                self._loaded = True
                self._engine = "numpy"
                logger.info("  [OK] Model loaded using ultra-fast NumPy engine: %s", WEIGHTS_PATH)
            except Exception as e:
                logger.warning("  [WARN] Failed to load NumPy model weights: %s. Trying TensorFlow...", e)
                self._load_error = f"NumPy load error: {e}"

        if not self._loaded and Path(MODEL_PATH).exists():
            try:
                import tensorflow as tf
                try:
                    self._model = tf.keras.models.load_model(MODEL_PATH, compile=False)
                except Exception as e_comp:
                    logger.warning("  [WARN] load_model compile=False failed (%s), retrying default...", e_comp)
                    self._model = tf.keras.models.load_model(MODEL_PATH)
                self._loaded = True
                self._engine = "tensorflow"
                logger.info("  [OK] Model loaded using TensorFlow engine: %s", MODEL_PATH)
            except Exception as e:
                err_msg = f"TensorFlow load error: {e}"
                logger.error("  [ERROR] %s", err_msg)
                self._load_error = (self._load_error + "; " + err_msg) if self._load_error else err_msg

        if not self._loaded:
            if not Path(WEIGHTS_PATH).exists() and not Path(MODEL_PATH).exists():
                self._load_error = f"Neither {WEIGHTS_PATH} nor {MODEL_PATH} exist."
            logger.error("  [ERROR] Model loading failed completely. Load error: %s", self._load_error)

        # 2. Scaler (independent try-except)
        if Path(SCALER_PATH).exists():
            try:
                with open(SCALER_PATH, "rb") as f:
                    self._scaler = pickle.load(f)
                logger.info("  [OK] Scaler loaded: %s", SCALER_PATH)
            except Exception as e:
                logger.error("  [ERROR] Failed to load scaler: %s", e)
        else:
            logger.warning("  [WARN] Scaler not found at %s — run export_artifacts.py first.", SCALER_PATH)

        # 3. Feature names (independent try-except)
        if Path(FEATURE_NAMES_PATH).exists():
            try:
                with open(FEATURE_NAMES_PATH, "rb") as f:
                    self._feature_names = pickle.load(f)
                logger.info("  [OK] Feature names loaded (%d features)", len(self._feature_names))
            except Exception as e:
                logger.error("  [ERROR] Failed to load feature names: %s", e)
        else:
            logger.warning("  [WARN] Feature names not found — run export_artifacts.py first.")

        # 4. Threshold (optional, falls back to DEFAULT_THRESHOLD)
        if Path(THRESHOLD_PATH).exists():
            try:
                with open(THRESHOLD_PATH) as f:
                    threshold_data = json.load(f)
                self._threshold = threshold_data.get("optimal_threshold", DEFAULT_THRESHOLD)
                self._threshold_metric = threshold_data.get("metric", "F1-optimised")
                logger.info("  [OK] Threshold loaded: %.2f (%s)", self._threshold, self._threshold_metric)
            except Exception as e:
                logger.warning("  [WARN] Failed to read threshold.json: %s", e)
        else:
            logger.warning("  [WARN] Threshold file missing — using default: %.2f", self._threshold)

        # 5. Metadata (informational only)
        if Path(METADATA_PATH).exists():
            try:
                with open(METADATA_PATH) as f:
                    self._metadata = json.load(f)
                logger.info("  [OK] Metadata loaded.")
            except Exception as e:
                logger.warning("  [WARN] Failed to read metadata.json: %s", e)

        self._artifacts_loaded = (
            self._scaler is not None and self._feature_names is not None
        )
        logger.info(
            "ChurnPredictor ready. Model loaded: %s (engine=%s) | Artifacts loaded: %s",
            self._loaded, self._engine, self._artifacts_loaded,
        )

    # ─── Properties ───────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def artifacts_loaded(self) -> bool:
        return self._artifacts_loaded

    @property
    def engine(self) -> str:
        return self._engine

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    @property
    def threshold(self) -> float:
        return self._threshold

    @property
    def feature_names(self) -> list[str]:
        return self._feature_names or []

    @property
    def metadata(self) -> dict:
        return self._metadata

    @property
    def threshold_metric(self) -> str:
        return self._threshold_metric

    # ─── Inference ────────────────────────────────────────────────────────────

    def _build_response(self, prob: float) -> PredictionResponse:
        """Convert a raw probability to a structured PredictionResponse."""
        will_churn = prob >= self._threshold
        confidence = round(abs(prob - 0.5) * 2, 4)   # [0, 1]: 0=uncertain, 1=certain
        return PredictionResponse(
            churn_probability=round(float(prob), 4),
            will_churn=bool(will_churn),
            risk_level=_risk_level(prob),
            confidence=confidence,
            threshold_used=round(self._threshold, 4),
        )

    def predict_single(self, customer: CustomerFeatures) -> PredictionResponse:
        """
        Predict churn for one customer.
        """
        if not self._loaded:
            raise RuntimeError(f"Predictor not loaded. Load error: {self._load_error}")
        if not self._artifacts_loaded:
            raise RuntimeError(
                "Scaler / feature names not found. Run export_artifacts.py first."
            )

        X = preprocess_single(customer, self._feature_names, self._scaler)
        raw_pred = self._model.predict(X, verbose=0)
        prob = float(np.asarray(raw_pred).flatten()[0])
        return self._build_response(prob)

    def predict_batch(self, customers: list[CustomerFeatures]) -> list[PredictionResponse]:
        """
        Predict churn for a batch of customers.
        """
        if not self._loaded:
            raise RuntimeError(f"Predictor not loaded. Load error: {self._load_error}")
        if not self._artifacts_loaded:
            raise RuntimeError(
                "Scaler / feature names not found. Run export_artifacts.py first."
            )

        X = preprocess_batch(customers, self._feature_names, self._scaler)
        raw_pred = self._model.predict(X, verbose=0)
        probs = np.asarray(raw_pred).flatten()
        return [self._build_response(p) for p in probs]


# ─── Singleton instance (shared via FastAPI app.state) ────────────────────────
predictor = ChurnPredictor()
