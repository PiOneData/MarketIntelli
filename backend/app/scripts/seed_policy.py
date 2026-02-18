"""Seed the policy_intelligence tables with Indian renewable energy policy data.

Sources:
- MNRE (https://mnre.gov.in)
- Ministry of Power (https://powermin.gov.in)
- CERC / SERC Tariff Orders
- SECI Auction Results
- State Nodal Agency notifications
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Policies – central and state-level RE policies and regulations
# ---------------------------------------------------------------------------
POLICY_DATA = [
    # (title, authority, category, state, summary, effective_date, document_url)
    (
        "National Solar Mission Phase-III Guidelines",
        "MNRE", "guideline", None,
        "Phase-III targets 40 GW rooftop solar and 60 GW utility-scale solar by 2030. Includes provisions for solar parks, canal-top solar, and floating solar installations.",
        "2024-04-01", "https://mnre.gov.in/solar-mission",
    ),
    (
        "Green Energy Open Access Rules 2022 (Amended 2024)",
        "MoP", "regulation", None,
        "Allows consumers with 100 kW+ load to purchase green energy from any generator. Removes inter-state transmission charges for 25 years for projects commissioned before 2025.",
        "2024-01-15", "https://powermin.gov.in/green-energy-open-access",
    ),
    (
        "Electricity (Amendment) Act 2024",
        "MoP", "amendment", None,
        "Key amendments include mandatory RPO compliance, delicensing of distribution in specific areas, introduction of cross-subsidy surcharge caps, and penalties for non-compliance.",
        "2024-07-01", "https://powermin.gov.in/electricity-act",
    ),
    (
        "RPO Trajectory 2024-2030",
        "MoP", "regulation", None,
        "Mandates Renewable Purchase Obligation trajectory: 43.33% by 2029-30 including minimum 14.37% solar, 6.94% wind, 2.5% hydro purchase obligations for obligated entities.",
        "2024-04-01", "https://powermin.gov.in/rpo-trajectory",
    ),
    (
        "PM-KUSUM Scheme Guidelines (Revised)",
        "MNRE", "guideline", None,
        "Revised guidelines for Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan covering Component A (solar plants), Component B (standalone pumps), and Component C (pump solarization).",
        "2024-06-15", "https://mnre.gov.in/pm-kusum",
    ),
    (
        "National Wind-Solar Hybrid Policy",
        "MNRE", "guideline", None,
        "Framework for development of wind-solar hybrid projects to optimize land use and transmission infrastructure. Allows hybridization of existing projects up to rated capacity.",
        "2024-03-01", "https://mnre.gov.in/wind-solar-hybrid",
    ),
    (
        "Battery Energy Storage Systems (BESS) Policy",
        "MNRE", "guideline", None,
        "Guidelines for viability gap funding for 4,000 MWh BESS capacity. Mandates 85% domestic content requirement. Target of 18 GWh standalone BESS by 2030.",
        "2024-09-01", "https://mnre.gov.in/bess-policy",
    ),
    (
        "National Green Hydrogen Mission",
        "MNRE", "guideline", None,
        "Mission targets 5 MMT annual green hydrogen production by 2030. Provides incentives for electrolyzer manufacturing and green hydrogen/ammonia production linked to RE capacity addition.",
        "2024-01-01", "https://mnre.gov.in/green-hydrogen-mission",
    ),
    (
        "RE Waste Management Rules 2024",
        "MoEFCC", "regulation", None,
        "Mandatory guidelines for end-of-life management of solar panels and wind turbine blades. Producers must establish take-back and recycling mechanisms within 2 years.",
        "2024-10-01", "https://moef.gov.in/re-waste-management",
    ),
    (
        "Rajasthan Solar Energy Policy 2024",
        "RRECL", "guideline", "Rajasthan",
        "State policy targeting 90 GW RE capacity by 2030. Provides land allotment at concessional rates in solar parks, single-window clearance, and stamp duty exemption for RE projects.",
        "2024-05-01", "https://energy.rajasthan.gov.in/solar-policy",
    ),
    (
        "Gujarat Solar Power Policy 2024",
        "GEDA", "guideline", "Gujarat",
        "Updated state solar policy with targets for 45 GW solar by 2030. Includes rooftop solar mandate for new buildings, banking facility for 12 months, and wheeling charge concessions.",
        "2024-04-01", "https://geda.gujarat.gov.in/solar-policy",
    ),
    (
        "Karnataka RE Policy 2024-2029",
        "KREDL", "guideline", "Karnataka",
        "Five-year state RE policy targeting 30 GW total RE capacity. Provides exemption from electricity duty for 10 years, land conversion fee waiver, and priority grid connectivity.",
        "2024-04-01", "https://kredl.karnataka.gov.in/re-policy",
    ),
    (
        "Tamil Nadu Solar Energy Policy 2024",
        "TEDA", "guideline", "Tamil Nadu",
        "State policy for 20 GW additional solar capacity. Includes provisions for agrivoltaics, floating solar on reservoirs, and mandatory rooftop solar for commercial establishments.",
        "2024-06-01", "https://teda.in/solar-policy",
    ),
    (
        "Maharashtra Net Metering Regulations (Amendment)",
        "MERC", "amendment", "Maharashtra",
        "Revised net metering regulations allowing systems up to 1 MW for commercial and industrial consumers. Introduces virtual net metering for group housing and cooperatives.",
        "2024-08-01", "https://merc.gov.in/net-metering",
    ),
    (
        "CERC RE Tariff Regulations 2024-29",
        "CERC", "regulation", None,
        "Central Electricity Regulatory Commission regulations for determination of tariff for renewable energy projects. Specifies normative parameters for solar, wind, and small hydro.",
        "2024-04-01", "https://cercind.gov.in/re-tariff-regulations",
    ),

    # ── SHANTI Act & SMR / Nuclear-Renewable Integration (Dec 2025) ─────────
    (
        "SHANTI Act 2025 – Small, High-temperature Advanced Nuclear Thermal Innovation Act",
        "MoP / DAE", "amendment", None,
        (
            "Enacted in December 2025, the SHANTI Act establishes the legal and regulatory "
            "framework for Small Modular Reactors (SMRs) in India, enabling private sector "
            "participation in nuclear power generation for the first time. Key provisions: "
            "(1) Bharat Small Modular Reactor (BSMR-200) designated as a national mission "
            "with ₹20,000 Cr Union Budget 2025-26 allocation; (2) NPCIL authorised to "
            "form joint ventures with PSUs and qualified private entities; (3) SMR capacity "
            "to count toward RPO as 'firm renewable capacity'; (4) DAE granted fast-track "
            "environmental clearance pathway for SMRs on decommissioned coal/thermal sites; "
            "(5) AERB constituted as independent statutory regulator (separated from DAE) "
            "for SMR licensing; (6) Production-linked incentive (PLI) of ₹2 Cr/MW for "
            "domestically manufactured SMR components; (7) Green Hydrogen co-location "
            "permitted at SMR sites for 24×7 clean power-to-gas operations."
        ),
        "2025-12-15", "https://powermin.gov.in/shanti-act-2025",
    ),
    (
        "BSMR-200 Financial & Risk Assessment for Private Industrial Investors",
        "DAE / NITI Aayog", "guideline", None,
        (
            "Comprehensive financial and risk assessment framework for a private company "
            "(e.g., a Steel Major) developing a 220 MWe Bharat SMR (BSMR-200) on a "
            "decommissioned coal site under the SHANTI Act 2025 and Union Budget 2026. "
            "\n\nCAPEX: ₹7,000–9,000 Cr (₹3,200–4,100/kW) including site prep, reactor "
            "module procurement, civil works, and grid integration. First-of-a-kind (FOAK) "
            "premium estimated at 25–35% over nth-of-a-kind (NOAK) costs. "
            "\n\nFINANCING STRUCTURE: Up to 70% debt via IREDA Green Nuclear Finance "
            "Facility at 8.25%–9.75% p.a.; NPCIL joint venture equity 26–49%; balance "
            "private equity. Viability Gap Funding (VGF) of ₹1,500 Cr available under "
            "SHANTI Act for FOAK projects. "
            "\n\nOPEX: ₹18–22 Cr/MW/year including O&M, fuel cycle, insurance, and "
            "decommissioning fund contribution (₹80 Cr/year mandatory). Nuclear fuel "
            "(enriched UO₂) cost: ₹4–6/kWh levelised over 60-year plant life. "
            "\n\nLCOE: ₹5.80–7.20/kWh (levelised, real 2026 terms), competitive with "
            "peaking gas and pumped storage. With carbon credit revenue (CBAM-linked), "
            "effective LCOE ₹5.00–6.40/kWh. IRR: 10.5–12.5% (post-tax, leveraged). "
            "\n\nKEY RISKS: (1) Construction schedule risk – 7–9 year build timeline; "
            "delay of 1 year = ~₹800 Cr cost overrun; (2) Technology risk – BSMR-200 "
            "based on PHWR design, first commercial deployment; (3) Fuel supply risk – "
            "enriched uranium dependency; DAF (Domestic Availability Factor) mandate "
            "requires 40% indigenous fuel; (4) Regulatory risk – AERB licensing new "
            "framework; estimated 18–24 months for FOAK licensing; (5) Policy continuity "
            "risk – SMR RPO credit subject to future MoP revision; (6) PPA/offtake risk – "
            "long-term captive PPA with steel plant captive consumption (own use) "
            "mitigates merchant exposure; (7) Decommissioning liability – ₹2,400 Cr "
            "provisioned over plant life. "
            "\n\nMITIGATION: Site on decommissioned coal plant (existing grid connection, "
            "cooling water, land) reduces CAPEX by ₹400–600 Cr and speeds commissioning "
            "by 18 months. Carbon credits (₹600–900 Cr NPV over 40 years) boost project "
            "economics. PLI subsidy on 60% domestic content = ₹350 Cr total benefit. "
            "\n\nCONCLUSION: Viable for energy-intensive industrial captive use with "
            "firm 24×7 low-carbon power requirement. Not recommended as pure merchant "
            "RE project due to FOAK risks. Best suited as strategic energy security "
            "investment for large PSU/industrial conglomerate with 15-year+ horizon."
        ),
        "2025-12-15", "https://niti.gov.in/bsmr-200-investment-framework",
    ),
    (
        "Union Budget 2025-26 – Renewable Energy & Nuclear Allocations",
        "MoF", "guideline", None,
        (
            "Key renewable energy and clean power allocations in Union Budget 2025-26: "
            "(1) MNRE allocation: ₹24,000 Cr (↑28% YoY) for solar, wind, green hydrogen, "
            "and BESS; (2) PM Surya Ghar Muft Bijli Yojana: ₹7,500 Cr for 1 crore "
            "rooftop solar installations; (3) BSMR-200 National Mission: ₹20,000 Cr "
            "over 5 years under SHANTI Act; (4) Green Hydrogen Mission Phase-II: ₹4,400 Cr; "
            "(5) Offshore Wind: ₹2,800 Cr for 1 GW demonstration projects; "
            "(6) Pumped Storage Hydro: ₹3,500 Cr for 10 GW PSH pipeline; "
            "(7) IREDA capitalisation: ₹1,500 Cr equity infusion; "
            "(8) Battery Storage PLI: ₹3,620 Cr for 50 GWh domestic manufacturing; "
            "(9) Green Credit Programme: carbon trading infrastructure ₹800 Cr; "
            "(10) Accelerated Depreciation: extended to floating solar and hybrid projects."
        ),
        "2025-02-01", "https://indiabudget.gov.in/budget2025-26",
    ),
]

# ---------------------------------------------------------------------------
# Tariff Records – feed-in tariffs, auction results, PPA rates
# ---------------------------------------------------------------------------
TARIFF_DATA = [
    # (state, tariff_type, rate_per_kwh, effective_date, energy_source, currency, expiry_date, source)
    ("Rajasthan", "auction", 2.36, "2024-06-15", "solar", "INR", None, "SECI ISTS Tranche XIV"),
    ("Rajasthan", "auction", 2.85, "2024-09-01", "wind", "INR", None, "SECI Wind Tranche XV"),
    ("Gujarat", "auction", 2.42, "2024-07-20", "solar", "INR", None, "GUVNL Solar Auction 2024"),
    ("Gujarat", "auction", 2.78, "2024-08-15", "wind", "INR", None, "SECI Wind Gujarat Tranche"),
    ("Karnataka", "feed_in", 3.04, "2024-04-01", "solar", "INR", "2029-03-31", "KERC Tariff Order 2024"),
    ("Karnataka", "feed_in", 3.29, "2024-04-01", "wind", "INR", "2029-03-31", "KERC Tariff Order 2024"),
    ("Tamil Nadu", "feed_in", 2.91, "2024-04-01", "solar", "INR", "2029-03-31", "TNERC Tariff Order 2024"),
    ("Tamil Nadu", "feed_in", 2.86, "2024-04-01", "wind", "INR", "2029-03-31", "TNERC Tariff Order 2024"),
    ("Andhra Pradesh", "ppa", 2.44, "2024-05-10", "solar", "INR", None, "APERC Order 2024"),
    ("Maharashtra", "auction", 2.58, "2024-10-01", "solar", "INR", None, "MSEDCL Solar Auction 2024"),
    ("Maharashtra", "green_energy_open_access", 3.15, "2024-06-01", "wind", "INR", "2027-05-31", "MERC Open Access Order"),
    ("Madhya Pradesh", "auction", 2.45, "2024-03-15", "solar", "INR", None, "REWA Phase-II Auction"),
    ("Telangana", "feed_in", 2.78, "2024-04-01", "solar", "INR", "2029-03-31", "TSERC Tariff Order 2024"),
    ("Uttar Pradesh", "auction", 2.62, "2024-08-20", "solar", "INR", None, "UPNEDA Solar Auction 2024"),
    ("Punjab", "feed_in", 2.95, "2024-04-01", "solar", "INR", "2029-03-31", "PSERC Tariff Order 2024"),
    ("All India", "auction", 2.24, "2025-01-10", "solar", "INR", None, "NTPC RE Auction 2025 (Record Low)"),
    ("Rajasthan", "auction", 2.49, "2024-11-01", "solar_wind_hybrid", "INR", None, "SECI Hybrid Tranche IV"),
    ("Gujarat", "feed_in", 2.65, "2024-04-01", "solar", "INR", "2029-03-31", "GERC Generic Tariff Order"),
    ("Andhra Pradesh", "auction", 2.51, "2024-12-01", "wind", "INR", None, "SECI Wind AP Tranche"),
    ("Chhattisgarh", "feed_in", 3.08, "2024-04-01", "solar", "INR", "2029-03-31", "CSERC Tariff Order 2024"),
]

# ---------------------------------------------------------------------------
# Subsidies – central and state-level RE subsidy programs
# ---------------------------------------------------------------------------
SUBSIDY_DATA = [
    # (name, authority, state, amount, unit, status, disbursement_date)
    (
        "PM-KUSUM Component A – Solar Plants on Barren Land",
        "MNRE", None, 40.0, "Lakh INR/MW CFA", "active", "2024-04-01",
    ),
    (
        "PM-KUSUM Component B – Standalone Solar Pumps",
        "MNRE", None, 30.0, "% Central Subsidy", "active", "2024-04-01",
    ),
    (
        "PM-KUSUM Component C – Solarization of Grid Pumps",
        "MNRE", None, 60.0, "% Subsidy (30% Central + 30% State)", "active", "2024-04-01",
    ),
    (
        "Rooftop Solar Phase-II (Residential)",
        "MNRE", None, 78000.0, "INR for 3 kW system", "active", "2024-04-01",
    ),
    (
        "PM Surya Ghar Muft Bijli Yojana",
        "MNRE", None, 78000.0, "INR subsidy up to 3 kW", "active", "2024-02-15",
    ),
    (
        "Rajasthan Solar Pump Subsidy",
        "RRECL", "Rajasthan", 60.0, "% of benchmark cost", "active", "2024-06-01",
    ),
    (
        "Gujarat Industrial Rooftop Solar Incentive",
        "GEDA", "Gujarat", 10000.0, "INR/kW (up to 500 kW)", "active", "2024-04-01",
    ),
    (
        "Karnataka Solar Rooftop Subsidy",
        "KREDL", "Karnataka", 14588.0, "INR/kW for 1-3 kW systems", "active", "2024-04-01",
    ),
    (
        "Tamil Nadu Solar Rooftop Net Metering Benefit",
        "TEDA", "Tamil Nadu", 20000.0, "INR/kW up to 10 kW", "active", "2024-07-01",
    ),
    (
        "Maharashtra Solar Ag Feeder Solarization",
        "MSEDCL", "Maharashtra", 75.0, "% total cost (Central + State)", "active", "2024-05-01",
    ),
    (
        "MNRE CFA for Small Hydro Projects",
        "MNRE", None, 3.5, "Cr INR/MW for NE States", "active", "2024-04-01",
    ),
    (
        "Accelerated Depreciation Benefit (Wind/Solar)",
        "MoF", None, 40.0, "% depreciation in year 1", "active", "2024-04-01",
    ),
    (
        "IREDA Concessional Rate for Solar Rooftop",
        "IREDA", None, 8.5, "% interest rate", "active", "2024-06-01",
    ),
    (
        "Uttar Pradesh Solar Policy Incentive",
        "UPNEDA", "Uttar Pradesh", 15000.0, "INR/kW for first 100 MW", "expired", "2023-03-31",
    ),
    (
        "Andhra Pradesh Wind Power Incentive",
        "NREDCAP", "Andhra Pradesh", None, "Wheeling charge exemption 5 years", "active", "2024-04-01",
    ),
]


_SHANTI_TITLES = {
    "SHANTI Act 2025 – Small, High-temperature Advanced Nuclear Thermal Innovation Act",
    "BSMR-200 Financial & Risk Assessment for Private Industrial Investors",
    "Union Budget 2025-26 – Renewable Energy & Nuclear Allocations",
}

_SHANTI_POLICY_DATA = [p for p in POLICY_DATA if p[0] in _SHANTI_TITLES]


async def add_shanti_policies() -> None:
    """Idempotent insert of SHANTI Act + BSMR-200 + Budget 2025-26 policy entries.

    Safe to call on an already-seeded database — checks by title before inserting.
    """
    async with async_session_factory() as session:
        for row in _SHANTI_POLICY_DATA:
            title, authority, category, state, summary, eff_date, doc_url = row
            # Skip if already exists
            exists_stmt = select(Policy).where(Policy.title == title)
            result = await session.execute(exists_stmt)
            if result.scalar():
                logger.debug("Policy '%s' already exists – skipping.", title)
                continue
            eff_dt = datetime.strptime(eff_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) if eff_date else None
            session.add(Policy(
                title=title,
                authority=authority,
                category=category,
                state=state,
                summary=summary,
                effective_date=eff_dt,
                document_url=doc_url,
            ))
            logger.info("Added policy: %s", title)
        await session.commit()
        logger.info("SHANTI Act policies upserted successfully.")


async def seed_policy() -> None:
    """Insert policy intelligence seed data if tables are empty."""
    async with async_session_factory() as session:
        count_stmt = select(sa_func.count()).select_from(Policy)
        result = await session.execute(count_stmt)
        if (result.scalar() or 0) > 0:
            logger.info("Policy data already seeded – skipping.")
            return

        logger.info("Seeding policy intelligence data...")

        # 1. Policies
        for row in POLICY_DATA:
            title, authority, category, state, summary, eff_date, doc_url = row
            eff_dt = datetime.strptime(eff_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) if eff_date else None
            session.add(Policy(
                title=title,
                authority=authority,
                category=category,
                state=state,
                summary=summary,
                effective_date=eff_dt,
                document_url=doc_url,
            ))

        # 2. Tariff Records
        for row in TARIFF_DATA:
            state, tariff_type, rate, eff_date, energy_src, currency, exp_date, source = row
            eff_dt = datetime.strptime(eff_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            exp_dt = datetime.strptime(exp_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) if exp_date else None
            session.add(TariffRecord(
                state=state,
                tariff_type=tariff_type,
                rate_per_kwh=rate,
                effective_date=eff_dt,
                energy_source=energy_src,
                currency=currency,
                expiry_date=exp_dt,
                source=source,
            ))

        # 3. Subsidies
        for row in SUBSIDY_DATA:
            name, authority, state, amount, unit, status, disb_date = row
            disb_dt = datetime.strptime(disb_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) if disb_date else None
            session.add(Subsidy(
                name=name,
                authority=authority,
                state=state,
                amount=amount,
                unit=unit,
                status=status,
                disbursement_date=disb_dt,
            ))

        await session.commit()
        logger.info(
            "Policy data seeded successfully (%d policies, %d tariffs, %d subsidies).",
            len(POLICY_DATA), len(TARIFF_DATA), len(SUBSIDY_DATA),
        )
