"""
Hydro-Wise Proprietary Mathematical Inference Engine (AMHOE - Adaptive Multi-Variable Hydrological Optimization Engine).

A completely self-contained, dependency-free mathematical decision surface engine.
Requires zero external ML libraries (no scikit-learn, PyTorch, or TensorFlow).
Built from fundamental logical and algebraic nodes for patent transparency and edge-to-cloud portability.
"""

from __future__ import annotations

import json
import math
from typing import Any, Dict, Tuple


class ProprietaryInferenceEngine:
    """
    Mathematical decision surface classifier for smart irrigation.
    Evaluates: temperature_C, humidity_%, soil_moisture_% against learned weights and boundary thresholds.
    """

    def __init__(self, blueprint_path: str | None = None, blueprint_dict: Dict[str, Any] | None = None) -> None:
        if blueprint_dict is not None:
            self.blueprint = blueprint_dict
        elif blueprint_path is not None:
            with open(blueprint_path, "r", encoding="utf-8") as f:
                self.blueprint = json.load(f)
        else:
            raise ValueError("Must provide either blueprint_path or blueprint_dict")

        # Parse model parameters
        self.version: str = self.blueprint.get("version", "AMHOE-v1.0-proprietary")
        self.stats: Dict[str, Dict[str, float]] = self.blueprint["normalization"]
        self.weights: Dict[str, float] = self.blueprint["weights"]
        self.interactions: Dict[str, float] = self.blueprint.get("interactions", {})
        self.bias: float = float(self.blueprint["bias"])
        self.threshold: float = float(self.blueprint["threshold"])

    def normalize(self, val: float, feat: str) -> float:
        """Min-max standard scaler bound to [0.0, 1.0]."""
        f_min = self.stats[feat]["min"]
        f_max = self.stats[feat]["max"]
        if f_max <= f_min:
            return 0.0
        scaled = (val - f_min) / (f_max - f_min)
        return max(0.0, min(1.0, scaled))

    def compute_decision_score(
        self, soil_moisture: float, temperature_C: float, humidity: float
    ) -> Tuple[float, float, Dict[str, float]]:
        """
        Forward mathematical pass:
        1. Feature normalization
        2. Non-linear compound dry-flux interaction tensors
        3. Hyperplane aggregation + logistic saturation
        """
        s_norm = self.normalize(soil_moisture, "soil_moisture_%")
        t_norm = self.normalize(temperature_C, "temperature_C")
        h_norm = self.normalize(humidity, "humidity_%")

        # Linear term
        linear_val = (
            self.weights["soil_moisture_%"] * s_norm
            + self.weights["temperature_C"] * t_norm
            + self.weights["humidity_%"] * h_norm
            + self.bias
        )

        # Non-linear microclimate interaction terms
        # I1: Thermal Evaporative Factor = Temp * (1 - Humidity)
        # I2: Root Moisture Deficit = (1 - Soil) * Temp
        i1 = t_norm * (1.0 - h_norm)
        i2 = (1.0 - s_norm) * t_norm
        interaction_val = (
            self.interactions.get("thermal_evaporative_factor", 0.0) * i1
            + self.interactions.get("root_desiccation_factor", 0.0) * i2
        )

        z = linear_val + interaction_val

        # Sigmoid saturation function
        # Clamp z to avoid numerical overflow
        z_clamped = max(-20.0, min(20.0, z))
        prob = 1.0 / (1.0 + math.exp(-z_clamped))

        explanations = {
            "normalized_soil": round(s_norm, 4),
            "normalized_temp": round(t_norm, 4),
            "normalized_humidity": round(h_norm, 4),
            "evaporative_factor": round(i1, 4),
            "root_desiccation_factor": round(i2, 4),
            "raw_activation_z": round(z, 4),
        }

        return z, prob, explanations

    def predict(
        self, soil_moisture: float, temperature_C: float, humidity: float
    ) -> Dict[str, Any]:
        """
        Returns binary recommendation, confidence probability, and transparent explanation vectors.
        """
        z, prob, explanations = self.compute_decision_score(soil_moisture, temperature_C, humidity)
        is_irrigate = prob >= self.threshold

        return {
            "recommendation": "IRRIGATE" if is_irrigate else "DO_NOT_IRRIGATE",
            "confidence": round(prob if is_irrigate else (1.0 - prob), 4),
            "irrigation_probability": round(prob, 4),
            "threshold": self.threshold,
            "model_version": self.version,
            "architecture": "Edge-to-Cloud Distributed Non-Linear Hyperplane Surface (AMHOE)",
            "explainability": explanations,
        }
