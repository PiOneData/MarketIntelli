"""
Parse dc_118.csv and generate SQL INSERT statements for data_center_companies
and data_center_facilities tables.

Usage:
    python3 csv_to_sql.py > /tmp/seed_data.sql
    PGPASSWORD=marketintelli123 psql -h localhost -p 5432 -U postgres -d marketintelli -f /tmp/seed_data.sql
"""

import csv
import os
import re
import sys
import uuid

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "dc_118.csv")

# Map known company names to parent companies
COMPANY_PARENTS = {
    "AdaniConneX": "Adani Group",
    "Sify Technologies Ltd": "Sify Technologies",
    "STT GDC India": "ST Telemedia",
    "NTT DATA, Inc.": "NTT Group",
    "Yotta Data Services": "Hiranandani Group",
    "Yotta": "Hiranandani Group",
    "Nxtra by Airtel": "Bharti Airtel",
    "CtrlS Datacenters Ltd": None,
    "CtrlS Datacenters Pvt Ltd": None,
    "Tata Communications": "Tata Group",
    "Equinix": "Equinix Inc",
    "Microsoft": "Microsoft Corporation",
    "Amazon AWS": "Amazon",
    "Reliance Data Center": "Reliance Industries Ltd",
    "Iron Mountain Data Centers": "Iron Mountain Inc",
    "CapitaLand Data Centre": "CapitaLand Investment",
    "Digital Realty": "Digital Realty Trust",
    "L&T Cloudfiniti": "Larsen & Toubro",
    "Anant Raj Cloud": "Anant Raj Ltd",
    "BSNL IDC": "BSNL",
    "RailTel Corporation of India Ltd.": "Indian Railways",
    "ESDS Software Solution Pvt. Ltd.": None,
    "Rackbank Datacenters Pvt. Ltd.": None,
    "Colt Technology Services": "Fidelity Investments",
    "Pi Datacenters": None,
}


def escape_sql(val):
    """Escape a string for SQL insertion."""
    if val is None:
        return "NULL"
    val = val.replace("'", "''")
    return f"'{val}'"


def parse_power_mw(val):
    """Parse power value from CSV (e.g. '1.2 MW', '16 MW', 'Not Listed')."""
    if not val or val.strip().lower() in ("not listed", "not publicly disclosed", ""):
        return "NULL"
    # Extract numeric part
    match = re.search(r'([\d.]+)', val.replace(",", ""))
    if match:
        return match.group(1)
    return "NULL"


def parse_whitespace(val):
    """Parse whitespace/size field to approximate sq ft."""
    if not val or val.strip().lower() in ("not listed", ""):
        return "NULL"
    val = val.strip()
    # Handle acres
    if "acre" in val.lower():
        match = re.search(r'([\d,.]+)', val.replace(",", ""))
        if match:
            acres = float(match.group(1))
            return str(round(acres * 43560, 2))  # Convert acres to sq ft
    # Handle sq. m / sq.m / sq.m.
    if "sq.m" in val.lower() or "sq. m" in val.lower():
        match = re.search(r'([\d,.]+)', val.replace(",", ""))
        if match:
            sqm = float(match.group(1))
            return str(round(sqm * 10.764, 2))  # Convert sq m to sq ft
    # Handle sq. ft / sq.f / sq ft
    if "sq" in val.lower():
        match = re.search(r'([\d,.]+)', val.replace(",", ""))
        if match:
            return match.group(1).replace(",", "")
    # Handle racks
    if "rack" in val.lower():
        match = re.search(r'([\d,.]+)', val.replace(",", ""))
        if match:
            return match.group(1).replace(",", "")
    return "NULL"


def parse_tier(val):
    """Parse tier design field."""
    if not val or val.strip().lower() in ("not listed", ""):
        return "NULL"
    val = val.strip()
    # Normalize: "Tier III" -> "Tier III", "Tier 3" -> "Tier III", "Tier III+" -> "Tier III+"
    val = val.replace("Tier 4", "Tier IV").replace("Tier 3", "Tier III").replace("Tier 2", "Tier II")
    return escape_sql(val)


def load_csv():
    """Load and parse the CSV file, handling multiline fields."""
    rows = []
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean up whitespace
            cleaned = {}
            for k, v in row.items():
                if k and v:
                    v = " ".join(v.split())  # collapse multiline into single line
                    cleaned[k.strip()] = v.strip() if v.strip() else None
                elif k:
                    cleaned[k.strip()] = None
            rows.append(cleaned)
    return rows


def main():
    rows = load_csv()

    # Collect unique companies
    companies = {}
    for row in rows:
        name = row.get("Company Name")
        if name and name not in companies:
            company_id = str(uuid.uuid4())
            website = row.get("URL to Website")
            parent = COMPANY_PARENTS.get(name)
            companies[name] = {
                "id": company_id,
                "name": name,
                "parent_company": parent,
                "website": website,
            }

    # Output SQL
    print("-- Generated SQL for MarketIntelli data center seed")
    print("-- Auto-generated from dc_118.csv")
    print()
    print("BEGIN;")
    print()

    # Clear existing data
    print("-- Clear existing data center data")
    print("DELETE FROM data_center_facilities;")
    print("DELETE FROM data_center_companies;")
    print()

    # Insert companies
    print("-- Insert companies")
    for comp in companies.values():
        print(
            f"INSERT INTO data_center_companies (id, name, parent_company, website) "
            f"VALUES ({escape_sql(comp['id'])}, {escape_sql(comp['name'])}, "
            f"{escape_sql(comp['parent_company'])}, {escape_sql(comp['website'])});"
        )

    print()
    print("-- Insert facilities")

    for row in rows:
        company_name = row.get("Company Name")
        if not company_name or company_name not in companies:
            continue

        company_id = companies[company_name]["id"]
        dc_name = row.get("Data Center Name") or "Unknown"
        city = row.get("City")
        market = row.get("Market")
        state = row.get("State")
        country = row.get("Country")
        address = row.get("Address")
        postal = row.get("Postal")
        power_mw = parse_power_mw(row.get("Power (MW)"))
        tier = parse_tier(row.get("Tier Design"))
        whitespace = parse_whitespace(row.get("Whitespace"))

        # Fallback: use Market for missing city, use country for missing state
        if not city:
            city = market or "Unknown"
        if not state:
            state = "Unknown"
        # Clean state: strip leading/trailing whitespace and commas
        state = state.strip().strip(",").strip()

        # Build location detail from address + postal
        location_parts = []
        if address:
            location_parts.append(address)
        if postal:
            location_parts.append(f"Postal: {postal}")
        location_detail = ", ".join(location_parts) if location_parts else None

        # Default status to operational (the CSV represents existing/listed data centers)
        status = "operational"

        facility_id = str(uuid.uuid4())

        print(
            f"INSERT INTO data_center_facilities "
            f"(id, company_id, name, city, state, location_detail, "
            f"power_capacity_mw, size_sqft, status, tier_level, date_added) "
            f"VALUES ({escape_sql(facility_id)}, {escape_sql(company_id)}, "
            f"{escape_sql(dc_name)}, {escape_sql(city)}, {escape_sql(state)}, "
            f"{escape_sql(location_detail)}, "
            f"{power_mw}, {whitespace}, {escape_sql(status)}, {tier}, NOW());"
        )

    print()
    print("COMMIT;")
    print()

    # Summary
    print(f"-- Seeded {len(companies)} companies and {len(rows)} facilities")


if __name__ == "__main__":
    main()
