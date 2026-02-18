"""Seed script: curated India renewable energy & data center news articles."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.domains.alerts.models.alerts import NewsArticle

logger = logging.getLogger(__name__)

SEED_ARTICLES = [
    # ── Data Center news ──────────────────────────────────────────────────────
    {
        "title": "Microsoft to Invest $3 Billion in India Data Centers Across Maharashtra and Telangana",
        "url": "https://economictimes.indiatimes.com/tech/technology/microsoft-3-billion-india-data-centers/articleshow/seed001.cms",
        "source": "Economic Times",
        "category": "data_center",
        "state": "Maharashtra",
        "summary": "Microsoft announced plans to invest $3 billion in building hyperscale data centers across Maharashtra and Telangana over the next two years, supporting India's cloud-first digital economy push.",
        "published_at": datetime(2025, 11, 10, 9, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Amazon AWS Expands Data Center Footprint in Hyderabad, Telangana with New Campus",
        "url": "https://mercomindia.com/amazon-aws-hyderabad-data-center-expansion/seed002",
        "source": "Mercom India",
        "category": "data_center",
        "state": "Telangana",
        "summary": "Amazon Web Services is set to open its third campus in Hyderabad to serve growing demand for cloud computing in South Asia, bringing 2,000 direct jobs and 10,000 indirect jobs to Telangana.",
        "published_at": datetime(2025, 10, 22, 7, 0, tzinfo=timezone.utc),
    },
    {
        "title": "NITI Aayog Releases Framework for Green Data Centers Powered by Renewable Energy in India",
        "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=seed003",
        "source": "PIB India",
        "category": "data_center",
        "state": None,
        "summary": "NITI Aayog has released a comprehensive framework requiring new data centers above 50 MW to source at least 60% of their energy from renewable sources, aligning with India's net-zero targets by 2070.",
        "published_at": datetime(2025, 11, 5, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Google Cloud Opens Third India Region in Pune, Maharashtra Targeting Enterprise AI Workloads",
        "url": "https://economictimes.indiatimes.com/tech/technology/google-cloud-pune-region/articleshow/seed004.cms",
        "source": "Economic Times",
        "category": "data_center",
        "state": "Maharashtra",
        "summary": "Google Cloud's new Pune region marks its third infrastructure zone in India, specifically designed for enterprise AI and machine learning workloads, backed by renewable energy procurement agreements.",
        "published_at": datetime(2025, 9, 14, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Adani Enterprises Enters Hyperscale Data Center Business with ₹25,000 Crore Investment Plan",
        "url": "https://mercomindia.com/adani-hyperscale-data-center-india/seed005",
        "source": "Mercom India",
        "category": "data_center",
        "state": "Gujarat",
        "summary": "Adani Group's data center arm plans to develop hyperscale facilities across Gujarat, Maharashtra, and Tamil Nadu, leveraging its renewable energy assets to offer green colocation services.",
        "published_at": datetime(2025, 8, 30, 10, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Rajasthan Government Announces Data Center Policy with Single-Window Clearance and Land Subsidy",
        "url": "https://economictimes.indiatimes.com/tech/technology/rajasthan-data-center-policy/articleshow/seed006.cms",
        "source": "Economic Times",
        "category": "data_center",
        "state": "Rajasthan",
        "summary": "Rajasthan's new Data Center Policy 2025 offers single-window clearance in 30 days, discounted land, stamp duty exemptions, and 24x7 dedicated power supply to attract data center investments.",
        "published_at": datetime(2025, 7, 18, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Chennai Emerges as South India's Data Center Hub: Seven New Facilities Planned by 2026",
        "url": "https://www.datacenterdynamics.com/en/news/chennai-south-india-hub-seed007",
        "source": "Data Center Dynamics",
        "category": "data_center",
        "state": "Tamil Nadu",
        "summary": "Chennai's stable power grid, submarine cable landing stations, and Tamil Nadu's business-friendly policies have attracted seven major data center operators planning new facilities by 2026.",
        "published_at": datetime(2025, 10, 5, 11, 0, tzinfo=timezone.utc),
    },
    {
        "title": "NASSCOM Report: India Data Center Market to Reach $10 Billion by 2027 Driven by AI Demand",
        "url": "https://economictimes.indiatimes.com/tech/technology/nasscom-data-center-report-2025/articleshow/seed008.cms",
        "source": "Economic Times",
        "category": "data_center",
        "state": None,
        "summary": "NASSCOM's annual report projects India's data center capacity to triple by 2027, driven by generative AI adoption, 5G rollout, and digital public infrastructure initiatives.",
        "published_at": datetime(2025, 11, 1, 8, 30, tzinfo=timezone.utc),
    },
    # ── Solar energy ──────────────────────────────────────────────────────────
    {
        "title": "India Achieves 100 GW Solar Capacity Milestone Ahead of 2030 Target",
        "url": "https://mercomindia.com/india-100-gw-solar-milestone/seed009",
        "source": "Mercom India",
        "category": "solar",
        "state": None,
        "summary": "India crossed the 100 GW installed solar capacity landmark, with Rajasthan, Gujarat, and Tamil Nadu leading cumulative installations, marking a significant step toward the 500 GW renewable target by 2030.",
        "published_at": datetime(2025, 10, 15, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Rajasthan Solar Park Phase-IV: SECI Auctions 5 GW Capacity at Record Low Tariff of ₹2.14/kWh",
        "url": "https://mercomindia.com/rajasthan-solar-park-seci-auction-seed010",
        "source": "Mercom India",
        "category": "solar",
        "state": "Rajasthan",
        "summary": "SECI's Phase-IV Rajasthan solar auction discovered a record low tariff of ₹2.14/kWh, with Greenko, ReNew Power, and Torrent Power among the winners for 5 GW of capacity.",
        "published_at": datetime(2025, 9, 28, 7, 30, tzinfo=timezone.utc),
    },
    {
        "title": "PM Kusum Scheme Phase-3: 25 Lakh Solar Pumps to Be Installed Across Rural India by 2026",
        "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=seed011",
        "source": "PIB India",
        "category": "solar",
        "state": None,
        "summary": "The PM Kusum scheme's Phase-3 targets 25 lakh solar pumps for farmers with 60% subsidy from the central government, focusing on Uttar Pradesh, Maharashtra, and Madhya Pradesh as priority states.",
        "published_at": datetime(2025, 11, 8, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Tamil Nadu Issues 3 GW Solar Tender for Decentralized Rooftop Installations",
        "url": "https://solarquarter.com/tamil-nadu-3gw-rooftop-tender-seed012",
        "source": "Solar Quarter",
        "category": "solar",
        "state": "Tamil Nadu",
        "summary": "Tamil Nadu Electricity Regulatory Commission issued a tender for 3 GW of rooftop solar across residential, commercial, and industrial consumers to reduce peak load pressure on the state grid.",
        "published_at": datetime(2025, 8, 12, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "NTPC REL Commissions 500 MW Floating Solar Plant on Rihand Reservoir in Uttar Pradesh",
        "url": "https://mercomindia.com/ntpc-rel-floating-solar-rihand-seed013",
        "source": "Mercom India",
        "category": "solar",
        "state": "Uttar Pradesh",
        "summary": "NTPC Renewable Energy Limited commissioned Asia's largest floating solar plant on Rihand reservoir in Sonbhadra, Uttar Pradesh, generating 500 MW without land acquisition.",
        "published_at": datetime(2025, 7, 4, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Gujarat's Hybrid Renewable Energy Zone: 30 GW Solar-Wind Projects Approved in Kutch",
        "url": "https://economictimes.indiatimes.com/industry/renewables/gujarat-hybrid-kutch-zone/articleshow/seed014.cms",
        "source": "Economic Times - Renewables",
        "category": "solar",
        "state": "Gujarat",
        "summary": "Gujarat government approved a 30 GW hybrid renewable energy zone in Kutch district combining solar and wind, with dedicated transmission infrastructure to evacuate power to demand centers.",
        "published_at": datetime(2025, 6, 20, 10, 0, tzinfo=timezone.utc),
    },
    # ── Wind energy ───────────────────────────────────────────────────────────
    {
        "title": "India's Offshore Wind Capacity Target Raised to 37 GW by 2030 Under National Policy",
        "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=seed015",
        "source": "PIB India",
        "category": "wind",
        "state": None,
        "summary": "MNRE raised India's offshore wind target to 37 GW by 2030, with priority development off the coasts of Gujarat and Tamil Nadu, supported by Viability Gap Funding of ₹1 lakh crore.",
        "published_at": datetime(2025, 11, 3, 7, 0, tzinfo=timezone.utc),
    },
    {
        "title": "ReNew Power Wins 1.5 GW Offshore Wind Auction Off Gujarat Coast at ₹6.56/kWh",
        "url": "https://mercomindia.com/renew-power-offshore-wind-gujarat-seed016",
        "source": "Mercom India",
        "category": "wind",
        "state": "Gujarat",
        "summary": "ReNew Power won India's first commercial offshore wind auction for 1.5 GW off Gujarat's Saurashtra coast at ₹6.56/kWh tariff, with commissioning targeted by 2028.",
        "published_at": datetime(2025, 10, 1, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Andhra Pradesh Wind Energy Policy 2025: 10 GW Target with Dedicated Wind Corridors",
        "url": "https://economictimes.indiatimes.com/industry/renewables/andhra-pradesh-wind-policy-2025/articleshow/seed017.cms",
        "source": "Economic Times - Renewables",
        "category": "wind",
        "state": "Andhra Pradesh",
        "summary": "Andhra Pradesh unveiled its Wind Energy Policy 2025 targeting 10 GW of new capacity over five years, designating wind corridors in Kurnool, Anantapur, and Prakasam districts.",
        "published_at": datetime(2025, 9, 5, 9, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Tamil Nadu Adds Record 4.2 GW Wind Capacity in FY2025, Crossing 15 GW Cumulative Mark",
        "url": "https://solarquarter.com/tamil-nadu-wind-record-fy2025-seed018",
        "source": "Solar Quarter",
        "category": "wind",
        "state": "Tamil Nadu",
        "summary": "Tamil Nadu set a record of 4.2 GW wind additions in FY2025, crossing 15 GW cumulative installed wind capacity, cementing its position as India's top wind state ahead of Gujarat.",
        "published_at": datetime(2025, 4, 10, 10, 0, tzinfo=timezone.utc),
    },
    # ── Policy and regulatory ─────────────────────────────────────────────────
    {
        "title": "MNRE Releases Draft National Renewable Energy Policy 2025: 500 GW Target Roadmap",
        "url": "https://mnre.gov.in/news/draft-nrep-2025/seed019",
        "source": "MNRE",
        "category": "policy",
        "state": None,
        "summary": "MNRE published the draft National Renewable Energy Policy 2025 with a 500 GW target roadmap by 2030, detailing state-wise capacity allocation, transmission planning, and storage mandates.",
        "published_at": datetime(2025, 11, 12, 6, 30, tzinfo=timezone.utc),
    },
    {
        "title": "CERC Amends RPO Regulations: Raises Solar RPO to 43% and Wind RPO to 22% for 2025-26",
        "url": "https://mercomindia.com/cerc-rpo-amendment-2025-seed020",
        "source": "Mercom India",
        "category": "policy",
        "state": None,
        "summary": "The Central Electricity Regulatory Commission raised Renewable Purchase Obligation targets for solar to 43% and wind to 22% for 2025-26, increasing pressure on DISCOMs to accelerate renewable procurement.",
        "published_at": datetime(2025, 3, 28, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Karnataka SERC Approves Net Metering for Rooftop Solar up to 1 MW for Commercial Consumers",
        "url": "https://economictimes.indiatimes.com/industry/energy/power/karnataka-serc-net-metering/articleshow/seed021.cms",
        "source": "Economic Times - Power",
        "category": "policy",
        "state": "Karnataka",
        "summary": "Karnataka State Electricity Regulatory Commission approved net metering for commercial rooftop solar installations up to 1 MW, allowing consumers to sell surplus power to the grid at prevailing tariffs.",
        "published_at": datetime(2025, 10, 18, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Union Budget 2025-26: ₹35,000 Crore Allocated for Green Energy Transition and Storage",
        "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=seed022",
        "source": "PIB India",
        "category": "policy",
        "state": None,
        "summary": "The Union Budget 2025-26 allocated ₹35,000 crore for green energy transition, including ₹20,000 crore for battery energy storage, ₹10,000 crore for green hydrogen, and ₹5,000 crore for offshore wind.",
        "published_at": datetime(2025, 2, 1, 11, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Maharashtra Announces ₹10,000 Crore Green Hydrogen Policy for Industrial Decarbonisation",
        "url": "https://economictimes.indiatimes.com/industry/renewables/maharashtra-green-hydrogen-policy/articleshow/seed023.cms",
        "source": "Economic Times - Renewables",
        "category": "policy",
        "state": "Maharashtra",
        "summary": "Maharashtra Government's new Green Hydrogen Policy offers capital subsidies of up to 20%, dedicated industrial corridors, and concessional land for green hydrogen production facilities near Pune and Nashik.",
        "published_at": datetime(2025, 9, 22, 10, 0, tzinfo=timezone.utc),
    },
    # ── Renewable energy general ──────────────────────────────────────────────
    {
        "title": "India's Renewable Energy Capacity Crosses 250 GW, Meeting Interim 2025 Target",
        "url": "https://mercomindia.com/india-250-gw-renewable-milestone-seed024",
        "source": "Mercom India",
        "category": "renewable_energy",
        "state": None,
        "summary": "India's total installed renewable energy capacity reached 253 GW in October 2025, including solar, wind, hydro, and biopower, achieving the interim 2025 milestone set under the National Action Plan on Climate Change.",
        "published_at": datetime(2025, 10, 30, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "IRENA Report: India Leads Global Renewable Capacity Additions in 2024-25 with 42 GW",
        "url": "https://economictimes.indiatimes.com/industry/renewables/irena-india-renewable-additions/articleshow/seed025.cms",
        "source": "Economic Times - Renewables",
        "category": "renewable_energy",
        "state": None,
        "summary": "The International Renewable Energy Agency ranked India first globally in renewable capacity additions for 2024-25, adding 42 GW across solar, wind, and energy storage in the fiscal year.",
        "published_at": datetime(2025, 6, 15, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Green Hydrogen Mission: India Signs MoUs with Germany, Japan for ₹1.97 Lakh Crore Investments",
        "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=seed026",
        "source": "PIB India",
        "category": "renewable_energy",
        "state": None,
        "summary": "Under the National Green Hydrogen Mission, India signed bilateral MoUs with Germany and Japan for joint projects worth ₹1.97 lakh crore, targeting 5 MMT green hydrogen production by 2030.",
        "published_at": datetime(2025, 11, 7, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Odisha's Renewable Energy Sector Sees ₹50,000 Crore Investment Pledge at Utkarsh Odisha Summit",
        "url": "https://economictimes.indiatimes.com/industry/renewables/odisha-renewable-investment-summit/articleshow/seed027.cms",
        "source": "Economic Times - Renewables",
        "category": "renewable_energy",
        "state": "Odisha",
        "summary": "Utkarsh Odisha investment summit attracted ₹50,000 crore in renewable energy pledges from Tata Power, NTPC, and international players, targeting solar parks in Koraput and Sundargarh districts.",
        "published_at": datetime(2025, 1, 28, 10, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Punjab Signs PPA for 1,000 MW Solar Power to Ease Agricultural Power Subsidy Burden",
        "url": "https://mercomindia.com/punjab-ppa-solar-agricultural-seed028",
        "source": "Mercom India",
        "category": "renewable_energy",
        "state": "Punjab",
        "summary": "Punjab State Power Corporation signed PPAs for 1,000 MW of solar power at ₹2.28/kWh with SECI, aiming to replace expensive diesel and coal generation for agricultural feeders.",
        "published_at": datetime(2025, 8, 5, 9, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Himachal Pradesh's Small Hydro Power Revival: 500 MW of Stalled Projects to be Fast-Tracked",
        "url": "https://economictimes.indiatimes.com/industry/energy/power/himachal-pradesh-small-hydro-revival/articleshow/seed029.cms",
        "source": "Economic Times - Power",
        "category": "renewable_energy",
        "state": "Himachal Pradesh",
        "summary": "Himachal Pradesh government announced a revival plan for 500 MW of stalled small hydro projects with simplified approvals, extended PPAs, and revised tariffs to make them financially viable.",
        "published_at": datetime(2025, 5, 20, 8, 30, tzinfo=timezone.utc),
    },
    {
        "title": "Battery Energy Storage: SECI Auctions 4 GWh BESS Capacity Across Six Indian States",
        "url": "https://mercomindia.com/seci-bess-4gwh-auction-seed030",
        "source": "Mercom India",
        "category": "renewable_energy",
        "state": None,
        "summary": "SECI's first large-scale Battery Energy Storage System auction for 4 GWh across Rajasthan, Gujarat, Tamil Nadu, Andhra Pradesh, Karnataka, and Maharashtra discovered tariffs below ₹8/kWh.",
        "published_at": datetime(2025, 7, 25, 7, 0, tzinfo=timezone.utc),
    },
]


async def seed_news() -> None:
    """Insert curated news articles if the table is empty."""
    async with AsyncSessionLocal() as db:
        count_result = await db.execute(select(func.count()).select_from(NewsArticle))
        count = count_result.scalar_one()
        if count > 0:
            logger.info("News articles already seeded (%d rows). Skipping.", count)
            return

        for item in SEED_ARTICLES:
            article = NewsArticle(
                title=item["title"],
                url=item["url"],
                source=item["source"],
                category=item["category"],
                state=item.get("state"),
                summary=item.get("summary"),
                image_url=None,
                published_at=item.get("published_at"),
            )
            db.add(article)

        await db.commit()
        logger.info("Seeded %d news articles.", len(SEED_ARTICLES))
