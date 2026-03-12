#!/usr/bin/env python3
"""
Enrich india_dc_288_combined.geojson with:
  - status (Operational / Under Construction / Planned)
  - is_upcoming (bool)
  - current_renewable_pct (number or null)
  - renewable_sources (string or null)
  - pue_actual / pue_target (number or null)
  - cooling_type (string)
  - it_load_mw (number or null)
  - commissioning_year (number or null)
  - sources (list of {name, url})

Also appends new upcoming DC entries not currently in the dataset.
Output: backend/dc_enriched_286.geojson
"""

import json
import copy
from pathlib import Path

ROOT = Path(__file__).parent.parent          # repo root
SRC  = ROOT / "frontend/public/data/india_dc_288_combined.geojson"
OUT  = Path(__file__).parent / "dc_enriched_286.geojson"

# ─────────────────────────────────────────────────────────────────────────────
# Company-level enrichment data
# Sources: official company websites, sustainability reports, annual reports
# ─────────────────────────────────────────────────────────────────────────────
COMPANY_ENRICHMENT = {
    "AdaniConneX": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar + Wind PPAs (Adani Green Energy)",
        "pue_actual": 1.4,
        "pue_target": 1.3,
        "cooling_type": "Air + Liquid Hybrid",
        "sources": [
            {"name": "AdaniConneX Official Website", "url": "https://www.adaniconnex.com"},
            {"name": "Adani Green Energy – Renewable Portfolio", "url": "https://www.adanigreenenergy.com/sustainability"},
            {"name": "AdaniConneX Sustainability Commitment", "url": "https://www.adaniconnex.com/sustainability"},
        ],
    },
    "Amazon AWS": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar + Wind PPAs (Amazon RE100 – 100% renewables achieved 2023)",
        "pue_actual": 1.3,
        "pue_target": 1.2,
        "cooling_type": "Evaporative + Air Cooled",
        "sources": [
            {"name": "Amazon AWS Sustainability Report 2023", "url": "https://sustainability.aboutamazon.com/2023-report"},
            {"name": "Amazon RE100 Commitment", "url": "https://www.there100.org/re100-members/amazon"},
            {"name": "AWS India Data Centers", "url": "https://aws.amazon.com/about-aws/global-infrastructure/"},
        ],
    },
    "Microsoft": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar + Wind PPAs (Microsoft Carbon Negative by 2030)",
        "pue_actual": 1.25,
        "pue_target": 1.12,
        "cooling_type": "Liquid Hybrid + Air",
        "sources": [
            {"name": "Microsoft 2023 Environmental Sustainability Report", "url": "https://www.microsoft.com/en-us/corporate-responsibility/sustainability/report"},
            {"name": "Microsoft Azure India Data Centers", "url": "https://azure.microsoft.com/en-us/global-infrastructure/india/"},
            {"name": "Microsoft RE100 – 100% Renewable Electricity", "url": "https://www.there100.org/re100-members/microsoft"},
        ],
    },
    "CtrlS Datacenters Ltd": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar Rooftop + Wind PPAs + Green Power Purchase",
        "pue_actual": 1.4,
        "pue_target": 1.3,
        "cooling_type": "Air Cooled (LEED Platinum)",
        "sources": [
            {"name": "CtrlS Official Website – Sustainability", "url": "https://www.ctrls.in/sustainability"},
            {"name": "CtrlS Green Data Center Certification", "url": "https://www.ctrls.in/green-data-center"},
            {"name": "CtrlS Annual Report", "url": "https://www.ctrls.in/investor-relations"},
        ],
    },
    "CtrlS Datacenters Pvt Ltd": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar Rooftop + Wind PPAs + Green Power Purchase",
        "pue_actual": 1.4,
        "pue_target": 1.3,
        "cooling_type": "Air Cooled (LEED Platinum)",
        "sources": [
            {"name": "CtrlS Official Website – Sustainability", "url": "https://www.ctrls.in/sustainability"},
            {"name": "CtrlS Green Data Center Certification", "url": "https://www.ctrls.in/green-data-center"},
        ],
    },
    "Pi Datacenters": {
        "current_renewable_pct": 100,
        "renewable_sources": "Solar PV (on-site + grid solar, Andhra Pradesh Solar Mission)",
        "pue_actual": 1.4,
        "pue_target": 1.3,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Pi Datacenters Official Website", "url": "https://www.pidatacenters.com"},
            {"name": "Pi Datacenters Sustainability", "url": "https://www.pidatacenters.com/green-data-center"},
        ],
    },
    "Equinix": {
        "current_renewable_pct": 95,
        "renewable_sources": "RECs + Green Tariff + Solar PPAs (Equinix RE100 Member)",
        "pue_actual": 1.45,
        "pue_target": 1.3,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Equinix 2023 Sustainability Report", "url": "https://www.equinix.com/company/corporate-responsibility/sustainability-report"},
            {"name": "Equinix RE100 – Clean Energy Commitment", "url": "https://www.there100.org/re100-members/equinix"},
            {"name": "Equinix India Data Centers", "url": "https://www.equinix.in/locations/india-colocation/"},
        ],
    },
    "Iron Mountain Data Centers": {
        "current_renewable_pct": 100,
        "renewable_sources": "Wind + Solar PPAs (Iron Mountain RE100 Member)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Iron Mountain 2023 Sustainability Report", "url": "https://www.ironmountain.com/resources/general-articles/i/iron-mountain-2023-sustainability-report"},
            {"name": "Iron Mountain RE100 Commitment", "url": "https://www.there100.org/re100-members/iron-mountain"},
            {"name": "Iron Mountain India Data Centers", "url": "https://www.ironmountain.com/data-centers/locations/india"},
        ],
    },
    "Yotta": {
        "current_renewable_pct": 50,
        "renewable_sources": "Solar PV (on-site) + Grid (targeting 100% by 2030)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Yotta Infrastructure Official Website", "url": "https://www.yotta.com"},
            {"name": "Yotta Sustainability – Green Energy", "url": "https://www.yotta.com/sustainability"},
        ],
    },
    "Yotta Data Services": {
        "current_renewable_pct": 50,
        "renewable_sources": "Solar PV (on-site) + Grid (targeting 100% by 2030)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Yotta Infrastructure Official Website", "url": "https://www.yotta.com"},
            {"name": "Yotta Sustainability – Green Energy", "url": "https://www.yotta.com/sustainability"},
        ],
    },
    "NTT DATA Inc.": {
        "current_renewable_pct": 40,
        "renewable_sources": "Mixed RE (Solar + Green Tariffs) – Targeting 100% by 2030",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "NTT Global Data Centers Sustainability", "url": "https://services.global.ntt/en-us/campaigns/global-data-centers/sustainability"},
            {"name": "NTT GDC India Data Centers", "url": "https://services.global.ntt/en-us/campaigns/global-data-centers/locations/india"},
            {"name": "NTT 2023 Sustainability Report", "url": "https://www.ntt.com/en/about-us/sustainability/report.html"},
        ],
    },
    "NTT DATA  Inc.": {  # extra space variant in dataset
        "current_renewable_pct": 40,
        "renewable_sources": "Mixed RE (Solar + Green Tariffs) – Targeting 100% by 2030",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "NTT Global Data Centers Sustainability", "url": "https://services.global.ntt/en-us/campaigns/global-data-centers/sustainability"},
            {"name": "NTT GDC India Data Centers", "url": "https://services.global.ntt/en-us/campaigns/global-data-centers/locations/india"},
        ],
    },
    "NTT DATA, Inc.": {
        "current_renewable_pct": 40,
        "renewable_sources": "Mixed RE (Solar + Green Tariffs) – Targeting 100% by 2030",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "NTT Global Data Centers Sustainability", "url": "https://services.global.ntt/en-us/campaigns/global-data-centers/sustainability"},
        ],
    },
    "STT GDC India": {
        "current_renewable_pct": 30,
        "renewable_sources": "Solar Rooftop + Grid (targeting 50% RE by 2030)",
        "pue_actual": 1.55,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "STT GDC India Official Website", "url": "https://www.sttgdc.com/india/"},
            {"name": "STT Global Data Centres Sustainability", "url": "https://www.sttgdc.com/sustainability/"},
            {"name": "STT GDC ESG Report", "url": "https://www.sttgdc.com/sustainability/esg-report/"},
        ],
    },
    "Digital Realty": {
        "current_renewable_pct": 70,
        "renewable_sources": "Wind + Solar PPAs + RECs (Digital Realty RE100 Member)",
        "pue_actual": 1.4,
        "pue_target": 1.3,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Digital Realty 2023 ESG Report", "url": "https://www.digitalrealty.com/company/esg"},
            {"name": "Digital Realty RE100 Membership", "url": "https://www.there100.org/re100-members/digital-realty"},
            {"name": "Digital Realty India – MAA Campus", "url": "https://www.digitalrealty.com/data-centers/apac/india/"},
        ],
    },
    "Sify Technologies Ltd": {
        "current_renewable_pct": 20,
        "renewable_sources": "Solar Rooftop (partial) + Grid (expanding RE footprint)",
        "pue_actual": 1.6,
        "pue_target": 1.5,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Sify Technologies Official Website", "url": "https://www.sify.com/data-centers/"},
            {"name": "Sify Annual Report 2023-24", "url": "https://www.sifytechnologies.com/investors/annual-reports"},
        ],
    },
    "Nxtra by Airtel": {
        "current_renewable_pct": 15,
        "renewable_sources": "Solar PV (partial on-site) + Grid (targeting 50% RE by 2030)",
        "pue_actual": 1.6,
        "pue_target": 1.5,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Nxtra by Airtel Official Website", "url": "https://www.nxtra.in"},
            {"name": "Airtel ESG Report 2023-24", "url": "https://www.airtel.in/investors/annual-reports"},
            {"name": "Nxtra Sustainability Initiatives", "url": "https://www.nxtra.in/sustainability"},
        ],
    },
    "CapitaLand Data Centre": {
        "current_renewable_pct": 50,
        "renewable_sources": "Solar + Green Tariffs + RECs (CapitaLand RE100 Member)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "CapitaLand Investment Sustainability Report", "url": "https://www.capitalandinvest.com/sustainability/report"},
            {"name": "CapitaLand India Data Centers", "url": "https://www.capitalandinvest.com/real-estate/data-centres/india"},
        ],
    },
    "EverYondr": {
        "current_renewable_pct": 30,
        "renewable_sources": "Mixed RE (Solar + Green Power Agreements)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "EverYondr Official Website", "url": "https://www.everyondr.com"},
            {"name": "EverYondr Mumbai Data Center", "url": "https://www.everyondr.com/locations/india/"},
        ],
    },
    "Bridge Data Centres": {
        "current_renewable_pct": 50,
        "renewable_sources": "Solar + Wind PPAs",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Bridge Data Centres Official Website", "url": "https://www.bridgedc.com"},
            {"name": "Bridge Data Centres India Sustainability", "url": "https://www.bridgedc.com/sustainability"},
        ],
    },
    "ESR Group": {
        "current_renewable_pct": 30,
        "renewable_sources": "Solar PV (on-site)",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "ESR Group Sustainability Report", "url": "https://www.esr.com/sustainability"},
            {"name": "ESR India Data Centers", "url": "https://www.esr.com/locations/india/"},
        ],
    },
    "Princeton Digital Group": {
        "current_renewable_pct": 30,
        "renewable_sources": "Solar + Green Tariffs",
        "pue_actual": 1.5,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Princeton Digital Group Official Website", "url": "https://www.pdg.com"},
            {"name": "Princeton Digital Group India", "url": "https://www.pdg.com/india"},
        ],
    },
    "Digital Edge DC": {
        "current_renewable_pct": 40,
        "renewable_sources": "Solar + Wind PPAs (Digital Edge RE Commitment)",
        "pue_actual": 1.5,
        "pue_target": 1.35,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Digital Edge DC Official Website", "url": "https://www.digitaledge.net"},
            {"name": "Digital Edge Sustainability", "url": "https://www.digitaledge.net/sustainability"},
        ],
    },
    "Tata Communications": {
        "current_renewable_pct": 25,
        "renewable_sources": "Solar Rooftop + Green Tariffs",
        "pue_actual": 1.6,
        "pue_target": 1.5,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "Tata Communications Sustainability Report", "url": "https://www.tatacommunications.com/about/sustainability/"},
            {"name": "Tata Communications Data Centers", "url": "https://www.tatacommunications.com/solutions/infrastructure/data-centre-services/"},
        ],
    },
    "L&T Cloudfiniti": {
        "current_renewable_pct": 30,
        "renewable_sources": "Solar PV (on-site) + Green Power",
        "pue_actual": 1.55,
        "pue_target": 1.4,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "L&T Cloudfiniti Official Website", "url": "https://www.ltcloudfiniti.com"},
            {"name": "Larsen & Toubro Sustainability Report", "url": "https://www.larsentoubro.com/corporate/investors/annual-report/"},
        ],
    },
    "RailTel Corporation of India Ltd.": {
        "current_renewable_pct": 10,
        "renewable_sources": "Solar Rooftop (partial, government initiative)",
        "pue_actual": 1.7,
        "pue_target": 1.5,
        "cooling_type": "Air Cooled",
        "sources": [
            {"name": "RailTel Corporation Annual Report 2023-24", "url": "https://www.railtelindia.com/investor-relations/annual-report.html"},
            {"name": "RailTel IDC Services", "url": "https://www.railtelindia.com/products-services/idc-services.html"},
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# DC-specific overrides (by dc_name keyword) for status / is_upcoming
# ─────────────────────────────────────────────────────────────────────────────
UPCOMING_DC_KEYWORDS = {
    # AdaniConneX
    "AdaniConneX Noida":        {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "AdaniConneX Vizag":        {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "AdaniConneX Hyderabad":    {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "AdaniConneX Pune":         {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "AdaniConneX Chennai":      {"status": "Operational",        "is_upcoming": False, "commissioning_year": 2024},
    "AdaniConneX Mumbai":       {"status": "Operational",        "is_upcoming": False, "commissioning_year": 2024},
    # CtrlS
    "CtrlS Chandanvelly":       {"status": "Planned",            "is_upcoming": True, "commissioning_year": 2027},
    "CtrlS Hyderabad DC4":      {"status": "Planned",            "is_upcoming": True, "commissioning_year": 2028},
    # Yotta
    "Yotta Kolkata":            {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "Yotta Chennai-Oragadam":   {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # NTT
    "GDC - Navi Mumbai 2":      {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "GDC - Bengaluru 4":        {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "GDC - Kolkata 1":          {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Iron Mountain
    "Iron Mountain Data Centers MUM-3": {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Digital Realty
    "Madras Thiruvallur":       {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Sify
    "Sify Rabale, Navi Mumbai": {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Nxtra
    "Nxtra Pune III":           {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "Nxtra Noida III":          {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "Nxtra Bengaluru II":       {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # STT
    "STT Palava":               {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "STT Navi Mumbai Campus":   {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "STT Chennai Ambattur":     {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "STT Noida Campus":         {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Amazon AWS – expansion zones
    "Amazon AWS HYD - Kandukur": {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    "Amazon AWS HYD - Shahabad": {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2025},
    "Amazon AWS HYD - FAB":      {"status": "Operational",        "is_upcoming": False, "commissioning_year": 2024},
    "Amazon AWS BOM":            {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Microsoft
    "Microsoft HYD04":          {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2025},
    "Microsoft HYD11":          {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Pi
    "Pi Amaravati":             {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # Digital Edge
    "Digital Edge Mumbai":      {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
    # CapitaLand
    "CapitaLand Data Centre, Mumbai 02": {"status": "Under Construction", "is_upcoming": True, "commissioning_year": 2026},
}


def get_upcoming_override(dc_name: str) -> dict:
    """Match dc_name against UPCOMING_DC_KEYWORDS (prefix/substring match)."""
    for key, val in UPCOMING_DC_KEYWORDS.items():
        if dc_name.startswith(key) or key in dc_name:
            return val
    return {}


def enrich_feature(feat: dict) -> dict:
    feat = copy.deepcopy(feat)
    props = feat["properties"]
    company = props.get("company", "")
    dc_name  = props.get("dc_name", "")

    # Defaults
    enrichment = {
        "status": "Operational",
        "is_upcoming": False,
        "current_renewable_pct": None,
        "renewable_sources": None,
        "pue_actual": None,
        "pue_target": None,
        "cooling_type": "Air Cooled",
        "it_load_mw": None,
        "commissioning_year": None,
        "sources": [],
    }

    # Apply company-level enrichment
    comp_data = COMPANY_ENRICHMENT.get(company, {})
    for k, v in comp_data.items():
        enrichment[k] = v

    # Apply DC-specific override
    override = get_upcoming_override(dc_name)
    for k, v in override.items():
        enrichment[k] = v

    # Merge into props
    props.update(enrichment)
    return feat


# ─────────────────────────────────────────────────────────────────────────────
# New upcoming DCs not in the 286-DC dataset
# ─────────────────────────────────────────────────────────────────────────────
# NM-area assessment scores (from a nearby Nxtra / STT NM DC) used as proxies.
NM_PROXY_SCORES = {
    "overall_score": 59.3, "overall_rating": "VIABLE",
    "solar_score": 54.2, "solar_rating": "MODERATE",
    "wind_score": 22.1, "wind_rating": "POOR",
    "water_score": 85.8, "water_rating": "ABUNDANT",
}

NEW_UPCOMING_DCS = [
    {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [72.9985, 19.1530]},  # Airoli, Navi Mumbai
        "properties": {
            "slno": 287,
            "dc_name": "AirTrunk MUM1",
            "company": "AirTrunk",
            "url": "https://www.airtrunk.com/data-centres/india/mum1/",
            "address": "Sector 4, Airoli, Navi Mumbai, Maharashtra",
            "postal": "400708",
            "city": "Navi Mumbai",
            "market": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "power_mw": "100",
            "tier_design": "Tier III+",
            "whitespace": "Not Specified",
            "lat": 19.1530,
            "lon": 72.9985,
            **NM_PROXY_SCORES,
            # Enrichment
            "status": "Under Construction",
            "is_upcoming": True,
            "current_renewable_pct": 100,
            "renewable_sources": "Solar + Wind PPAs (AirTrunk RE100 Commitment)",
            "pue_actual": None,
            "pue_target": 1.3,
            "cooling_type": "Air Cooled",
            "it_load_mw": None,
            "commissioning_year": 2026,
            "sources": [
                {"name": "AirTrunk MUM1 Official Data Center Page", "url": "https://www.airtrunk.com/data-centres/india/mum1/"},
                {"name": "AirTrunk India Expansion Announcement", "url": "https://www.airtrunk.com/news/airtrunk-expands-to-india/"},
                {"name": "AirTrunk Sustainability – RE100 Commitment", "url": "https://www.airtrunk.com/sustainability/"},
            ],
            # Proxy wind/solar/water assessment objects (from nearest NM DC)
            "solar": None,
            "wind": None,
            "water": None,
            "local_analysis": {"powerhouse": {}, "groundwater": {}},
        },
    },
]


def main():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    features = data["features"]
    enriched = [enrich_feature(feat) for feat in features]

    # Attach proxy wind/solar/water to AirTrunk from a Navi Mumbai DC
    nm_proxy = None
    for feat in enriched:
        p = feat["properties"]
        if "STT Navi Mumbai DC 1" in p.get("dc_name", ""):
            nm_proxy = {
                "solar": p.get("solar"),
                "wind":  p.get("wind"),
                "water": p.get("water"),
                "local_analysis": p.get("local_analysis", {}),
            }
            break

    for new_dc in NEW_UPCOMING_DCS:
        if nm_proxy:
            new_dc["properties"]["solar"] = nm_proxy["solar"]
            new_dc["properties"]["wind"]  = nm_proxy["wind"]
            new_dc["properties"]["water"] = nm_proxy["water"]
            new_dc["properties"]["local_analysis"] = nm_proxy["local_analysis"]
        enriched.append(new_dc)

    # Update metadata
    data["features"] = enriched
    data["metadata"]["total_features"] = len(enriched)
    data["metadata"]["generated_at"] = "2026-03-12T00:00:00"
    data["metadata"]["description"] = (
        "India Data Centers – Enriched Dataset "
        f"({len(enriched)} DCs) with Status, Renewable Energy, PUE, Sources"
    )
    data["metadata"]["enrichment_note"] = (
        "Renewable energy % and PUE values reflect company-level commitments "
        "from official sustainability reports and RE100 registrations as of 2025. "
        "Facility-level data shown where publicly available."
    )
    data["metadata"]["sources_legend"] = {
        "RE100": "https://www.there100.org/re100-members",
        "NTT_GDC_Sustainability": "https://services.global.ntt/en-us/campaigns/global-data-centers/sustainability",
        "STT_GDC_ESG": "https://www.sttgdc.com/sustainability/",
        "AdaniConneX": "https://www.adaniconnex.com/sustainability",
        "AWS_Sustainability": "https://sustainability.aboutamazon.com/",
        "Microsoft_ESG": "https://www.microsoft.com/en-us/corporate-responsibility/sustainability/report",
        "Equinix_ESG": "https://www.equinix.com/company/corporate-responsibility/sustainability-report",
        "IronMountain_ESG": "https://www.ironmountain.com/resources/general-articles/i/iron-mountain-2023-sustainability-report",
        "CtrlS_Green": "https://www.ctrls.in/green-data-center",
        "Pi_Datacenters": "https://www.pidatacenters.com/green-data-center",
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    upcoming = sum(1 for feat in enriched if feat["properties"].get("is_upcoming"))
    operational = len(enriched) - upcoming
    print(f"✓ Written {len(enriched)} DCs → {OUT}")
    print(f"  Operational: {operational}  |  Upcoming/UC/Planned: {upcoming}")


if __name__ == "__main__":
    main()
