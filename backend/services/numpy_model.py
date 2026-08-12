"""
numpy_model.py
==============
Lightweight pure NumPy inference engine for the Bank Churn ANN model.
Allows inference without TensorFlow dependency, avoiding heavy memory consumption (OOM)
and Keras version deserialization issues on constrained hosting environments like Railway.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Union

import numpy as np

logger = logging.getLogger(__name__)


class NumPyANNModel:
    """
    Pure NumPy implementation of Sequential ANN for Bank Churn prediction.
    Supports Dense (ReLU / Sigmoid activation) and BatchNormalization layers.
    """

    def __init__(self, weights_source: Union[str, Path, dict]) -> None:
        if isinstance(weights_source, (str, Path)):
            with open(weights_source, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = weights_source

        self.layers: list[tuple[str, list[np.ndarray]]] = []

        def _layer_sort_key(k: str) -> int:
            parts = k.split("_")
            for part in parts[1:]:
                if part.isdigit():
                    return int(part)
            return 0

        for key in sorted(data.keys(), key=_layer_sort_key):
            layer_info = data[key]
            cls_name = layer_info.get("class", "Dense")
            raw_weights = layer_info.get("weights", [])
            numpy_weights = [np.array(w, dtype=np.float32) for w in raw_weights]
            self.layers.append((cls_name, numpy_weights))

        logger.info("[NumPyANNModel] Initialized with %d layers.", len(self.layers))

    def predict(self, X: np.ndarray, verbose: int = 0) -> np.ndarray:
        """
        Run forward pass on input matrix X (shape: [N, num_features]).
        Returns array of probabilities (shape: [N, 1]).
        """
        h = np.asarray(X, dtype=np.float32)
        if h.ndim == 1:
            h = np.expand_dims(h, axis=0)

        for cls_name, weights in self.layers:
            if cls_name == "Dense":
                W, b = weights[0], weights[1]
                z = np.dot(h, W) + b
                if W.shape[1] == 1:
                    h = 1.0 / (1.0 + np.exp(-np.clip(z, -50.0, 50.0)))
                else:
                    h = np.maximum(0.0, z)
            elif cls_name == "BatchNormalization":
                gamma, beta, mean, var = weights[0], weights[1], weights[2], weights[3]
                eps = 1e-3
                h = gamma * (h - mean) / np.sqrt(var + eps) + beta
            elif cls_name == "Dropout":
                pass

        if h.ndim == 1:
            h = np.expand_dims(h, axis=1)

        return h
