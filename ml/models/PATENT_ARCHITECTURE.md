# Patent Architecture Specification: Hydro-Wise AMHOE
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
Decision = IRRIGATE if P >= 0.41 else DO NOT IRRIGATE

### 4. Learned Parameter Matrices
- w1 (Soil Moisture Weight): -4.40904
- w2 (Temperature Weight): 2.20276
- w3 (Humidity Weight): -0.80249
- v1 (Thermal Evaporation Interaction): 1.61914
- v2 (Root Desiccation Interaction): 2.71914
- b (System Bias): 0.04626
- Optimal Boundary Threshold: 0.41

### 5. Verified Performance
- Accuracy: 86.25%
- Precision: 0.8287
- Recall: 0.8621
- F1 Score: 0.8451
