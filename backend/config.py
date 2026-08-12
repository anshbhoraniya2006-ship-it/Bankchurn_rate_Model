"""
config.py
=========
Centralised configuration for the Bank Churn FastAPI backend.
All paths, constants, and app metadata live here.
"""

import os
from pathlib import Path

# ─── Base Paths ───────────────────────────────────────────────────────────────
# backend/ is one level inside the project root
BASE_DIR = Path(__file__).resolve().parent.parent          # D:/Bank churnrate/
ARTIFACTS_DIR = BASE_DIR / "model_artifacts"
MODEL_PATH = ARTIFACTS_DIR / "best_ann_v3.keras"

# ─── Artifact Paths ───────────────────────────────────────────────────────────
SCALER_PATH = ARTIFACTS_DIR / "scaler.pkl"
FEATURE_NAMES_PATH = ARTIFACTS_DIR / "feature_names.pkl"
THRESHOLD_PATH = ARTIFACTS_DIR / "threshold.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
WEIGHTS_PATH = ARTIFACTS_DIR / "weights.json"


# ─── Default Inference Settings ───────────────────────────────────────────────
DEFAULT_THRESHOLD = 0.38          # Fallback if threshold.json not found
MAX_BATCH_SIZE = 100              # Max customers per batch request

# ─── Risk Level Bands ─────────────────────────────────────────────────────────
# Maps churn probability → human-readable risk tier
RISK_BANDS = {
    "Low":      (0.00, 0.25),
    "Medium":   (0.25, 0.50),
    "High":     (0.50, 0.75),
    "Critical": (0.75, 1.01),
}

# ─── App Metadata ─────────────────────────────────────────────────────────────
APP_TITLE = "Bank Churn Prediction API"
APP_DESCRIPTION = (
    "REST API for predicting bank customer churn probability using a "
    "Keras-Tuner-optimised ANN (v3) trained with SMOTE oversampling, "
    "5-fold stratified cross-validation, and F1-optimal threshold tuning."
)
APP_VERSION = "3.0.0"
CONTACT = {"name": "Bank Churn ML Team"}
TAGS_METADATA = [
    {"name": "predictions", "description": "Single and batch churn predictions"},
    {"name": "system",      "description": "Health checks and model information"},
]

# ─── CORS Origins (restrict in production) ────────────────────────────────────
ALLOWED_ORIGINS = ["*"]
