"""
utils/preprocessing.py
=======================
Converts raw customer input (from the API request) into the scaled
numpy array the ANN model expects, exactly mirroring the notebook pipeline.

Pipeline:
  raw dict → DataFrame → one-hot encode (drop_first=True)
           → align to training feature columns
           → StandardScaler.transform()
           → numpy array of shape (n, 11)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from backend.models.schemas import CustomerFeatures


# Expected OHE columns after `pd.get_dummies(..., drop_first=True)`:
# Geography_Germany, Geography_Spain  (France is the dropped reference)
# Gender_Male                          (Female is the dropped reference)


def customer_to_dict(customer: CustomerFeatures) -> dict:
    """
    Convert a CustomerFeatures Pydantic object to the same flat-dict
    representation that the notebook used before get_dummies.
    """
    return {
        "CreditScore":     customer.CreditScore,
        "Age":             customer.Age,
        "Tenure":          customer.Tenure,
        "Balance":         customer.Balance,
        "NumOfProducts":   customer.NumOfProducts,
        "HasCrCard":       customer.HasCrCard,
        "IsActiveMember":  customer.IsActiveMember,
        "EstimatedSalary": customer.EstimatedSalary,
        # One-hot encoded fields (drop_first=True in notebook)
        "Geography_Germany": int(customer.Geography.value == "Germany"),
        "Geography_Spain":   int(customer.Geography.value == "Spain"),
        "Gender_Male":       int(customer.Gender.value == "Male"),
    }


def preprocess_single(
    customer: CustomerFeatures,
    feature_names: list[str],
    scaler: StandardScaler,
) -> np.ndarray:
    """
    Preprocess a single customer into a scaled numpy array.

    Parameters
    ----------
    customer      : validated CustomerFeatures object
    feature_names : list of feature column names in training order
    scaler        : fitted StandardScaler

    Returns
    -------
    np.ndarray of shape (1, n_features) — ready for model.predict()
    """
    row = customer_to_dict(customer)

    # Build a one-row DataFrame aligned to training columns
    df_row = pd.DataFrame([row])

    # Ensure column order and completeness match training feature_names exactly
    for col in feature_names:
        if col not in df_row.columns:
            df_row[col] = 0
    df_row = df_row[feature_names]

    # Scale
    X_scaled = scaler.transform(df_row.values.astype(float))
    return X_scaled  # shape: (1, n_features)


def preprocess_batch(
    customers: list[CustomerFeatures],
    feature_names: list[str],
    scaler: StandardScaler,
) -> np.ndarray:
    """
    Preprocess a batch of customers into a scaled numpy array.

    Returns
    -------
    np.ndarray of shape (n_customers, n_features)
    """
    rows = [customer_to_dict(c) for c in customers]
    df_batch = pd.DataFrame(rows)

    for col in feature_names:
        if col not in df_batch.columns:
            df_batch[col] = 0
    df_batch = df_batch[feature_names]

    X_scaled = scaler.transform(df_batch.values.astype(float))
    return X_scaled  # shape: (n_customers, n_features)
