"""Seed the power_market tables with comprehensive Indian renewable energy data.

Sources:
- MNRE State-wise Installed Capacity Jan-2026
  https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/02/202602091660392380.pdf
- CEA Monthly Generation Reports
- National Power Portal (https://npp.gov.in)
- CERC/SERC Tariff Orders
- SECI Auction Results
- RBI/IREDA Investment Guidelines
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.domains.power_market.models.power_market import (
    RenewableCapacity,
    PowerGeneration,
    TransmissionLine,
    PowerConsumption,
    RETariff,
    InvestmentGuideline,
    DataRepository,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Renewable Capacity – state-wise installed capacity (MW) by source
# Source: MNRE State-wise Installed Capacity of Renewable Power as on 31.01.2026
# https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/02/202602091660392380.pdf
#
# Columns in source: Small Hydro Power | Wind Power | Bio-Power Total |
#   Solar Power Total (Ground Mounted + RTS + Hybrid + Offgrid) | Large Hydro
# Energy source keys: solar, wind, small_hydro, biomass, large_hydro
# Tuple: (state, source, installed_mw, available_mw, potential_mw,
#         cuf_pct, developer, ppa_rate, year, month, source_text)
# ---------------------------------------------------------------------------
_SRC = "MNRE State-wise Installed Capacity Jan-2026"

RENEWABLE_CAPACITY_DATA = [
    # ── Andhra Pradesh ──────────────────────────────────────────────────────
    ("Andhra Pradesh", "solar",       6935.38, None, 38440.0, 20.0, "Greenko, SB Energy, Adani Green", 2.44, 2026, 1, _SRC),
    ("Andhra Pradesh", "wind",        4415.78, None, 44229.0, 26.0, "Mytrah Energy, Ostro Energy",     2.88, 2026, 1, _SRC),
    ("Andhra Pradesh", "small_hydro",  164.51, None,    None, None, None,                              None, 2026, 1, _SRC),
    ("Andhra Pradesh", "biomass",      594.02, None,    None, None, None,                              None, 2026, 1, _SRC),
    ("Andhra Pradesh", "large_hydro", 3290.00, None,    None, None, None,                              None, 2026, 1, _SRC),

    # ── Arunachal Pradesh ───────────────────────────────────────────────────
    ("Arunachal Pradesh", "small_hydro",  140.61, None, None, None, None, None, 2026, 1, _SRC),
    ("Arunachal Pradesh", "biomass",       15.44, None, None, None, None, None, 2026, 1, _SRC),
    ("Arunachal Pradesh", "large_hydro", 1615.00, None, None, None, None, None, 2026, 1, _SRC),

    # ── Assam ───────────────────────────────────────────────────────────────
    ("Assam", "small_hydro",   34.11, None, None, None, "APDCL", None, 2026, 1, _SRC),
    ("Assam", "biomass",        2.00, None, None, None, None,    None, 2026, 1, _SRC),
    ("Assam", "solar",        474.21, None, 13760.0, 15.0, "AEDA", 3.00, 2026, 1, _SRC),
    ("Assam", "large_hydro",  346.00, None, None, None, None,    None, 2026, 1, _SRC),

    # ── Bihar ───────────────────────────────────────────────────────────────
    # Bio total includes large Waste-to-Energy component (112.50 MW WtE)
    ("Bihar", "small_hydro",  70.70, None, None, None, "BSPHCL",             None, 2026, 1, _SRC),
    ("Bihar", "biomass",     140.22, None, None, None, None,                 None, 2026, 1, _SRC),
    ("Bihar", "solar",       435.34, None, 11200.0, 16.5, "BREDA, NTPC",    2.85, 2026, 1, _SRC),

    # ── Chhattisgarh ────────────────────────────────────────────────────────
    # Bio total includes large Waste-to-Energy component (272.09 MW WtE)
    ("Chhattisgarh", "small_hydro",  100.90, None, None, None, "CSPHCL",     None, 2026, 1, _SRC),
    ("Chhattisgarh", "biomass",      285.42, None, None, None, "CREDA",      None, 2026, 1, _SRC),
    ("Chhattisgarh", "solar",       1755.40, None, 18270.0, 18.0, "CREDA",   2.70, 2026, 1, _SRC),
    ("Chhattisgarh", "large_hydro",  120.00, None, None, None, None,         None, 2026, 1, _SRC),

    # ── Goa ─────────────────────────────────────────────────────────────────
    ("Goa", "small_hydro",  0.05, None, None, None, "GEDA",    None, 2026, 1, _SRC),
    ("Goa", "biomass",      1.94, None, None, None, None,      None, 2026, 1, _SRC),
    ("Goa", "solar",       73.64, None, 880.0, 16.0, "GEDA",  3.15, 2026, 1, _SRC),

    # ── Gujarat ─────────────────────────────────────────────────────────────
    ("Gujarat", "small_hydro",   113.30, None,   None, None, None,                               None, 2026, 1, _SRC),
    ("Gujarat", "wind",        14855.19, None, 84431.0, 26.5, "Suzlon, Siemens Gamesa, Adani",   2.78, 2026, 1, _SRC),
    ("Gujarat", "biomass",       129.85, None,   None, None, None,                               None, 2026, 1, _SRC),
    ("Gujarat", "solar",       26909.30, None, 35770.0, 20.8, "Adani Green, Tata Power Solar",   2.42, 2026, 1, _SRC),
    ("Gujarat", "large_hydro",  1990.00, None,   None, None, None,                               None, 2026, 1, _SRC),

    # ── Haryana ─────────────────────────────────────────────────────────────
    # Bio total includes Biomass (151.40) + BioNonBagasse (125.46) + WtE (37.61 + 11.20)
    ("Haryana", "small_hydro",  73.50, None, None, None, "HAREDA",             None, 2026, 1, _SRC),
    ("Haryana", "biomass",     325.67, None, None, None, "HAREDA",             None, 2026, 1, _SRC),
    ("Haryana", "solar",      2540.08, None, 4560.0, 17.5, "HAREDA, SECI",    2.68, 2026, 1, _SRC),

    # ── Himachal Pradesh ────────────────────────────────────────────────────
    ("Himachal Pradesh", "small_hydro",  1000.71, None, 2398.0, 50.0, "HIMURJA, HPPCL", None, 2026, 1, _SRC),
    ("Himachal Pradesh", "biomass",        10.20, None,  None, None, None,               None, 2026, 1, _SRC),
    ("Himachal Pradesh", "solar",         346.28, None,  None, 16.0, "HIMURJA",         2.90, 2026, 1, _SRC),
    ("Himachal Pradesh", "large_hydro", 11421.02, None,  None, None, "HPPCL",           None, 2026, 1, _SRC),

    # ── Jammu & Kashmir ─────────────────────────────────────────────────────
    ("Jammu & Kashmir", "small_hydro",  189.93, None, None, None, "JAKEDA",  None, 2026, 1, _SRC),
    ("Jammu & Kashmir", "solar",         79.48, None, None, None, "SECI",    2.50, 2026, 1, _SRC),
    ("Jammu & Kashmir", "large_hydro", 3360.00, None, None, None, "JKSPDC",  None, 2026, 1, _SRC),

    # ── Jharkhand ───────────────────────────────────────────────────────────
    ("Jharkhand", "small_hydro",   4.05, None, None, None, "JREDA",          None, 2026, 1, _SRC),
    ("Jharkhand", "biomass",       20.14, None, None, None, None,             None, 2026, 1, _SRC),
    ("Jharkhand", "solar",        235.77, None, 18180.0, 17.0, "JREDA",      2.75, 2026, 1, _SRC),
    ("Jharkhand", "large_hydro",  210.00, None, None, None, "JUVNL",         None, 2026, 1, _SRC),

    # ── Karnataka ───────────────────────────────────────────────────────────
    ("Karnataka", "small_hydro",  1284.73, None,  None, None, "KREDL, KPCL",          None, 2026, 1, _SRC),
    ("Karnataka", "wind",         8423.64, None, 55857.0, 25.0, "Suzlon, Vestas, ReNew", 2.90, 2026, 1, _SRC),
    ("Karnataka", "biomass",      1917.05, None,  None, None, "KREDL",                None, 2026, 1, _SRC),
    ("Karnataka", "solar",       10824.00, None, 24700.0, 19.5, "KREDL, Vikram Solar", 2.48, 2026, 1, _SRC),
    ("Karnataka", "large_hydro",  3689.20, None,  None, None, "KPCL",                 None, 2026, 1, _SRC),

    # ── Kerala ──────────────────────────────────────────────────────────────
    ("Kerala", "small_hydro",   276.52, None, 704.0, 45.0, "KSEB",    None, 2026, 1, _SRC),
    ("Kerala", "wind",           71.52, None,  None, None, "KSEB",    None, 2026, 1, _SRC),
    ("Kerala", "biomass",         2.50, None,  None, None, None,      None, 2026, 1, _SRC),
    ("Kerala", "solar",        2080.26, None, 6110.0, 16.0, "KSEB, ANERT", 3.10, 2026, 1, _SRC),
    ("Kerala", "large_hydro",  2008.15, None,  None, None, "KSEB",    None, 2026, 1, _SRC),

    # ── Ladakh ──────────────────────────────────────────────────────────────
    ("Ladakh", "small_hydro",  45.79, None,     None, None, "LAHDC",       None, 2026, 1, _SRC),
    ("Ladakh", "biomass",      12.02, None,     None, None, None,          None, 2026, 1, _SRC),
    ("Ladakh", "solar",        89.00, None, 34000.0, 22.0, "SECI, LAHDC", 2.20, 2026, 1, _SRC),

    # ── Madhya Pradesh ──────────────────────────────────────────────────────
    ("Madhya Pradesh", "small_hydro",   123.71, None,   None, None, "MPPGCL",                      None, 2026, 1, _SRC),
    ("Madhya Pradesh", "wind",         3591.15, None,   None, 28.0, "Suzlon, Inox Wind",            2.82, 2026, 1, _SRC),
    ("Madhya Pradesh", "biomass",       155.46, None,   None, None, None,                           None, 2026, 1, _SRC),
    ("Madhya Pradesh", "solar",        5855.64, None, 61660.0, 19.5, "REWA Ultra Mega, MPUVNL",    2.45, 2026, 1, _SRC),
    ("Madhya Pradesh", "large_hydro",  2235.00, None,   None, None, "MPPGCL",                      None, 2026, 1, _SRC),

    # ── Maharashtra ─────────────────────────────────────────────────────────
    ("Maharashtra", "small_hydro",    384.28, None,    None, None, "MAHAGENCO",                        None, 2026, 1, _SRC),
    ("Maharashtra", "wind",          5847.01, None, 45394.0, 24.5, "Suzlon, Inox Wind, ReNew Power",   2.92, 2026, 1, _SRC),
    ("Maharashtra", "biomass",       2998.30, None,    None, None, None,                               None, 2026, 1, _SRC),
    ("Maharashtra", "solar",        19105.13, None, 64320.0, 18.0, "Tata Power, Avaada Energy, MSEDCL", 2.58, 2026, 1, _SRC),
    ("Maharashtra", "large_hydro",   3047.00, None,    None, None, "MAHAGENCO",                        None, 2026, 1, _SRC),

    # ── Manipur ─────────────────────────────────────────────────────────────
    ("Manipur", "small_hydro",   5.45, None, None, None, None,  None, 2026, 1, _SRC),
    ("Manipur", "solar",        17.52, None, None, None, None,  None, 2026, 1, _SRC),
    ("Manipur", "large_hydro", 105.00, None, None, None, None,  None, 2026, 1, _SRC),

    # ── Meghalaya ───────────────────────────────────────────────────────────
    ("Meghalaya", "small_hydro",   55.03, None, None, None, "MePGCL",  None, 2026, 1, _SRC),
    ("Meghalaya", "biomass",       13.80, None, None, None, None,      None, 2026, 1, _SRC),
    ("Meghalaya", "solar",          4.28, None, None, None, None,      None, 2026, 1, _SRC),
    ("Meghalaya", "large_hydro",  322.00, None, None, None, "MePGCL",  None, 2026, 1, _SRC),

    # ── Mizoram ─────────────────────────────────────────────────────────────
    ("Mizoram", "small_hydro",   45.47, None, None, None, "MPCL",  None, 2026, 1, _SRC),
    ("Mizoram", "solar",         33.69, None, None, None, None,    None, 2026, 1, _SRC),
    ("Mizoram", "large_hydro",   60.00, None, None, None, "MPCL",  None, 2026, 1, _SRC),

    # ── Nagaland ────────────────────────────────────────────────────────────
    ("Nagaland", "small_hydro",   32.67, None, None, None, None,  None, 2026, 1, _SRC),
    ("Nagaland", "solar",          3.34, None, None, None, None,  None, 2026, 1, _SRC),
    ("Nagaland", "large_hydro",   75.00, None, None, None, None,  None, 2026, 1, _SRC),

    # ── Odisha ──────────────────────────────────────────────────────────────
    # Bio total includes Biomass (50.40) + BioNonBagasse (8.82) + WtE (5.00)
    ("Odisha", "small_hydro",   140.63, None,    None, None, "OHPC",         None, 2026, 1, _SRC),
    ("Odisha", "biomass",        64.22, None,    None, None, None,           None, 2026, 1, _SRC),
    ("Odisha", "solar",         773.32, None, 25780.0, 17.5, "OREDA",       2.72, 2026, 1, _SRC),
    ("Odisha", "large_hydro",  2154.55, None,    None, None, "OHPC",         None, 2026, 1, _SRC),

    # ── Punjab ──────────────────────────────────────────────────────────────
    # Bio total includes Biomass/Bagasse (299.50) + BioNonBagasse (231.79)
    #   + WtE (10.75) + WtE Offgrid (34.55) — major agri/sugarcane state
    ("Punjab", "small_hydro",   176.10, None,   None, None, "PSPCL",              None, 2026, 1, _SRC),
    ("Punjab", "biomass",       576.59, None, 3172.0, 60.0, "Punjab Biomass Power", 5.50, 2026, 1, _SRC),
    ("Punjab", "solar",        1560.99, None, 6170.0, 17.0, "PEDA, Azure Power",  2.65, 2026, 1, _SRC),
    ("Punjab", "large_hydro",  1096.30, None,   None, None, "BBMB",               None, 2026, 1, _SRC),

    # ── Rajasthan ───────────────────────────────────────────────────────────
    ("Rajasthan", "small_hydro",    23.85, None,    None, None, None,                               None, 2026, 1, _SRC),
    ("Rajasthan", "wind",         5229.15, None, 18770.0, 28.0, "Suzlon, Inox Wind, Adani",        2.85, 2026, 1, _SRC),
    ("Rajasthan", "biomass",       207.52, None,    None, None, None,                               None, 2026, 1, _SRC),
    ("Rajasthan", "solar",       37925.04, None, 142310.0, 21.5, "Adani Green, NTPC, Azure Power", 2.36, 2026, 1, _SRC),
    ("Rajasthan", "large_hydro",   412.50, None,    None, None, "RVUNL",                            None, 2026, 1, _SRC),

    # ── Sikkim ──────────────────────────────────────────────────────────────
    ("Sikkim", "small_hydro",    55.11, None, None, None, "SPDC",  None, 2026, 1, _SRC),
    ("Sikkim", "solar",           7.56, None, None, None, None,    None, 2026, 1, _SRC),
    ("Sikkim", "large_hydro",  2282.00, None, None, None, "SPDC",  None, 2026, 1, _SRC),

    # ── Tamil Nadu ──────────────────────────────────────────────────────────
    ("Tamil Nadu", "small_hydro",    123.05, None,    None, None, "TANGEDCO",                        None, 2026, 1, _SRC),
    ("Tamil Nadu", "wind",         12084.56, None, 33800.0, 27.5, "Suzlon, Vestas, ReNew Power",    2.82, 2026, 1, _SRC),
    ("Tamil Nadu", "biomass",       1046.62, None,    None, None, None,                               None, 2026, 1, _SRC),
    ("Tamil Nadu", "solar",        11731.61, None, 17670.0, 18.5, "Adani, TANGEDCO, SECI",          2.55, 2026, 1, _SRC),
    ("Tamil Nadu", "large_hydro",   2203.20, None,    None, None, "TANGEDCO",                        None, 2026, 1, _SRC),

    # ── Telangana ───────────────────────────────────────────────────────────
    ("Telangana", "small_hydro",    89.67, None,    None, None, "TSGENCO",           None, 2026, 1, _SRC),
    ("Telangana", "wind",          128.10, None,    None, None, None,                None, 2026, 1, _SRC),
    ("Telangana", "biomass",       221.67, None,    None, None, None,                None, 2026, 1, _SRC),
    ("Telangana", "solar",        5065.10, None, 20410.0, 19.0, "TSSPDCL, Adani",   2.50, 2026, 1, _SRC),
    ("Telangana", "large_hydro",  2405.60, None,    None, None, "TSGENCO",           None, 2026, 1, _SRC),

    # ── Tripura ─────────────────────────────────────────────────────────────
    ("Tripura", "small_hydro",  16.01, None, None, None, "TSECL",  None, 2026, 1, _SRC),
    ("Tripura", "solar",        35.16, None, None, None, None,     None, 2026, 1, _SRC),

    # ── Uttar Pradesh ───────────────────────────────────────────────────────
    # Bio total includes large Bagasse Cogeneration from sugarcane industry (1985.50 MW)
    ("Uttar Pradesh", "small_hydro",    50.60, None,    None, None, "UPJVNL",                    None, 2026, 1, _SRC),
    ("Uttar Pradesh", "biomass",      2310.39, None,    None, None, "UPCL, Sugar mills",         None, 2026, 1, _SRC),
    ("Uttar Pradesh", "solar",        3829.88, None, 22830.0, 17.5, "UPNEDA, Tata Power, NTPC", 2.62, 2026, 1, _SRC),
    ("Uttar Pradesh", "large_hydro",   501.60, None,    None, None, "UPJVNL",                    None, 2026, 1, _SRC),

    # ── Uttarakhand ─────────────────────────────────────────────────────────
    ("Uttarakhand", "small_hydro",   233.82, None, 1708.0, 48.0, "UJVNL, UREDA",  None, 2026, 1, _SRC),
    ("Uttarakhand", "biomass",       149.57, None,   None, None, None,             None, 2026, 1, _SRC),
    ("Uttarakhand", "solar",         837.89, None,   None, None, "UREDA",          None, 2026, 1, _SRC),
    ("Uttarakhand", "large_hydro",  4785.35, None,   None, None, "UJVNL",          None, 2026, 1, _SRC),

    # ── West Bengal ─────────────────────────────────────────────────────────
    # Bio total includes Biomass (300 MW, largely rice husk/agri residue)
    ("West Bengal", "small_hydro",    98.50, None, None, None, "WBSEDCL",         None, 2026, 1, _SRC),
    ("West Bengal", "biomass",       351.86, None, None, None, "WBSEDCL",         None, 2026, 1, _SRC),
    ("West Bengal", "solar",         320.62, None, 6260.0, 16.0, "WBREDA",        2.80, 2026, 1, _SRC),
    ("West Bengal", "large_hydro",  1341.20, None, None, None, "WBSEDCL",         None, 2026, 1, _SRC),

    # ── Andaman & Nicobar Islands ────────────────────────────────────────────
    ("Andaman & Nicobar Islands", "small_hydro",  5.25, None, None, None, None, None, 2026, 1, _SRC),
    ("Andaman & Nicobar Islands", "solar",        32.12, None, None, None, None, None, 2026, 1, _SRC),

    # ── Chandigarh ──────────────────────────────────────────────────────────
    ("Chandigarh", "solar",  78.85, None, None, None, None, None, 2026, 1, _SRC),

    # ── Dadra & Nagar Haveli and Daman & Diu ────────────────────────────────
    ("Dadra & Nagar Haveli and Daman & Diu", "biomass",   3.75, None, None, None, None, None, 2026, 1, _SRC),
    ("Dadra & Nagar Haveli and Daman & Diu", "solar",   134.90, None, None, None, None, None, 2026, 1, _SRC),

    # ── Delhi ───────────────────────────────────────────────────────────────
    ("Delhi", "biomass",   85.17, None, None, None, None, None, 2026, 1, _SRC),
    ("Delhi", "solar",    403.30, None, None, None, None, None, 2026, 1, _SRC),

    # ── Lakshadweep ─────────────────────────────────────────────────────────
    ("Lakshadweep", "solar",  6.57, None, None, None, None, None, 2026, 1, _SRC),

    # ── Puducherry ──────────────────────────────────────────────────────────
    ("Puducherry", "solar",  77.61, None, None, None, None, None, 2026, 1, _SRC),

    # ── Others (miscellaneous/unclassified) ──────────────────────────────────
    ("Others", "small_hydro",  4.30, None, None, None, None, None, 2026, 1, _SRC),
    ("Others", "solar",       45.01, None, None, None, None, None, 2026, 1, _SRC),
]
# National totals per MNRE Jan-2026 report (MW):
#   Small Hydro: 5,158.61  Wind: 54,650.40  Biomass: 11,613.93
#   Solar: 1,40,601.75     Large Hydro: 51,164.67   Grand Total: 2,63,189.36

# ---------------------------------------------------------------------------
# Power Generation – annual generation (MU) by source, FY 2024-25
# Based on CEA Monthly Generation Reports
# ---------------------------------------------------------------------------
POWER_GENERATION_DATA = [
    # (state, source, generation_mu, period, year, month, plf%, source_text)
    ("Rajasthan", "solar", 32500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Rajasthan", "wind", 10500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Rajasthan", "thermal", 48200.0, "annual", 2025, None, 62.5, "CEA Generation Report"),
    ("Gujarat", "solar", 22300.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Gujarat", "wind", 22100.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Gujarat", "thermal", 95600.0, "annual", 2025, None, 68.2, "CEA Generation Report"),
    ("Karnataka", "solar", 16800.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Karnataka", "wind", 11700.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Karnataka", "hydro", 12500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Tamil Nadu", "solar", 11500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Tamil Nadu", "wind", 24300.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Tamil Nadu", "thermal", 54800.0, "annual", 2025, None, 58.5, "CEA Generation Report"),
    ("Tamil Nadu", "nuclear", 23400.0, "annual", 2025, None, 75.0, "CEA Generation Report"),
    ("Andhra Pradesh", "solar", 9500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Andhra Pradesh", "wind", 9300.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Maharashtra", "solar", 7200.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Maharashtra", "wind", 10700.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Maharashtra", "thermal", 112500.0, "annual", 2025, None, 65.0, "CEA Generation Report"),
    ("Telangana", "solar", 8100.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Madhya Pradesh", "solar", 5500.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Madhya Pradesh", "thermal", 63200.0, "annual", 2025, None, 60.0, "CEA Generation Report"),
    ("Uttar Pradesh", "solar", 4400.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("Uttar Pradesh", "thermal", 88900.0, "annual", 2025, None, 58.0, "CEA Generation Report"),
    ("Chhattisgarh", "thermal", 52600.0, "annual", 2025, None, 72.0, "CEA Generation Report"),
    ("West Bengal", "thermal", 42300.0, "annual", 2025, None, 55.0, "CEA Generation Report"),
    ("Punjab", "thermal", 32800.0, "annual", 2025, None, 52.0, "CEA Generation Report"),
    ("Haryana", "thermal", 23400.0, "annual", 2025, None, 54.0, "CEA Generation Report"),
    ("Odisha", "thermal", 35600.0, "annual", 2025, None, 63.0, "CEA Generation Report"),
    ("Jharkhand", "thermal", 28900.0, "annual", 2025, None, 65.0, "CEA Generation Report"),
    ("Bihar", "thermal", 11200.0, "annual", 2025, None, 48.0, "CEA Generation Report"),
    # National summary (All India)
    ("All India", "solar", 158000.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("All India", "wind", 95000.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("All India", "thermal", 1095000.0, "annual", 2025, None, 62.0, "CEA Generation Report"),
    ("All India", "hydro", 167000.0, "annual", 2025, None, None, "CEA Generation Report"),
    ("All India", "nuclear", 52000.0, "annual", 2025, None, 78.0, "CEA Generation Report"),
    ("All India", "biomass", 18000.0, "annual", 2025, None, None, "CEA Generation Report"),
]

# ---------------------------------------------------------------------------
# Transmission Lines – inter-state corridors for RE evacuation
# Based on CEA Transmission data & PowerGrid Corporation reports
# ---------------------------------------------------------------------------
TRANSMISSION_LINE_DATA = [
    # (name, from, to, voltage_kv, length_km, capacity_mw, status, owner, year, source)
    ("Rajasthan–Gujarat RE Corridor", "Rajasthan", "Gujarat", 765, 890.0, 6000.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Bhadla–Fatehpur HVDC", "Rajasthan", "Uttar Pradesh", 800, 1100.0, 6000.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Tamil Nadu–Kerala Interconnector", "Tamil Nadu", "Kerala", 400, 280.0, 2000.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Green Energy Corridor Phase-I (Southern)", "Karnataka", "Tamil Nadu", 765, 1580.0, 8500.0, "operational", "PowerGrid Corporation", 2025, "MNRE Green Energy Corridor"),
    ("Green Energy Corridor Phase-I (Western)", "Gujarat", "Maharashtra", 765, 1960.0, 9000.0, "operational", "PowerGrid Corporation", 2025, "MNRE Green Energy Corridor"),
    ("Green Energy Corridor Phase-II InSTS (Rajasthan)", "Rajasthan", None, 400, 1520.0, 4500.0, "under_construction", "State Transco", 2025, "MNRE Green Energy Corridor"),
    ("Green Energy Corridor Phase-II InSTS (Gujarat)", "Gujarat", None, 400, 1370.0, 4000.0, "under_construction", "GETCO", 2025, "MNRE Green Energy Corridor"),
    ("Green Energy Corridor Phase-II InSTS (Tamil Nadu)", "Tamil Nadu", None, 230, 990.0, 3000.0, "under_construction", "TANTRANSCO", 2025, "MNRE Green Energy Corridor"),
    ("Leh–Karu–Drass RE Line", "Ladakh", None, 220, 350.0, 1500.0, "planned", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Khavda–Bhuj HVDC (Gujarat RE Hub)", "Gujarat", None, 800, 250.0, 9000.0, "under_construction", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Maharashtra ISTS for Hybrid Projects", "Maharashtra", "Madhya Pradesh", 765, 720.0, 5000.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Andhra Pradesh RE Evacuation Corridor", "Andhra Pradesh", "Telangana", 400, 450.0, 3500.0, "operational", "APTRANSCO", 2025, "CEA Transmission Plan"),
    ("Odisha–Jharkhand Inter-connector", "Odisha", "Jharkhand", 400, 320.0, 2500.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("NER Grid Strengthening (Phase-I)", "Assam", "Meghalaya", 400, 560.0, 2000.0, "under_construction", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
    ("Champa–Kurukshetra HVDC Bipole", "Chhattisgarh", "Haryana", 800, 1365.0, 6000.0, "operational", "PowerGrid Corporation", 2025, "CEA Transmission Plan"),
]

# ---------------------------------------------------------------------------
# Power Consumption – state-wise by sector (MU), FY 2024-25
# Based on CEA Load Generation Balance Report & LDC data
# ---------------------------------------------------------------------------
POWER_CONSUMPTION_DATA = [
    # (state, sector, consumption_mu, peak_demand_mw, year, month, source)
    ("Maharashtra", "industrial", 72500.0, 28500.0, 2025, None, "CEA LGBR"),
    ("Maharashtra", "domestic", 38200.0, None, 2025, None, "CEA LGBR"),
    ("Maharashtra", "commercial", 22100.0, None, 2025, None, "CEA LGBR"),
    ("Maharashtra", "agriculture", 31500.0, None, 2025, None, "CEA LGBR"),
    ("Gujarat", "industrial", 58600.0, 22800.0, 2025, None, "CEA LGBR"),
    ("Gujarat", "domestic", 24500.0, None, 2025, None, "CEA LGBR"),
    ("Gujarat", "agriculture", 28900.0, None, 2025, None, "CEA LGBR"),
    ("Tamil Nadu", "industrial", 42300.0, 18500.0, 2025, None, "CEA LGBR"),
    ("Tamil Nadu", "domestic", 26800.0, None, 2025, None, "CEA LGBR"),
    ("Tamil Nadu", "agriculture", 18200.0, None, 2025, None, "CEA LGBR"),
    ("Uttar Pradesh", "industrial", 35200.0, 25000.0, 2025, None, "CEA LGBR"),
    ("Uttar Pradesh", "domestic", 42100.0, None, 2025, None, "CEA LGBR"),
    ("Uttar Pradesh", "agriculture", 22800.0, None, 2025, None, "CEA LGBR"),
    ("Rajasthan", "industrial", 28500.0, 16500.0, 2025, None, "CEA LGBR"),
    ("Rajasthan", "domestic", 22300.0, None, 2025, None, "CEA LGBR"),
    ("Rajasthan", "agriculture", 32100.0, None, 2025, None, "CEA LGBR"),
    ("Karnataka", "industrial", 34500.0, 15800.0, 2025, None, "CEA LGBR"),
    ("Karnataka", "domestic", 18900.0, None, 2025, None, "CEA LGBR"),
    ("Karnataka", "agriculture", 20500.0, None, 2025, None, "CEA LGBR"),
    ("Andhra Pradesh", "industrial", 24800.0, 13500.0, 2025, None, "CEA LGBR"),
    ("Andhra Pradesh", "domestic", 16200.0, None, 2025, None, "CEA LGBR"),
    ("Andhra Pradesh", "agriculture", 19600.0, None, 2025, None, "CEA LGBR"),
    ("Telangana", "industrial", 28900.0, 14200.0, 2025, None, "CEA LGBR"),
    ("Telangana", "domestic", 18500.0, None, 2025, None, "CEA LGBR"),
    ("Madhya Pradesh", "industrial", 22800.0, 14000.0, 2025, None, "CEA LGBR"),
    ("Madhya Pradesh", "agriculture", 26200.0, None, 2025, None, "CEA LGBR"),
    ("West Bengal", "industrial", 18500.0, 10800.0, 2025, None, "CEA LGBR"),
    ("West Bengal", "domestic", 14200.0, None, 2025, None, "CEA LGBR"),
    ("Punjab", "industrial", 16800.0, 14200.0, 2025, None, "CEA LGBR"),
    ("Punjab", "agriculture", 22300.0, None, 2025, None, "CEA LGBR"),
    ("Haryana", "industrial", 15200.0, 12500.0, 2025, None, "CEA LGBR"),
    ("Haryana", "agriculture", 14800.0, None, 2025, None, "CEA LGBR"),
]

# ---------------------------------------------------------------------------
# RE Tariffs – SECI auction results and SERC orders, 2024-2025
# Based on SECI/NTPC auction data and CERC/SERC tariff orders
# ---------------------------------------------------------------------------
RE_TARIFF_DATA = [
    # (state, source, tariff_type, rate, currency, effective, expiry, authority, tender_id, grid_comparison, year, source_text)
    ("Rajasthan", "solar", "auction", 2.36, "INR", "2024-06-15", None, "SECI", "SECI-ISTS-XIV", 7.50, 2025, "SECI Auction Results"),
    ("Rajasthan", "wind", "auction", 2.85, "INR", "2024-09-01", None, "SECI", "SECI-Wind-Tranche-XV", 7.50, 2025, "SECI Auction Results"),
    ("Rajasthan", "solar_wind_hybrid", "auction", 2.49, "INR", "2024-11-01", None, "SECI", "SECI-Hybrid-IV", 7.50, 2025, "SECI Auction Results"),
    ("Gujarat", "solar", "auction", 2.42, "INR", "2024-07-20", None, "GUVNL", "GUVNL-Solar-2024", 6.85, 2025, "GUVNL Auction"),
    ("Gujarat", "wind", "auction", 2.78, "INR", "2024-08-15", None, "SECI", "SECI-Wind-Gujarat", 6.85, 2025, "SECI Auction Results"),
    ("Karnataka", "solar", "feed_in", 3.04, "INR", "2024-04-01", "2029-03-31", "KERC", None, 7.20, 2025, "KERC Tariff Order 2024"),
    ("Karnataka", "wind", "feed_in", 3.29, "INR", "2024-04-01", "2029-03-31", "KERC", None, 7.20, 2025, "KERC Tariff Order 2024"),
    ("Tamil Nadu", "solar", "feed_in", 2.91, "INR", "2024-04-01", "2029-03-31", "TNERC", None, 6.90, 2025, "TNERC Tariff Order"),
    ("Tamil Nadu", "wind", "feed_in", 2.86, "INR", "2024-04-01", "2029-03-31", "TNERC", None, 6.90, 2025, "TNERC Tariff Order"),
    ("Andhra Pradesh", "solar", "ppa", 2.44, "INR", "2024-05-10", None, "APERC", None, 7.10, 2025, "APERC Order"),
    ("Maharashtra", "solar", "auction", 2.58, "INR", "2024-10-01", None, "MSEDCL", "MSEDCL-Solar-2024", 7.80, 2025, "MSEDCL Auction"),
    ("Maharashtra", "wind", "green_energy_open_access", 3.15, "INR", "2024-06-01", "2027-05-31", "MERC", None, 7.80, 2025, "MERC Order"),
    ("Madhya Pradesh", "solar", "auction", 2.45, "INR", "2024-03-15", None, "MPUVNL", "REWA-Phase-II", 6.50, 2025, "MPUVNL Auction"),
    ("Telangana", "solar", "feed_in", 2.78, "INR", "2024-04-01", "2029-03-31", "TSERC", None, 7.30, 2025, "TSERC Tariff Order"),
    ("Uttar Pradesh", "solar", "auction", 2.62, "INR", "2024-08-20", None, "UPNEDA", "UPNEDA-Solar-2024", 7.60, 2025, "UPNEDA Auction"),
    ("Punjab", "solar", "feed_in", 2.95, "INR", "2024-04-01", "2029-03-31", "PSERC", None, 7.40, 2025, "PSERC Order"),
    ("All India", "solar", "auction", 2.24, "INR", "2025-01-10", None, "NTPC", "NTPC-RE-2025", None, 2025, "NTPC Auction (Record Low)"),
]

# ---------------------------------------------------------------------------
# Investment Guidelines – FDI, banking, green finance
# Based on RBI circulars, IREDA schemes, DPIIT policy
# ---------------------------------------------------------------------------
INVESTMENT_GUIDELINE_DATA = [
    # (title, category, institution, description, rate_range, max_loan, tenure, eligibility, doc_url, year, source)
    (
        "100% FDI in Renewable Energy (Automatic Route)",
        "fdi", "DPIIT",
        "100% Foreign Direct Investment allowed under automatic route for renewable energy generation and distribution projects. No government approval required.",
        None, None, None,
        "Foreign entities investing in solar, wind, small hydro, biomass power generation",
        None, 2025, "DPIIT FDI Policy 2024",
    ),
    (
        "IREDA Term Loan for Solar Projects",
        "project_finance", "IREDA",
        "Term loans for solar power projects including ground-mounted, rooftop, and floating solar. Covers up to 75% of project cost.",
        "8.50% - 10.50%", "INR 500 Cr", "15-20 years",
        "SPVs, IPPs, PSUs with minimum 25% equity. Project must have PPA or merchant sale agreement.",
        None, 2025, "IREDA Lending Norms",
    ),
    (
        "IREDA Term Loan for Wind Projects",
        "project_finance", "IREDA",
        "Term loans for wind power projects including onshore and offshore wind. Covers up to 70% of project cost.",
        "8.75% - 10.75%", "INR 400 Cr", "15-18 years",
        "Wind power developers with proven track record. Minimum 30% equity required.",
        None, 2025, "IREDA Lending Norms",
    ),
    (
        "SBI Green Rupee Term Loan",
        "project_finance", "SBI",
        "Specialized term loan for renewable energy projects including solar, wind, and biomass. Competitive interest rates with extended tenure.",
        "8.90% - 11.00%", "INR 1000 Cr", "12-18 years",
        "Companies with net worth > INR 100 Cr. DSCR >= 1.3. Project IRR >= 12%.",
        None, 2025, "SBI Corporate Loans",
    ),
    (
        "Green Bond Framework India",
        "green_bond", "SEBI",
        "SEBI framework for issuance of green bonds to raise capital for renewable energy projects. Listed on BSE/NSE Green Bond segment.",
        "7.50% - 9.50%", "INR 5000 Cr", "5-10 years",
        "Listed companies, NBFCs, municipal corporations with green project pipeline.",
        None, 2025, "SEBI Green Bond Guidelines",
    ),
    (
        "PM-KUSUM (Component A) – Solar Power Plants",
        "subsidy", "MNRE",
        "Central Financial Assistance for setting up 10,000 MW decentralized ground-mounted solar power plants on barren/fallow land by farmers.",
        None, "INR 40 Lakh/MW CFA", "25 years PPA",
        "Individual farmers, FPOs, cooperatives, panchayats with land ownership.",
        None, 2025, "MNRE PM-KUSUM Scheme",
    ),
    (
        "PM-KUSUM (Component C) – Solar Pumps Solarization",
        "subsidy", "MNRE",
        "Central and State subsidy for solarization of grid-connected agricultural pumps up to 7.5 HP. Farmers can sell surplus power to DISCOM.",
        None, "60% subsidy (30% Central + 30% State)", None,
        "Farmers with grid-connected agricultural pumps. Pump capacity up to 7.5 HP.",
        None, 2025, "MNRE PM-KUSUM Scheme",
    ),
    (
        "Accelerated Depreciation for Wind/Solar",
        "tax_incentive", "MoF",
        "Accelerated depreciation benefit of 40% in the first year for wind and solar power projects, enabling significant tax savings for developers.",
        None, None, None,
        "Companies investing in wind turbines or solar power generating systems.",
        None, 2025, "Income Tax Act Section 32",
    ),
    (
        "RBI Priority Sector Lending – Renewable Energy",
        "project_finance", "RBI",
        "Bank loans up to INR 30 Crore for renewable energy projects classified as priority sector lending. Includes solar, wind, biomass, and micro-hydel projects.",
        "MCLR + 0.5% to 2.0%", "INR 30 Cr", "10-15 years",
        "Individual borrowers, MSMEs, farmer producer organizations for RE projects.",
        None, 2025, "RBI Master Direction on PSL",
    ),
]

# ---------------------------------------------------------------------------
# Data Repository – official data source URLs
# ---------------------------------------------------------------------------
DATA_REPOSITORY_DATA = [
    # (title, category, org, doc_type, url, description, year, last_updated, active)
    ("MNRE State-wise Installed Capacity Jan-2026", "capacity", "MNRE", "pdf",
     "https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/02/202602091660392380.pdf",
     "State-wise (Location based) installed capacity of Renewable Power as on 31.01.2026 — official MNRE data sheet covering all 37 states/UTs with SHP, Wind, Bio-Power, Solar and Large Hydro breakdowns",
     2026, "2026-01-31", True),
    ("CEA Monthly Generation Report", "generation", "CEA", "report",
     "https://cea.nic.in/monthly-generation-report/", "Monthly power generation data for all sources across India", 2026, "Monthly", True),
    ("MNRE Physical Progress", "capacity", "MNRE", "dashboard",
     "https://mnre.gov.in/physical-progress/", "State-wise renewable energy installed capacity and targets", 2026, "Monthly", True),
    ("National Power Portal", "generation", "CEA/MoP", "dashboard",
     "https://npp.gov.in/", "Real-time and historical power generation, demand, and frequency data", 2025, "Real-time", True),
    ("SECI Auction Results", "tariff", "SECI", "dataset",
     "https://www.seci.co.in/", "Solar and wind energy auction results with tariff details", 2025, "Per Auction", True),
    ("CERC Tariff Orders", "tariff", "CERC", "report",
     "https://cercind.gov.in/", "Central Electricity Regulatory Commission tariff orders and regulations", 2025, "Quarterly", True),
    ("MERIT India Dashboard", "generation", "CEA/MoP", "dashboard",
     "https://meritindia.in/", "Merit Order Dispatch - real-time generation data by source and cost", 2025, "Real-time", True),
    ("POSOCO (Grid-India) Dashboard", "transmission", "Grid-India", "dashboard",
     "https://www.grid-india.in/", "National Load Dispatch Centre - grid frequency, demand, inter-regional power flow", 2025, "Real-time", True),
    ("IREDA Annual Report", "investment", "IREDA", "report",
     "https://www.ireda.in/", "Indian Renewable Energy Development Agency annual report and lending data", 2025, "Annual", True),
    ("CEA Installed Capacity Report", "capacity", "CEA", "report",
     "https://cea.nic.in/installed-capacity-report/", "All India installed capacity of power stations by fuel type", 2025, "Monthly", True),
    ("Green Energy Corridor Monitoring", "transmission", "MNRE", "dashboard",
     "https://mnre.gov.in/green-energy-corridor/", "Progress of transmission infrastructure for RE evacuation", 2025, "Quarterly", True),
    ("NITI Aayog India Energy Dashboard", "capacity", "NITI Aayog", "dashboard",
     "https://www.niti.gov.in/edm/", "Comprehensive energy data including renewables, fossil fuels, and energy mix", 2025, "Annual", True),
    ("CEA Load Generation Balance Report", "generation", "CEA", "report",
     "https://cea.nic.in/lgbr-report/", "State-wise load generation balance with demand-supply analysis", 2025, "Annual", True),
    ("SEBI Green Bond Database", "investment", "SEBI", "dataset",
     "https://www.sebi.gov.in/", "Database of green bonds issued in India for renewable energy financing", 2025, "Ongoing", True),
    ("RBI PSL Circular on Renewable Energy", "investment", "RBI", "report",
     "https://www.rbi.org.in/", "Priority Sector Lending guidelines applicable to renewable energy projects", 2025, "Annual", True),
    ("DPIIT FDI Policy Circular", "investment", "DPIIT", "report",
     "https://dpiit.gov.in/", "Consolidated FDI policy circular including renewable energy sector", 2025, "Annual", True),
]


async def update_renewable_capacity_jan2026() -> None:
    """Replace RenewableCapacity table with MNRE Jan-2026 data (idempotent upsert).

    Safe to run against an already-populated database — deletes all existing
    capacity rows and re-inserts from RENEWABLE_CAPACITY_DATA.  All other
    tables (generation, tariffs, etc.) are left untouched.
    """
    from sqlalchemy import delete  # local import to avoid top-level clutter

    async with async_session_factory() as session:
        # Wipe existing capacity rows
        await session.execute(delete(RenewableCapacity))
        logger.info("Cleared existing RenewableCapacity rows.")

        # Insert Jan-2026 data
        for row in RENEWABLE_CAPACITY_DATA:
            state, source, installed, available, potential, cuf, dev, ppa, year, month, src = row
            session.add(RenewableCapacity(
                state=state, energy_source=source,
                installed_capacity_mw=installed,
                available_capacity_mw=available,
                potential_capacity_mw=potential,
                cuf_percent=cuf, developer=dev,
                ppa_rate_per_kwh=ppa,
                data_year=year, data_month=month,
                source=src,
                source_url="https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/02/202602091660392380.pdf",
            ))

        await session.commit()
        logger.info(
            "RenewableCapacity updated with MNRE Jan-2026 data (%d records).",
            len(RENEWABLE_CAPACITY_DATA),
        )


async def seed_power_market() -> None:
    """Insert power market seed data if tables are empty."""
    async with async_session_factory() as session:
        # Check if already seeded
        count_stmt = select(sa_func.count()).select_from(RenewableCapacity)
        result = await session.execute(count_stmt)
        if (result.scalar() or 0) > 0:
            logger.info("Power market data already seeded – skipping.")
            return

        logger.info("Seeding power market data...")

        # 1. Renewable Capacity
        for row in RENEWABLE_CAPACITY_DATA:
            state, source, installed, available, potential, cuf, dev, ppa, year, month, src = row
            session.add(RenewableCapacity(
                state=state, energy_source=source,
                installed_capacity_mw=installed,
                available_capacity_mw=available,
                potential_capacity_mw=potential,
                cuf_percent=cuf, developer=dev,
                ppa_rate_per_kwh=ppa,
                data_year=year, data_month=month,
                source=src,
                source_url="https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/02/202602091660392380.pdf",
            ))

        # 2. Power Generation
        for row in POWER_GENERATION_DATA:
            state, source, gen, period, year, month, plf, src = row
            session.add(PowerGeneration(
                state=state, energy_source=source,
                generation_mu=gen, period_type=period,
                data_year=year, data_month=month,
                plant_load_factor=plf, source=src,
            ))

        # 3. Transmission Lines
        for row in TRANSMISSION_LINE_DATA:
            name, from_st, to_st, kv, length, cap, status, owner, year, src = row
            session.add(TransmissionLine(
                name=name, from_state=from_st, to_state=to_st,
                voltage_kv=kv, length_km=length, capacity_mw=cap,
                status=status, owner=owner, data_year=year, source=src,
            ))

        # 4. Power Consumption
        for row in POWER_CONSUMPTION_DATA:
            state, sector, consumption, peak, year, month, src = row
            session.add(PowerConsumption(
                state=state, sector=sector,
                consumption_mu=consumption, peak_demand_mw=peak,
                data_year=year, data_month=month, source=src,
            ))

        # 5. RE Tariffs
        for row in RE_TARIFF_DATA:
            state, source, ttype, rate, curr, eff, exp, auth, tid, grid_comp, year, src = row
            eff_dt = datetime.strptime(eff, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            exp_dt = datetime.strptime(exp, "%Y-%m-%d").replace(tzinfo=timezone.utc) if exp else None
            session.add(RETariff(
                state=state, energy_source=source, tariff_type=ttype,
                rate_per_kwh=rate, currency=curr,
                effective_date=eff_dt, expiry_date=exp_dt,
                ordering_authority=auth, tender_id=tid,
                grid_tariff_comparison=grid_comp,
                data_year=year, source=src,
            ))

        # 6. Investment Guidelines
        for row in INVESTMENT_GUIDELINE_DATA:
            title, cat, inst, desc, rate_range, max_loan, tenure, elig, doc_url, year, src = row
            session.add(InvestmentGuideline(
                title=title, category=cat, institution=inst,
                description=desc, interest_rate_range=rate_range,
                max_loan_amount=max_loan, tenure_years=tenure,
                eligibility=elig, document_url=doc_url,
                data_year=year, source=src,
            ))

        # 7. Data Repository
        for row in DATA_REPOSITORY_DATA:
            title, cat, org, doc_type, url, desc, year, last_upd, active = row
            session.add(DataRepository(
                title=title, category=cat, organization=org,
                document_type=doc_type, url=url, description=desc,
                data_year=year, last_updated=last_upd, is_active=active,
            ))

        await session.commit()
        logger.info("Power market data seeded successfully (%d capacity, %d generation, %d transmission, %d consumption, %d tariffs, %d guidelines, %d repository entries).",
            len(RENEWABLE_CAPACITY_DATA), len(POWER_GENERATION_DATA),
            len(TRANSMISSION_LINE_DATA), len(POWER_CONSUMPTION_DATA),
            len(RE_TARIFF_DATA), len(INVESTMENT_GUIDELINE_DATA),
            len(DATA_REPOSITORY_DATA),
        )
