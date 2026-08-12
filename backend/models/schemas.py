"""
models/schemas.py
=================
Pydantic v2 request/response schemas for the Bank Churn API.

All fields use strict types and include examples for automatic Swagger
documentation generation.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field


# ─── Enumerations ─────────────────────────────────────────────────────────────
class Geography(str, Enum):
    france  = "France"
    germany = "Germany"
    spain   = "Spain"


class Gender(str, Enum):
    male   = "Male"
    female = "Female"


class RiskLevel(str, Enum):
    low      = "Low"
    medium   = "Medium"
    high     = "High"
    critical = "Critical"


# ─── Input Schema ─────────────────────────────────────────────────────────────
class CustomerFeatures(BaseModel):
    """Raw customer features as collected by the bank's CRM system."""

    CreditScore: Annotated[int, Field(
        ge=300, le=900,
        description="Customer credit score (300–900)",
        examples=[650],
    )]
    Geography: Annotated[Geography, Field(
        description="Country of residence",
        examples=["France"],
    )]
    Gender: Annotated[Gender, Field(
        description="Customer gender",
        examples=["Female"],
    )]
    Age: Annotated[int, Field(
        ge=18, le=100,
        description="Customer age in years",
        examples=[40],
    )]
    Tenure: Annotated[int, Field(
        ge=0, le=10,
        description="Number of years with the bank (0–10)",
        examples=[5],
    )]
    Balance: Annotated[float, Field(
        ge=0.0,
        description="Account balance in EUR",
        examples=[75000.0],
    )]
    NumOfProducts: Annotated[int, Field(
        ge=1, le=4,
        description="Number of bank products held",
        examples=[2],
    )]
    HasCrCard: Annotated[int, Field(
        ge=0, le=1,
        description="Has a credit card? (0=No, 1=Yes)",
        examples=[1],
    )]
    IsActiveMember: Annotated[int, Field(
        ge=0, le=1,
        description="Is an active member? (0=No, 1=Yes)",
        examples=[1],
    )]
    EstimatedSalary: Annotated[float, Field(
        ge=0.0,
        description="Estimated annual salary in EUR",
        examples=[90000.0],
    )]

    model_config = {
        "json_schema_extra": {
            "example": {
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
            }
        }
    }


# ─── Prediction Response ──────────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    """Churn prediction result for a single customer."""

    churn_probability: Annotated[float, Field(
        ge=0.0, le=1.0,
        description="Predicted probability of churn (0–1)",
    )]
    will_churn: Annotated[bool, Field(
        description="Binary churn prediction at the optimal threshold",
    )]
    risk_level: Annotated[RiskLevel, Field(
        description="Human-readable risk tier (Low / Medium / High / Critical)",
    )]
    confidence: Annotated[float, Field(
        ge=0.0, le=1.0,
        description="Model confidence: distance from 0.5 (0=uncertain, 0.5=certain)",
    )]
    threshold_used: Annotated[float, Field(
        ge=0.0, le=1.0,
        description="Classification threshold used for will_churn",
    )]


# ─── Batch Request / Response ─────────────────────────────────────────────────
class BatchPredictionRequest(BaseModel):
    """Batch of customers to classify in one API call (max 100)."""

    customers: Annotated[list[CustomerFeatures], Field(
        min_length=1, max_length=100,
        description="List of customer feature objects (1–100)",
    )]


class BatchPredictionResponse(BaseModel):
    """Batch prediction results with aggregate statistics."""

    predictions: list[PredictionResponse]
    total: Annotated[int, Field(description="Total number of customers processed")]
    churners: Annotated[int, Field(description="Count predicted to churn")]
    churn_rate: Annotated[float, Field(description="Predicted churn rate in this batch")]


# ─── Health / Info Responses ──────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool
    artifacts_loaded: bool
    engine: str = "none"
    load_error: str | None = None
    timestamp: str



class ModelInfoResponse(BaseModel):
    model_name: str
    version: str
    framework: str
    architecture: str
    features: list[str]
    num_features: int
    threshold: float
    threshold_metric: str
    training_notes: str
    raw_input_fields: list[str]
