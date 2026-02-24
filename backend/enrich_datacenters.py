
import json
import requests
import time
import os

def enrich():
    sites = [
        {"id": "benzy-kochi", "name": "Benzy Infotech Data Center", "company": "Benzy Infotech PVT LTD", "url": "https://www.bidc.in", "address": "Manimala Road, Edapally, Kochi, Ernakulam", "postal": "682024", "city": "Cochin", "market": "Cochin", "state": "Kerala", "country": "India", "power_mw": "Not Specified", "tier": "Tier 3", "whitespace": "Not Specified", "lat": 10.022550552742983, "lng": 76.3029183684533},
        {"id": "ixoradc-cochin", "name": "IxoraDC Cochin", "company": "Aabasoft Technologies India Pvt Ltd", "url": "https://www.ixoradc.com", "address": "Chakolas Heights, Seaport - Airport Rd, Near Infopark, 682037 Cochin, Kerala, India", "postal": "682037", "city": "Cochin", "market": "Cochin", "state": "Kerala", "country": "India", "power_mw": "Not Specified", "tier": "Not Specified", "whitespace": "Not Specified", "lat": 9.995045244259591, "lng": 76.35174799991186},
        {"id": "progression-gurgaon", "name": "Progression Infonet Data Center", "company": "Progression Infonet", "url": "https://www.progression.com", "address": "55, Independent Electronic Modules, Electronic City, Sector 18, Gurgaon, Haryana, India", "postal": "122015", "city": "Gurgaon", "market": "Gurgaon", "state": "Haryana", "country": "India", "power_mw": "Not Specified", "tier": "Not Specified", "whitespace": "Not Specified", "lat": 28.500755562788605, "lng": 77.07076989592622},
        {"id": "nxtra-agartala", "name": "Nxtra Agartala I", "company": "Nxtra by Airtel", "url": "https://www.nxtra.in", "address": "within Chanmari area of Agartala", "postal": "799006", "city": "Agartala", "market": "Agartala", "state": "Tripura", "country": "India", "power_mw": "5", "tier": "Not Specified", "whitespace": "7432 sq. ft.", "lat": 23.829203863851678, "lng": 91.27526165343235},
        {"id": "bsnl-ahmedabad", "name": "BSNL Ahmedabad IDC", "company": "BSNL IDC", "url": "https://bsnl.co.in/en", "address": "Bapunagar Telephone Office, 1 General Hospital Rd", "postal": "380024", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Tier 3", "whitespace": "Not Specified", "lat": 23.02638094141746, "lng": 72.62415011107858},
        {"id": "cloudetc-ahmedabad", "name": "CloudETC Data Center", "company": "CloudETC", "url": "https://cloudetc.in", "address": "Sarkhej-Gandhinagar Hwy", "postal": "380060", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Tier 3", "whitespace": "Not Specified", "lat": 23.07416368643137, "lng": 72.52057010729322},
        {"id": "devpeter-ahmedabad", "name": "DEVPETER DATACENTER", "company": "DEVPETER DATACENTER PVT. LTD.", "url": "https://www.devpeterdatacenter.com", "address": "427 Block-A, Money Plant High Street, nr Bsnl Office Jagatpur", "postal": "382470", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "0.12", "tier": "Not Specified", "whitespace": "2000 sq. ft.", "lat": 23.114599565186136, "lng": 72.5387039957374},
        {"id": "datafirst-ahmedabad", "name": "DataFirst Ahmedabad", "company": "Data First", "url": "https://www.datafirst.in", "address": "Cambay Grand, Gulab Tower Rd, 9th floor", "postal": "380054", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Tier 3", "whitespace": "Not Specified", "lat": 23.059329800731263, "lng": 72.52290164543842},
        {"id": "ecs-ahmedabad", "name": "ECS Biztech Data Center", "company": "ECS Corporation", "url": "https://www.ecsbiztech.com", "address": "11-12 Garden View", "postal": "380054", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Not Specified", "whitespace": "465 sq. m.", "lat": 23.02977115284802, "lng": 72.53054825340678},
        {"id": "go4hosting-ahmedabad", "name": "Go4Hosting Ahmedabad", "company": "Go4Hosting", "url": "https://go4hosting.in", "address": "F-402 Titanium City Center, 100 Feet Road, Anandnagar, Satellite", "postal": "380015", "city": "Ahmedabad", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Tier 3", "whitespace": "Not Specified", "lat": 23.028661756257854, "lng": 72.5607672129303},
        {"id": "ishan-gandhinagar", "name": "Ishan Technologies Gandhinagar", "company": "Ishan Infotech Limited", "url": "https://ishantechnologies.com", "address": "Creative Infocity Limited, Infotower 1, Office No. 115", "postal": "382330", "city": "Gandhinagar", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "Not Specified", "tier": "Not Specified", "whitespace": "Not Specified", "lat": 23.193793651674593, "lng": 72.63775033991973},
        {"id": "stt-gandhinagar", "name": "STT Ahmedabad DC 1", "company": "STT GDC India", "url": "https://www.sttelemediagdc.com", "address": "Building no. 48, Gyan Marg", "postal": "382355", "city": "Gandhinagar", "market": "Ahmedabad", "state": "Gujarat", "country": "India", "power_mw": "3", "tier": "Not Specified", "whitespace": "70000 sq. ft.", "lat": 23.16560530665043, "lng": 72.69070102642684}
    ]

    enriched_file = "enriched_datacenters.json"
    features = []
    enriched_ids = set()

    if os.path.exists(enriched_file):
        try:
            with open(enriched_file, "r") as f:
                existing_data = json.load(f)
                features = existing_data.get("features", [])
                enriched_ids = {f["properties"]["id"] for f in features}
        except:
            pass

    print(f"Starting enrichment for {len(sites)} sites...")
    print(f"Already enriched: {len(enriched_ids)}")

    for site in sites:
        if site["id"] in enriched_ids:
            print(f"Skipping {site['name']} (already enriched)")
            continue

        print(f"Processing {site['name']}...")
        try:
            res = requests.post("http://localhost:8000/analyze", json={"lat": site["lat"], "lon": site["lng"]}, timeout=45)
            if res.status_code == 200:
                analysis = res.json()
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [site["lng"], site["lat"]]
                    },
                    "properties": {
                        **site,
                        "analysis": analysis
                    }
                }
                features.append(feature)
                # Progressive save
                with open(enriched_file, "w") as f:
                    json.dump({"type": "FeatureCollection", "features": features}, f, indent=4)
                print(f"Successfully enriched {site['name']}")
            else:
                print(f"Failed to analyze {site['name']}: {res.status_code}")
        except Exception as e:
            print(f"Error analyzing {site['name']}: {e}")
        
        time.sleep(2)

    print(f"Enrichment session complete! Total enriched: {len(features)}")

if __name__ == "__main__":
    enrich()
