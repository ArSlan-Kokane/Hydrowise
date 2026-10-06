"""
Synthetic dataset generator for Hydro-Wise irrigation model.
Strictly generates 2,000 India-climate-oriented rows adhering to plan.md:
Features: temperature_C, humidity_%, soil_moisture_% ONLY.
Rainfall is strictly EXCLUDED (rule-based weather gate constraint).
"""

import os
import random
import numpy as np
import pandas as pd

def generate_dataset(num_samples: int = 2000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    random.seed(seed)

    records = []
    for i in range(1, num_samples + 1):
        reading_id = f"READ{i:04d}"

        # Indian agro-climatic conditions
        soil_moisture = float(np.clip(np.random.normal(55, 14), 10.0, 95.0))
        temperature_C = float(np.clip(np.random.normal(29, 5), 15.0, 42.0))
        humidity = float(np.clip(np.random.normal(63, 12), 25.0, 95.0))

        # Water-stress heuristic score
        # Higher score => higher need for irrigation
        # Low soil moisture is the primary driver, amplified by high temp and low humidity
        soil_factor = max(0.0, (65.0 - soil_moisture) / 55.0)
        temp_factor = max(0.0, (temperature_C - 24.0) / 18.0)
        hum_factor = max(0.0, (75.0 - humidity) / 50.0)

        raw_score = (0.60 * soil_factor) + (0.25 * temp_factor) + (0.15 * hum_factor)
        # Add slight realistic noise
        score = float(np.clip(raw_score + np.random.normal(0, 0.03), 0.0, 1.0))

        # Target split: ~40% Irrigate / ~60% Do Not Irrigate (threshold ~0.26)
        ml_suggestion = "Irrigate" if score >= 0.26 else "Do Not Irrigate"

        records.append({
            "reading_id": reading_id,
            "soil_moisture_%": round(soil_moisture, 2),
            "temperature_C": round(temperature_C, 2),
            "humidity_%": round(humidity, 2),
            "irrigation_need_score": round(score, 4),
            "ml_suggestion": ml_suggestion,
            "label_source": "Synthetic label derived from temperature, soil moisture and humidity"
        })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    df = generate_dataset(2000)
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hydro_wise_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} rows to {out_path}")
    print("Class distribution:")
    print(df["ml_suggestion"].value_counts(normalize=True))
