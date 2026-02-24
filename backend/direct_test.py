import ee
import os
import json
import numpy as np
from assessment_service import AssessmentService

# Setup Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
EE_KEY_PATH = os.path.join(DATA_DIR, "ee-dharanv2006-02c1bec957ad.json")

# Initialize Service
service = AssessmentService(DATA_DIR, EE_KEY_PATH)

# User's coordinates
lat, lon = 17.053549183241188, 78.53942119557

print(f"--- FETCHING DATA FOR ({lat}, {lon}) ---\n")

output = {}

try:
    print("Extracting Solar...")
    output["solar"] = service.analyze_solar(lat, lon)
    
    print("Extracting Wind...")
    output["wind"] = service.analyze_wind(lat, lon)
    
    print("Extracting Water...")
    output["water"] = service.analyze_water(lat, lon)

    print("\n--- FINAL JSON OUTPUT ---\n")
    print(json.dumps(output, indent=2))
    
except Exception as e:
    print(f"ERROR: {e}")
