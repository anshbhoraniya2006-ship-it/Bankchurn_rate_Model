"""
export_artifacts.py
====================
Reproduces the notebook's preprocessing pipeline locally and saves all
inference-ready artifacts to model_artifacts/.

Artifacts exported:
  - model_artifacts/scaler.pkl          -- fitted StandardScaler
  - model_artifacts/feature_names.pkl   -- ordered list of feature names after OHE
  - model_artifacts/threshold.json      -- F1-optimal classification threshold
  - model_artifacts/model_metadata.json -- training notes & feature schema

Usage:
  python export_artifacts.py
"""

import os
import json
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score, roc_auc_score, recall_score
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")

# ---- Config ------------------------------------------------------------------
SEED = 42
DATA_PATH = os.path.join(os.path.dirname(__file__), "Churn_Modelling.csv")
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "model_artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "best_ann_v3.keras")
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_ann_v3.keras")

os.makedirs(ARTIFACTS_DIR, exist_ok=True)

np.random.seed(SEED)


# ---- Helper: find optimal F1 threshold ---------------------------------------
def find_best_threshold(y_true: np.ndarray, y_prob: np.ndarray):
    thresholds = np.arange(0.05, 0.95, 0.01)
    scores = [
        f1_score(y_true, (y_prob >= t).astype(int), pos_label=1, zero_division=0)
        for t in thresholds
    ]
    best_idx = int(np.argmax(scores))
    return float(round(thresholds[best_idx], 2)), float(round(scores[best_idx], 4))


# ---- Step 1: Load Data -------------------------------------------------------
print("[1/7] Loading data ...")
df = pd.read_csv(DATA_PATH)
print(f"   Shape: {df.shape}  |  Churn rate: {df['Exited'].mean():.2%}")

# ---- Step 2: Preprocessing (mirrors notebook exactly) ------------------------
print("[2/7] Preprocessing ...")
df_clean = df.drop(["RowNumber", "CustomerId", "Surname"], axis=1)
X = df_clean.drop("Exited", axis=1)
y = df_clean["Exited"].values

# One-hot encode categoricals (Geography, Gender) -- drop_first=True matches notebook
cat_cols = X.select_dtypes(include="object").columns
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
feature_names = X.columns.tolist()

print(f"   Features ({len(feature_names)}): {feature_names}")

# ---- Step 3: Train/Test Split ------------------------------------------------
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X.values, y, test_size=0.2, random_state=SEED, stratify=y
)

# ---- Step 4: Fit Scaler (on raw training data, before SMOTE) ----------------
print("[3/7] Fitting StandardScaler ...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_raw)
X_test_scaled = scaler.transform(X_test_raw)

# ---- Step 5: SMOTE (training only) ------------------------------------------
print("[4/7] Applying SMOTE to training set ...")
smote = SMOTE(random_state=SEED)
X_train_sm, y_train_sm = smote.fit_resample(X_train_scaled, y_train)
print(f"   After SMOTE: {X_train_sm.shape[0]} samples | Churn: {y_train_sm.mean():.2%}")

# ---- Step 6: Load model & determine optimal threshold -----------------------
print("[5/7] Loading trained model ...")
try:
    import tensorflow as tf
    tf.random.set_seed(SEED)
    model = tf.keras.models.load_model(MODEL_PATH)
    model.summary()

    print("[6/7] Computing optimal F1 threshold on test set ...")
    y_prob = model.predict(X_test_scaled, verbose=0).flatten()
    optimal_t, best_f1 = find_best_threshold(y_test, y_prob)
    y_pred = (y_prob >= optimal_t).astype(int)

    auc_score = roc_auc_score(y_test, y_prob)
    recall = recall_score(y_test, y_pred)

    print(f"   Optimal threshold : {optimal_t}")
    print(f"   F1 at threshold   : {best_f1:.4f}")
    print(f"   AUC-ROC           : {auc_score:.4f}")
    print(f"   Recall (churn)    : {recall:.4f}")

except Exception as e:
    print(f"WARNING: Could not load model ({e}). Using default threshold 0.38.")
    optimal_t = 0.38
    auc_score, best_f1, recall = None, None, None

# ---- Step 7: Save Artifacts -------------------------------------------------
print("\n[7/7] Saving artifacts ...")

# 7a. Scaler
scaler_path = os.path.join(ARTIFACTS_DIR, "scaler.pkl")
with open(scaler_path, "wb") as f:
    pickle.dump(scaler, f)
print(f"   [OK] {scaler_path}")

# 7b. Feature names
feat_path = os.path.join(ARTIFACTS_DIR, "feature_names.pkl")
with open(feat_path, "wb") as f:
    pickle.dump(feature_names, f)
print(f"   [OK] {feat_path}")

# 7c. Threshold
threshold_path = os.path.join(ARTIFACTS_DIR, "threshold.json")
threshold_data = {
    "optimal_threshold": optimal_t,
    "metric": "F1-optimised on held-out test set",
    "f1_at_threshold": best_f1,
    "auc_roc": auc_score,
    "recall_at_threshold": recall,
}
with open(threshold_path, "w") as f:
    json.dump(threshold_data, f, indent=2)
print(f"   [OK] {threshold_path}")

# 7d. Model metadata
metadata = {
    "model_name": "Bank Churn ANN v3",
    "model_file": "best_ann_v3.keras",
    "framework": "TensorFlow/Keras",
    "architecture": "Sequential ANN (Keras Tuner Hyperband-optimised)",
    "oversampling": "SMOTE (training only)",
    "cross_validation": "5-fold StratifiedKFold",
    "threshold_strategy": "F1-optimal on held-out test set",
    "feature_names": feature_names,
    "categorical_encoding": "get_dummies with drop_first=True",
    "numerical_scaling": "StandardScaler (fit on train, transform on test)",
    "target_column": "Exited",
    "training_notes": (
        "ANN v3: Keras Tuner (Hyperband), SMOTE, StratifiedKFold CV, "
        "SHAP explainability, EarlyStopping + ReduceLROnPlateau"
    ),
    "raw_input_fields": [
        "CreditScore", "Geography", "Gender", "Age", "Tenure",
        "Balance", "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary"
    ],
}
metadata_path = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
with open(metadata_path, "w") as f:
    json.dump(metadata, f, indent=2)
print(f"   [OK] {metadata_path}")

# ---- Summary -----------------------------------------------------------------
print("\n" + "=" * 55)
print("  ALL ARTIFACTS EXPORTED SUCCESSFULLY")
print("=" * 55)
print(f"  Directory  : {ARTIFACTS_DIR}")
print(f"  Threshold  : {optimal_t}")
print(f"  Features   : {len(feature_names)}")
print("=" * 55)
print("\nNext step: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000")
