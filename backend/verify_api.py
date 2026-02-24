
import requests
import json

def test_analyze():
    url = "http://localhost:8000/analyze"
    payload = {
        "lat": 8.26,
        "lon": 77.55
    }
    print(f"Testing /analyze at {payload}...")
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print("✅ API Success!")
            
            # Print structure summary
            print("\n--- Summary of Results ---")
            print(f"Wind Grade: {data['wind']['resource']['grade']}")
            print(f"Solar Score: {data['solar']['score']}")
            print(f"Water Risk: {data['water']['composite_risk_score']}")
            
            # Check for keys
            for key in ['wind', 'solar', 'water', 'location', 'timestamp']:
                if key in data:
                    print(f"Found key: {key}")
                else:
                    print(f"❌ Missing key: {key}")
        else:
            print(f"❌ API Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Request Error: {e}")

if __name__ == "__main__":
    test_analyze()
