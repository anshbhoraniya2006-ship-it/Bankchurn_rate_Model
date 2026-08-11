"""
services/predictor.py
=====================
ChurnPredictor — the single source of truth for model loading and inference.

Design choices:
  - Loaded once at app startup via FastAPI lifespan (not per-request).
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
)
from backend.models.schemas import CustomerFeatures, PredictionResponse, RiskLevel
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

    # ─── Loading ──────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load all artifacts. Raises RuntimeError if the model file is missing."""
        logger.info("Loading ChurnPredictor artifacts …")

        # 1. Keras model (required)
        if not Path(MODEL_PATH).exists():
            raise RuntimeError(f"Model file not found: {MODEL_PATH}")

        import tensorflow as tf  # Deferred import — TF is heavy
        self._model = tf.keras.models.load_model(MODEL_PATH)
        self._loaded = True
        logger.info("  [OK] Model loaded: %s", MODEL_PATH)

        # 2. Scaler (required for valid inference)
        if Path(SCALER_PATH).exists():
            with open(SCALER_PATH, "rb") as f:
                self._scaler = pickle.load(f)
            logger.info("  [OK] Scaler loaded: %s", SCALER_PATH)
        else:
            logger.warning("  [WARN] Scaler not found at %s — run export_artifacts.py first.", SCALER_PATH)

        # 3. Feature names (required)
        if Path(FEATURE_NAMES_PATH).exists():
            with open(FEATURE_NAMES_PATH, "rb") as f:
                self._feature_names = pickle.load(f)
            logger.info("  [OK] Feature names loaded (%d features)", len(self._feature_names))
        else:
            logger.warning("  [WARN] Feature names not found — run export_artifacts.py first.")

        # 4. Threshold (optional, falls back to DEFAULT_THRESHOLD)
        if Path(THRESHOLD_PATH).exists():
            with open(THRESHOLD_PATH) as f:
                threshold_data = json.load(f)
            self._threshold = threshold_data.get("optimal_threshold", DEFAULT_THRESHOLD)
            self._threshold_metric = threshold_data.get("metric", "F1-optimised")
            logger.info("  [OK] Threshold loaded: %.2f (%s)", self._threshold, self._threshold_metric)
        else:
            logger.warning("  [WARN] Threshold file missing — using default: %.2f", self._threshold)

        # 5. Metadata (informational only)
        if Path(METADATA_PATH).exists():
            with open(METADATA_PATH) as f:
                self._metadata = json.load(f)
            logger.info("  [OK] Metadata loaded.")

        self._artifacts_loaded = (
            self._scaler is not None and self._feature_names is not None
        )
        logger.info("ChurnPredictor ready. Artifacts loaded: %s", self._artifacts_loaded)

    # ─── Properties ───────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def artifacts_loaded(self) -> bool:
        return self._artifacts_loaded

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

        Parameters
        ----------
        customer : CustomerFeatures — validated Pydantic model from the API

        Returns
        -------
        PredictionResponse
        """
        if not self._loaded:
            raise RuntimeError("Predictor not loaded. Call predictor.load() first.")
        if not self._artifacts_loaded:
            raise RuntimeError(
                "Scaler / feature names not found. Run export_artifacts.py first."
            )

        X = preprocess_single(customer, self._feature_names, self._scaler)
        prob = float(self._model.predict(X, verbose=0).flatten()[0])
        return self._build_response(prob)

    def predict_batch(self, customers: list[CustomerFeatures]) -> list[PredictionResponse]:
        """
        Predict churn for a batch of customers.

        Parameters
        ----------
        customers : list of CustomerFeatures

        Returns
        -------
        list of PredictionResponse (same order as input)
        """
        if not self._loaded:
            raise RuntimeError("Predictor not loaded. Call predictor.load() first.")
        if not self._artifacts_loaded:
            raise RuntimeError(
                "Scaler / feature names not found. Run export_artifacts.py first."
            )

        X = preprocess_batch(customers, self._feature_names, self._scaler)
        probs = self._model.predict(X, verbose=0).flatten()
        return [self._build_response(p) for p in probs]


# ─── Singleton instance (shared via FastAPI app.state) ────────────────────────
predictor = ChurnPredictor()
