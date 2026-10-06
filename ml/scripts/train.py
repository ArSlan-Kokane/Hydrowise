"""
Offline Optimization & Mathematical Rule Trainer for the Hydro-Wise AMHOE Architecture.

Trains the mathematical decision surface parameters on raw telemetry baseline data
and exports a structural JSON blueprint (model_blueprint.json) for cloud/edge deployment.
"""

import json
import math
import os
import random
from typing import Dict, List, Tuple


def sigmoid(z: float) -> float:
    z_clamped = max(-25.0, min(25.0, z))
    return 1.0 / (1.0 + math.exp(-z_clamped))


def load_dataset(csv_path: str) -> Tuple[List[Dict[str, float]], List[int], Dict[str, Dict[str, float]]]:
    with open(csv_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    header = lines[0].split(",")
    header_idx = {col: i for i, col in enumerate(header)}

    rows = []
    labels = []

    soil_vals = []
    temp_vals = []
    hum_vals = []

    for line in lines[1:]:
        parts = line.split(",")
        s = float(parts[header_idx["soil_moisture_%"]])
        t = float(parts[header_idx["temperature_C"]])
        h = float(parts[header_idx["humidity_%"]])
        label_str = parts[header_idx["ml_suggestion"]].strip().lower()
        y = 1 if label_str == "irrigate" else 0

        soil_vals.append(s)
        temp_vals.append(t)
        hum_vals.append(h)
        rows.append({"soil_moisture_%": s, "temperature_C": t, "humidity_%": h})
        labels.append(y)

    norm_stats = {
        "soil_moisture_%": {"min": min(soil_vals), "max": max(soil_vals)},
        "temperature_C": {"min": min(temp_vals), "max": max(temp_vals)},
        "humidity_%": {"min": min(hum_vals), "max": max(hum_vals)},
    }

    return rows, labels, norm_stats


def extract_features(row: Dict[str, float], stats: Dict[str, Dict[str, float]]) -> List[float]:
    s_norm = (row["soil_moisture_%"] - stats["soil_moisture_%"]["min"]) / (
        stats["soil_moisture_%"]["max"] - stats["soil_moisture_%"]["min"]
    )
    t_norm = (row["temperature_C"] - stats["temperature_C"]["min"]) / (
        stats["temperature_C"]["max"] - stats["temperature_C"]["min"]
    )
    h_norm = (row["humidity_%"] - stats["humidity_%"]["min"]) / (
        stats["humidity_%"]["max"] - stats["humidity_%"]["min"]
    )

    s_norm = max(0.0, min(1.0, s_norm))
    t_norm = max(0.0, min(1.0, t_norm))
    h_norm = max(0.0, min(1.0, h_norm))

    # Interaction terms
    i1 = t_norm * (1.0 - h_norm)     # Thermal Evaporative Factor
    i2 = (1.0 - s_norm) * t_norm     # Root Desiccation Factor

    return [s_norm, t_norm, h_norm, i1, i2]


def train_model():
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "hydro_wise_dataset.csv")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    rows, labels, stats = load_dataset(dataset_path)
    n = len(rows)

    # 80/20 Stratified Split
    indices = list(range(n))
    random.seed(42)
    random.shuffle(indices)

    split = int(0.8 * n)
    train_idx = indices[:split]
    test_idx = indices[split:]

    X_train = [extract_features(rows[i], stats) for i in train_idx]
    y_train = [labels[i] for i in train_idx]

    X_test = [extract_features(rows[i], stats) for i in test_idx]
    y_test = [labels[i] for i in test_idx]

    # Initialize weights: [w_soil, w_temp, w_hum, v_i1, v_i2], bias
    weights = [-3.5, 2.0, -1.0, 1.5, 2.0]
    bias = -0.5

    lr = 0.08
    epochs = 600
    l2_reg = 0.001

    print(f"Training AMHOE Model on {len(X_train)} samples across {epochs} epochs...")

    for epoch in range(epochs):
        grad_w = [0.0] * len(weights)
        grad_b = 0.0
        total_loss = 0.0

        for x, y in zip(X_train, y_train):
            # Forward pass: z = sum(w*x) + b
            z = sum(w * xi for w, xi in zip(weights, x)) + bias
            p = sigmoid(z)

            # Log loss
            p_eps = max(1e-12, min(1.0 - 1e-12, p))
            total_loss += -(y * math.log(p_eps) + (1 - y) * math.log(1.0 - p_eps))

            # Gradient: error = p - y
            err = p - y
            for j in range(len(weights)):
                grad_w[j] += err * x[j]
            grad_b += err

        m = len(X_train)
        # Update weights with L2 regularization
        weights = [
            w - lr * ((gw / m) + l2_reg * w)
            for w, gw in zip(weights, grad_w)
        ]
        bias = bias - lr * (grad_b / m)

        if (epoch + 1) % 100 == 0:
            print(f"  Epoch {epoch+1:03d} | Loss: {total_loss / m:.4f}")

    # Find optimal threshold on training set
    best_thresh = 0.5
    best_f1 = 0.0

    for thresh_candidate in [t / 100.0 for t in range(25, 75, 2)]:
        tp = fp = fn = tn = 0
        for x, y in zip(X_train, y_train):
            z = sum(w * xi for w, xi in zip(weights, x)) + bias
            pred = 1 if sigmoid(z) >= thresh_candidate else 0
            if pred == 1 and y == 1:
                tp += 1
            elif pred == 1 and y == 0:
                fp += 1
            elif pred == 0 and y == 1:
                fn += 1
            else:
                tn += 1
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh_candidate

    print(f"\nOptimization complete. Optimal Decision Threshold: {best_thresh:.2f}")

    # Evaluate on held-out test set
    tp = fp = fn = tn = 0
    for x, y in zip(X_test, y_test):
        z = sum(w * xi for w, xi in zip(weights, x)) + bias
        pred = 1 if sigmoid(z) >= best_thresh else 0
        if pred == 1 and y == 1:
            tp += 1
        elif pred == 1 and y == 0:
            fp += 1
        elif pred == 0 and y == 1:
            fn += 1
        else:
            tn += 1

    accuracy = (tp + tn) / len(X_test)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    print("\n" + "=" * 50)
    print("HELD-OUT TEST EVALUATION METRICS:")
    print("=" * 50)
    print(f"Accuracy:  {accuracy:.4f} ({accuracy*100:.1f}%)")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1_score:.4f}")
    print(f"Confusion Matrix: TP={tp}, FP={fp}, FN={fn}, TN={tn}")
    print("=" * 50)

    # Export Structural JSON Blueprint
    blueprint = {
        "architecture": "Edge-to-Cloud Distributed Non-Linear Hyperplane Surface (AMHOE)",
        "version": "AMHOE-v1.0-proprietary",
        "patent_classification": "Distributed Autonomous Agricultural Irrigation Inference System",
        "description": "Mathematical non-linear decision boundary optimized offline for standalone zero-dependency execution.",
        "normalization": stats,
        "weights": {
            "soil_moisture_%": round(weights[0], 5),
            "temperature_C": round(weights[1], 5),
            "humidity_%": round(weights[2], 5),
        },
        "interactions": {
            "thermal_evaporative_factor": round(weights[3], 5),
            "root_desiccation_factor": round(weights[4], 5),
        },
        "bias": round(bias, 5),
        "threshold": round(best_thresh, 4),
        "evaluation_metrics": {
            "test_accuracy": round(accuracy, 4),
            "test_precision": round(precision, 4),
            "test_recall": round(recall, 4),
            "test_f1": round(f1_score, 4),
            "samples_evaluated": len(X_test),
        },
    }

    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    out_file = os.path.join(models_dir, "model_blueprint.json")

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(blueprint, f, indent=2)

    print(f"\nModel Blueprint successfully generated: {out_file}")

    # Generate Patent Technical Specification
    patent_doc = f"""# Patent Architecture Specification: Hydro-Wise AMHOE
## Autonomous Multivariable Hydrological Optimization Engine

### 1. Abstract
The present disclosure introduces an Edge-to-Cloud Distributed Rule Inference System providing transparent, deterministic, and dependency-free irrigation decision control without black-box neural networks. The system computes compound environmental stress through polynomial interaction tensors derived directly from physical soil capacitance, ambient temperature, and relative humidity.

### 2. Physical Sensor Inputs (Exclusively 3 Features)
1. x1 - Soil Moisture Resistance/Capacitance (%): In-situ rhizosphere hydration level.
2. x2 - Ambient Temperature (C): Atmospheric thermal excitation.
3. x3 - Relative Humidity (%): Ambient vapor saturation.

Rule-Based Boundary Constraint: Rainfall probability is strictly decoupled and handled at the atmospheric weather gate prior to triggering the mathematical engine.

### 3. Mathematical Decision Formulation
Each input parameter is normalized to a unitary boundary:
x_norm = (x - min) / (max - min)

Non-linear compound stress tensors capture microclimate desiccation:
- Thermal Evaporative Factor (I1) = temp_norm * (1 - humidity_norm)
- Root Desiccation Factor (I2) = (1 - soil_norm) * temp_norm

Hyperplane Activation Score:
Z = w1 * soil_norm + w2 * temp_norm + w3 * hum_norm + v1 * I1 + v2 * I2 + b

Sigmoidal Probability Function:
P(Irrigation) = 1 / (1 + exp(-Z))

Actuation Decision:
Decision = IRRIGATE if P >= {best_thresh:.2f} else DO NOT IRRIGATE

### 4. Learned Parameter Matrices
- w1 (Soil Moisture Weight): {weights[0]:.5f}
- w2 (Temperature Weight): {weights[1]:.5f}
- w3 (Humidity Weight): {weights[2]:.5f}
- v1 (Thermal Evaporation Interaction): {weights[3]:.5f}
- v2 (Root Desiccation Interaction): {weights[4]:.5f}
- b (System Bias): {bias:.5f}
- Optimal Boundary Threshold: {best_thresh:.2f}

### 5. Verified Performance
- Accuracy: {accuracy*100:.2f}%
- Precision: {precision:.4f}
- Recall: {recall:.4f}
- F1 Score: {f1_score:.4f}
"""

    with open(os.path.join(models_dir, "PATENT_ARCHITECTURE.md"), "w", encoding="utf-8") as f:
        f.write(patent_doc)
    print(f"Patent Architecture Document saved: {os.path.join(models_dir, 'PATENT_ARCHITECTURE.md')}")


if __name__ == "__main__":
    train_model()
