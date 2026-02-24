import ee
import os
import json
import numpy as np
import pandas as pd
from assessment_service import AssessmentService

# Setup Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
EE_KEY_PATH = os.path.join(DATA_DIR, "ee-dharanv2006-02c1bec957ad.json")

# Initialize Service
service = AssessmentService(DATA_DIR, EE_KEY_PATH)

# Test Coordinate
lat, lon = 10.011165700030888, 76.30369305762325

print(f"--- Debugging Analysis for ({lat}, {lon}) ---")

print("\n1. Wind Analysis...")
wind = service.analyze_wind(lat, lon)
# print(json.dumps(wind, indent=2))

print("\n2. Solar Analysis...")
solar = service.analyze_solar(lat, lon)
# print(json.dumps(solar, indent=2))

print("\n3. Water Analysis...")
water = service.analyze_water(lat, lon)
print(json.dumps(water, indent=2))

print("\n--- Summary ---")
def check_nan(d, path=""):
    if isinstance(d, dict):
        for k, v in d.items():
            check_nan(v, f"{path}.{k}")
    elif isinstance(d, list):
        for i, v in enumerate(d):
            check_nan(v, f"{path}[{i}]")
    else:
        if isinstance(d, (float, np.float64)) and np.isnan(d):
            print(f"❌ Found NaN at: {path}")

check_nan({"wind": wind, "solar": solar, "water": water})
