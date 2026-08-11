"""
routers/predict.py
==================
Prediction endpoints for the Bank Churn API.

Routes:
  POST /predict             — single customer churn prediction
  POST /predict/batch       — batch prediction (1–100 customers)
  GET  /predict/example     — example request payload
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from backend.models.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    CustomerFeatures,
    PredictionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["predictions"])


# ─── Single Prediction ────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict churn for a single customer",
    description=(
        "Accepts a customer's feature vector and returns the churn probability, "
        "binary prediction, risk level, and confidence score.\n\n"
        "**Risk levels**: Low (<25%), Medium (25–50%), High (50–75%), Critical (>75%)"
    ),
)
async def predict_single(
    customer: CustomerFeatures,
    request: Request,
) -> PredictionResponse:
    predictor = request.app.state.predictor

    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Please try again shortly.",
        )
    if not predictor.artifacts_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Preprocessing artifacts (scaler / feature names) are missing. "
                "Run `python export_artifacts.py` from the project root first."
            ),
        )

    try:
        result = predictor.predict_single(customer)
        logger.info(
            "Prediction: prob=%.4f | churn=%s | risk=%s",
            result.churn_probability,
            result.will_churn,
            result.risk_level,
        )
        return result
    except Exception as exc:
        logger.exception("Inference error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {exc}",
        ) from exc


# ─── Batch Prediction ─────────────────────────────────────────────────────────
@router.post(
    "/batch",
    response_model=BatchPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch churn prediction (up to 100 customers)",
    description=(
        "Accepts a list of up to 100 customer feature vectors and returns "
        "predictions for all of them in a single call, along with aggregate statistics."
    ),
)
async def predict_batch(
    payload: BatchPredictionRequest,
    request: Request,
) -> BatchPredictionResponse:
    predictor = request.app.state.predictor

    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Please try again shortly.",
        )
    if not predictor.artifacts_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Preprocessing artifacts are missing. "
                "Run `python export_artifacts.py` first."
            ),
        )

    try:
        predictions = predictor.predict_batch(payload.customers)
        churners = sum(1 for p in predictions if p.will_churn)
        churn_rate = round(churners / len(predictions), 4) if predictions else 0.0

        logger.info(
            "Batch prediction: %d customers | %d churners (%.1f%%)",
            len(predictions), churners, churn_rate * 100,
        )

        return BatchPredictionResponse(
            predictions=predictions,
            total=len(predictions),
            churners=churners,
            churn_rate=churn_rate,
        )
    except Exception as exc:
        logger.exception("Batch inference error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference failed: {exc}",
        ) from exc


# ─── Example Payload ──────────────────────────────────────────────────────────
@router.get(
    "/example",
    summary="Get an example prediction request payload",
    description="Returns a ready-to-use example payload that can be pasted into POST /predict.",
)
async def example_payload() -> dict:
    return {
        "description": "Paste this body into POST /predict to test the API.",
        "single_customer_example": {
            "CreditScore": 650,
            "Geography": "France",
            "Gender": "Female",
            "Age": 40,
            "Tenure": 5,
            "Balance": 75000.0,
            "NumOfProducts": 2,
            "HasCrCard": 1,
            "IsActiveMember": 1,
            "EstimatedSalary": 90000.0,
        },
        "high_risk_customer_example": {
            "CreditScore": 400,
            "Geography": "Germany",
            "Gender": "Female",
            "Age": 45,
            "Tenure": 2,
            "Balance": 120000.0,
            "NumOfProducts": 1,
            "HasCrCard": 0,
            "IsActiveMember": 0,
            "EstimatedSalary": 60000.0,
        },
        "batch_endpoint": "POST /predict/batch",
        "batch_example": {
            "customers": [
                {
                    "CreditScore": 650, "Geography": "France", "Gender": "Female",
                    "Age": 40, "Tenure": 5, "Balance": 75000.0,
                    "NumOfProducts": 2, "HasCrCard": 1,
                    "IsActiveMember": 1, "EstimatedSalary": 90000.0,
                },
                {
                    "CreditScore": 400, "Geography": "Germany", "Gender": "Female",
                    "Age": 45, "Tenure": 2, "Balance": 120000.0,
                    "NumOfProducts": 1, "HasCrCard": 0,
                    "IsActiveMember": 0, "EstimatedSalary": 60000.0,
                },
            ]
        },
    }
