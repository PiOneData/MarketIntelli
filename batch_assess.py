"""
batch_assess.py  —  Run assessments and append to datacenters.geojson (no duplicates).
"""
import json, time, re
import requests

GEOJSON_PATH = r"c:\Users\dhara\Music\windlocal\frontend\public\datacenters.geojson"
API_URL      = "http://localhost:8000/analyze"
DEDUPE_DIST  = 0.001   # ~110 m — skip if an existing entry is this close

NEW_DCS = [
    # ── PUNE ──
    dict(name="STT Pune DC 2",                company="STT GDC India",                        url="https://www.sttelemediagdc.com",       address="Alandi Road, Dighi, 411015 Pune, India",                                              postal="411015", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="15",            tier="Not Specified", whitespace="Not Specified",  lat=18.60372564081925,  lng=73.86384064745992),
    dict(name="STT Pune DC 3",                company="STT GDC India",                        url="https://www.sttelemediagdc.in",        address="Alandi Road, Dighi, 411015 Pune, India",                                              postal="411015", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="15",            tier="Not Specified", whitespace="Not Specified",  lat=18.603491771388008, lng=73.86395866465548),
    dict(name="STT Pune DC 4",                company="STT GDC India",                        url="https://www.sttelemediagdc.com",       address="within Dighi, STT Pune DC campus, 411015 Pune, India",                               postal="411015", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="18",            tier="Not Specified", whitespace="Not Specified",  lat=18.602820666018715, lng=73.86333639216978),
    dict(name="STT Pune DC 5",                company="STT GDC India",                        url="https://www.sttelemediagdc.com",       address="within Dighi, STT Pune DC campus, 411015 Pune, India",                               postal="411015", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="14.3",          tier="Not Specified", whitespace="Not Specified",  lat=18.603776481957436, lng=73.86450583528948),
    dict(name="Silvernox Datacenter Pune",    company="Silvernox Datacenter",                 url="https://silvernox.com",               address="Hinjawadi Phase 1 Rd, GAT No. 236, Plot No 4, 411057 Pune, India",                   postal="411057", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="4",             tier="Tier 3",        whitespace="8200 sq. ft.",   lat=18.591873854531332, lng=73.72894885327985),
    dict(name="Tata Communications Pune",     company="Tata Communications",                  url="https://www.tatacommunications.com",   address="Alandi Rd, 411015 Pune, Maharashtra, India",                                         postal="411015", city="Pune",          market="Pune",           state="Maharashtra",    country="India", power_mw="Not Specified", tier="Not Specified", whitespace="Not Specified",  lat=18.607155124535254, lng=73.86761915811387),
    # ── OTHER CITIES ──
    dict(name="RackBank Nava Raipur",         company="Rackbank Datacenters Pvt. Ltd.",        url="https://www.rackbank.com",             address="CBD Naya Raipur, Sector 22, 492018 Atal Nagar-Nava Raipur, India",                  postal="492018", city="Raipur",        market="Raipur",         state="Chhattisgarh",   country="India", power_mw="160",           tier="Not Specified", whitespace="Not Specified",  lat=21.166984690484533, lng=81.75969093985822),
    dict(name="Anant Raj Rai",                company="Anant Raj Cloud",                       url="https://anantrajcloud.com/",           address="Plot No. TP-1, HSIIDC Ethnic City, Sector 38, 131029 Rai, India",                   postal="131029", city="Sonipat",       market="Rohtak",         state="Haryana",        country="India", power_mw="200",           tier="Tier 4",        whitespace="Not Specified",  lat=28.931358693407873, lng=77.09528998059905),
    dict(name="AdaniConneX Vizag",            company="AdaniConneX",                           url="https://www.adaniconnex.com",          address="4-76 Rajiv Nagar Road, 530046 Visakhapatnam, India",                                postal="530046", city="Visakhapatnam", market="Visakhapatnam",  state="Andhra Pradesh", country="India", power_mw="100",           tier="Not Specified", whitespace="Not Specified",  lat=17.805097217712163, lng=83.35404975326001),
    # ── CHENNAI ──
    dict(name="Reliance IDC Chennai",         company="Reliance Data Center",                  url="https://www.relianceidc.com/",         address="6 Haddows Rd, 600006 Chennai, Tamil Nadu, India",                                   postal="600006", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Not Specified", whitespace="Not Specified",  lat=13.05872431212888,  lng=80.25359598199434),
    dict(name="STT Chennai Ambattur Campus",  company="STT GDC India",                         url="https://www.sttelemediagdc.com/",      address="226, Surapet Main Rd, 600053 Chennai, India",                                       postal="600053", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Not Specified", whitespace="Not Specified",  lat=13.132152414642357, lng=80.16746788014402),
    dict(name="STT Chennai DC 1",             company="STT GDC India",                         url="https://www.sttelemediagdc.com",       address="Videsh Sanchar Bhavan, No.4, Swami Sivananda Salai, 600002 Chennai, India",         postal="600002", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="5",             tier="Not Specified", whitespace="80000 sq. ft.",  lat=13.068606306526274, lng=80.2792330298778),
    dict(name="STT Chennai DC 2",             company="STT GDC India",                         url="https://www.sttelemediagdc.com",       address="226, Surapet Main Rd, Kallikuppam, 600053 Chennai, India",                         postal="600053", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="45",            tier="Not Specified", whitespace="400000 sq. ft.", lat=13.132256897240543, lng=80.16753225315979),
    dict(name="STT Chennai DC 7",             company="STT GDC India",                         url="https://www.sttelemediagdc.com/",      address="within Siruseri, 603103 Chennai, India",                                            postal="603103", city="Siruseri",      market="Chennai",        state="Tamil Nadu",     country="India", power_mw="9.5",           tier="Not Specified", whitespace="Not Specified",  lat=12.84357234333587,  lng=80.21568607805717),
    dict(name="Servernet Services DC",        company="Servernet Services P Ltd",               url="https://servernetservices.com/",       address="73, 1st Main Rd, Second Floor, 600041 Chennai, India",                              postal="600041", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Not Specified", whitespace="Not Specified",  lat=12.973632837024315, lng=80.24956232432088),
    dict(name="Sify Siruseri Chennai 02",     company="Sify Technologies Ltd",                  url="https://www.sifytechnologies.com/",    address="H11/A, Sipcot IT Park, 603103 Siruseri, India",                                    postal="603103", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="130",           tier="Tier 3",        whitespace="Not Specified",  lat=12.830626084558173, lng=80.22654093966217),
    dict(name="Sify Tidel Park Chennai",      company="Sify Technologies Ltd",                  url="https://www.sifytechnologies.com/",    address="No:4, Rajiv Gandhi Salai, Taramani, 600113 Chennai, India",                        postal="600113", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="1.6",           tier="Not Specified", whitespace="Not Specified",  lat=12.989819310238673, lng=80.2483835071256),
    dict(name="TD Chennai TD-1",              company="Techno Digital Infra Pvt. Ltd.",          url="https://technodigital.in/",            address="SIPCOT IT Park, Plot No 17, 603103 Siruseri, India",                                postal="603103", city="Siruseri",      market="Chennai",        state="Tamil Nadu",     country="India", power_mw="36",            tier="Not Specified", whitespace="23000 sq. m.",   lat=12.82344284148649,  lng=80.21315233780507),
    dict(name="Tata Communications Ambattur", company="Tata Communications",                    url="https://www.tatacommunications.com/",  address="No.226, Red Hills Road Kallikuppam, Ambattur, 600053 Chennai, Tamil Nadu, India", postal="600053", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Tier 3",        whitespace="Not Specified",  lat=13.131936549273085, lng=80.1658188396676),
    dict(name="Tata Communications Chennai",  company="Tata Communications",                    url="https://www.tatacommunications.com/",  address="4 Swami Sivananda Salai, 600002 Chennai, Tamil Nadu, India",                       postal="600002", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Tier 3",        whitespace="Not Specified",  lat=13.06865386519739,  lng=80.27916920289356),
    dict(name="Equinix CN1",                  company="Equinix",                                url="https://www.equinix.com/",             address="SIPCOT IT Park, Plot H12, 603103 Siruseri, India",                                 postal="603103", city="Siruseri",      market="Chennai",        state="Tamil Nadu",     country="India", power_mw="24",            tier="Not Specified", whitespace="12000 sq. m.",   lat=12.820148124083023, lng=80.22219705130232),
    dict(name="GDC Chennai 1",                company="NTT DATA, Inc.",                         url="https://services.global.ntt/",         address="67, Mathiravedu, Velappanchavadi, 600077 Chennai, India",                           postal="600077", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="2",             tier="Not Specified", whitespace="1500 sq. m.",    lat=13.064125044943951, lng=80.13423943745961),
    dict(name="GDC Chennai 2",                company="NTT DATA, Inc.",                         url="https://services.global.ntt/",         address="Plot no.:08, Chennai Tiruvallur High Rd, Ambattur, 600058 Chennai, India",         postal="600058", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="34.8",          tier="Not Specified", whitespace="Not Specified",  lat=13.099460571585983, lng=80.16685863490343),
    dict(name="Hindustan Global Cloud DC",    company="Hindustan Industrial Research Pvt Ltd",  url="http://www.hindustancorporate.com/",   address="Century Plaza, No:560-562, Anna Salai, 600018 Chennai, Tamil Nadu, India",        postal="600018", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Tier 3",        whitespace="Not Specified",  lat=13.045245910676917, lng=80.24777233966599),
    dict(name="Hostzop Cloud Services",       company="Hostzop Cloud Services Pvt. Ltd.",       url="https://www.hostzop.com",              address="SIPCOT, Siruseri, H 15, 603103 Chennai, India",                                    postal="603103", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="17",            tier="Tier 3",        whitespace="3500 sq. ft.",   lat=13.068498193045894, lng=80.25838446850241),
    dict(name="Iron Mountain Chennai CHN-1",  company="Iron Mountain Data Centers",              url="https://www.ironmountain.com/",        address="Plot No 83, MTH Road, Ambattur Industrial Estate, 600053 Ambattur, India",        postal="600053", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="23.2",          tier="Not Specified", whitespace="383540 sq. m.",  lat=13.100216381937992, lng=80.16896264151873),
    dict(name="Ishan Technologies Chennai",   company="Ishan Infotech Limited",                 url="https://ishantechnologies.com/",       address="Fagun Towers, 5th Floor, 600008 Chennai, India",                                   postal="600008", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="Not Specified", tier="Tier 3",        whitespace="Not Specified",  lat=13.063267831340603, lng=80.25950122247082),
    dict(name="LNT CHN 1",                   company="L&T Cloudfiniti",                        url="https://larsentoubrovyoma.com/",        address="WR25+6WF, 602108 Kanchipuram, Tamil Nadu, India",                                  postal="602108", city="Kanchipuram",   market="Chennai",        state="Tamil Nadu",     country="India", power_mw="30",            tier="Not Specified", whitespace="36046 sq. m.",   lat=12.900761189886666, lng=79.80983981082747),
    dict(name="Lumina Chennai",               company="Lumina CloudInfra Private Limited",       url="https://www.luminadc.com/",            address="within Ambattur, 600053 Chennai, India",                                           postal="600053", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="216",           tier="Not Specified", whitespace="Not Specified",  lat=12.985792531899206, lng=80.24610391082895),
    dict(name="Digital Realty MAA10",         company="Digital Realty",                         url="https://www.digitalrealty.com",        address="MTH Road, Ambattur Industrial Estate, 600058 Chennai, India",                      postal="600058", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="150",           tier="Not Specified", whitespace="6189 sq. m.",    lat=13.100713380062615, lng=80.16443912247146),
    dict(name="Nxtra Chennai I",              company="Nxtra by Airtel",                        url="https://www.nxtra.in/",                address="SIPCOT IT Park, 3rd cross street, F8, 7th Floor, 603103 Siruseri, India",          postal="603103", city="Siruseri",      market="Chennai",        state="Tamil Nadu",     country="India", power_mw="3.5",           tier="Not Specified", whitespace="Not Specified",  lat=12.83153468859668,  lng=80.22090744276414),
    dict(name="Nxtra Chennai II",             company="Nxtra by Airtel",                        url="https://www.nxtra.in/",                address="SIPCOT IT Park, A32 & A33, 603103 Siruseri, India",                                postal="603103", city="Siruseri",      market="Chennai",        state="Tamil Nadu",     country="India", power_mw="24",            tier="Not Specified", whitespace="25000 sq. m.",   lat=12.823290957802387, lng=80.214555967947),
    dict(name="Nxtra Chennai III",            company="Nxtra by Airtel",                        url="https://www.nxtra.in/",                address="101 Santhome High Road, 600028 Chennai, India",                                    postal="600028", city="Chennai",       market="Chennai",        state="Tamil Nadu",     country="India", power_mw="1.5",           tier="Not Specified", whitespace="Not Specified",  lat=12.82149161632932,  lng=80.21309684625639),
]

# ── HELPERS ────────────────────────────────────────────────────────────────────

def make_id(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def is_duplicate(lat, lng, existing_features):
    for f in existing_features:
        elng, elat = f["geometry"]["coordinates"]
        if abs(lat - elat) < DEDUPE_DIST and abs(lng - elng) < DEDUPE_DIST:
            return True
    return False

def run_assessment(lat, lng):
    try:
        resp = requests.post(API_URL, json={"lat": lat, "lon": lng}, timeout=120)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"    [ERR] API error: {e}")
        return None

# ── MAIN ───────────────────────────────────────────────────────────────────────

def main():
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    existing = geojson["features"]
    print(f"Loaded GeoJSON - {len(existing)} existing features.\n")

    added = skipped = 0

    for dc in NEW_DCS:
        lat, lng = dc["lat"], dc["lng"]
        name = dc["name"]
        print(f">> {name}  ({lat:.4f}, {lng:.4f})")

        if is_duplicate(lat, lng, existing):
            print("   [SKIP] Duplicate coords already in GeoJSON.\n")
            skipped += 1
            continue

        print("   [RUN]  Calling API...")
        analysis = run_assessment(lat, lng)

        if analysis is None:
            print("   [FAIL] API returned no data.\n")
            skipped += 1
            continue

        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "id":         make_id(name),
                "name":       name,
                "company":    dc["company"],
                "url":        dc["url"],
                "address":    dc["address"],
                "postal":     dc["postal"],
                "city":       dc["city"],
                "market":     dc["market"],
                "state":      dc["state"],
                "country":    dc["country"],
                "power_mw":   dc["power_mw"],
                "tier":       dc["tier"],
                "whitespace": dc["whitespace"],
                "lat":        lat,
                "lng":        lng,
                "analysis":   analysis,
            }
        }

        existing.append(feature)
        added += 1
        print("   [OK]   Added!\n")
        time.sleep(1)

    with open(GEOJSON_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=4, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"Done.  Added: {added}   Skipped: {skipped}")
    print(f"GeoJSON now has {len(existing)} features total.")
    print(f"Saved to: {GEOJSON_PATH}")

if __name__ == "__main__":
    main()
