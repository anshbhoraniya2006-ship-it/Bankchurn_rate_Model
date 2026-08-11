"""
routers/health.py
=================
System-level endpoints for health checks and model introspection.

Routes:
  GET /health       — liveness / readiness probe
  GET /model/info   — architecture details, features, threshold
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request

from backend.models.schemas import HealthResponse, ModelInfoResponse

router = APIRouter(tags=["system"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness / readiness check",
    description=(
        "Returns HTTP 200 if the API is running. "
        "`model_loaded` indicates whether the Keras model is in memory. "
        "`artifacts_loaded` indicates whether the scaler and feature names are available."
    ),
)
async def health_check(request: Request) -> HealthResponse:
    predictor = request.app.state.predictor
    return HealthResponse(
        status="ok",
        model_loaded=predictor.is_loaded,
        artifacts_loaded=predictor.artifacts_loaded,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Model architecture and training metadata",
    description=(
        "Returns detailed information about the deployed model: "
        "architecture, training approach, feature schema, and classification threshold."
    ),
)
async def model_info(request: Request) -> ModelInfoResponse:
    predictor = request.app.state.predictor
    meta = predictor.metadata

    return ModelInfoResponse(
        model_name=meta.get("model_name", "Bank Churn ANN v3"),
        version="3.0.0",
        framework=meta.get("framework", "TensorFlow/Keras"),
        architecture=meta.get("architecture", "Sequential ANN (Keras Tuner Hyperband-optimised)"),
        features=predictor.feature_names,
        num_features=len(predictor.feature_names),
        threshold=predictor.threshold,
        threshold_metric=predictor.threshold_metric,
        training_notes=meta.get("training_notes", "ANN v3 with SMOTE, 5-fold CV, SHAP"),
        raw_input_fields=meta.get(
            "raw_input_fields",
            ["CreditScore", "Geography", "Gender", "Age", "Tenure",
             "Balance", "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary"],
        ),
    )
