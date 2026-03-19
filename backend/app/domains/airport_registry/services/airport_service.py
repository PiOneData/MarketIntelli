import json
import logging
from pathlib import Path
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.airport_registry.models.airport import Airport

logger = logging.getLogger(__name__)

_DATA_FILE = Path(__file__).parents[4] / "data" / "airports.json"


def _to_str(value: object) -> str | None:
    """Convert any value to string, returning None for null/empty."""
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


class AirportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def count(self) -> int:
        result = await self.db.execute(select(func.count(Airport.id)))
        return result.scalar() or 0

    async def seed_from_json(self) -> int:
        """Seed airport table from airports.json — skips if table already has data."""
        if await self.count() > 0:
            return 0

        if not _DATA_FILE.exists():
            logger.warning("airports.json not found at %s — skipping seed", _DATA_FILE)
            return 0

        with open(_DATA_FILE, encoding="utf-8") as f:
            raw: list[dict] = json.load(f)

        seeded = 0
        for entry in raw:
            airport = Airport(
                sno=entry.get("S.No"),
                airport_name=entry.get("Airport Name") or "Unknown",
                iata_code=_to_str(entry.get("IATA Code")),
                city=_to_str(entry.get("City")),
                state=_to_str(entry.get("State / UT")),
                type=_to_str(entry.get("Type")),
                status=_to_str(entry.get("Status")),
                latitude=entry.get("latitude"),
                longitude=entry.get("longitude"),
                power_consumption_mw=_to_str(entry.get("Power Consumption (MW)")),
                solar_capacity_mw=_to_str(entry.get("Solar Capacity Installed (MW)")),
                pct_green_coverage=_to_str(entry.get("% Green Energy Coverage")),
                green_energy_sources=_to_str(entry.get("Green Energy Sources")),
                carbon_neutral_aci_level=_to_str(entry.get("Carbon Neutral / ACI Level")),
                is_green=bool(entry.get("is_green", False)),
                annual_passengers_mn=_to_str(entry.get("Annual Passengers (Mn)")),
                no_of_runways=_to_str(entry.get("No. of Runways")),
                operator_concessionaire=_to_str(entry.get("Operator / Concessionaire")),
            )
            self.db.add(airport)
            seeded += 1

        await self.db.commit()
        logger.info("Airport seed: %d airports loaded from airports.json", seeded)
        return seeded

    async def list_airports(
        self,
        state: str | None = None,
        type_filter: str | None = None,
        status: str | None = None,
        green_only: bool = False,
        search: str | None = None,
        page: int = 1,
        page_size: int = 200,
    ) -> tuple[list[Airport], int]:
        query = select(Airport)
        count_query = select(func.count(Airport.id))

        if green_only:
            query = query.where(Airport.is_green == True)  # noqa: E712
            count_query = count_query.where(Airport.is_green == True)  # noqa: E712
        if state:
            query = query.where(Airport.state.ilike(f"%{state}%"))
            count_query = count_query.where(Airport.state.ilike(f"%{state}%"))
        if type_filter:
            query = query.where(Airport.type.ilike(f"%{type_filter}%"))
            count_query = count_query.where(Airport.type.ilike(f"%{type_filter}%"))
        if status:
            query = query.where(Airport.status.ilike(f"%{status}%"))
            count_query = count_query.where(Airport.status.ilike(f"%{status}%"))
        if search:
            like = f"%{search}%"
            from sqlalchemy import or_
            query = query.where(
                or_(
                    Airport.airport_name.ilike(like),
                    Airport.city.ilike(like),
                    Airport.iata_code.ilike(like),
                    Airport.state.ilike(like),
                )
            )
            count_query = count_query.where(
                or_(
                    Airport.airport_name.ilike(like),
                    Airport.city.ilike(like),
                    Airport.iata_code.ilike(like),
                    Airport.state.ilike(like),
                )
            )

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Airport.sno.asc().nulls_last(), Airport.airport_name.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_airport(self, airport_id: UUID) -> Airport | None:
        result = await self.db.execute(
            select(Airport).where(Airport.id == airport_id)
        )
        return result.scalar_one_or_none()

    async def create_airport(self, **kwargs) -> Airport:
        airport = Airport(**kwargs)
        self.db.add(airport)
        await self.db.commit()
        await self.db.refresh(airport)
        return airport

    async def update_airport(self, airport_id: UUID, **kwargs) -> Airport | None:
        airport = await self.get_airport(airport_id)
        if not airport:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(airport, key, value)
        await self.db.commit()
        await self.db.refresh(airport)
        return airport

    async def delete_airport(self, airport_id: UUID) -> bool:
        airport = await self.get_airport(airport_id)
        if not airport:
            return False
        await self.db.delete(airport)
        await self.db.commit()
        return True

    async def get_meta(self) -> dict:
        """Return distinct filter values for states, types, statuses."""
        states_res = await self.db.execute(
            select(Airport.state).distinct().where(Airport.state.isnot(None)).order_by(Airport.state)
        )
        types_res = await self.db.execute(
            select(Airport.type).distinct().where(Airport.type.isnot(None)).order_by(Airport.type)
        )
        statuses_res = await self.db.execute(
            select(Airport.status).distinct().where(Airport.status.isnot(None)).order_by(Airport.status)
        )
        return {
            "states": [r[0] for r in states_res.all()],
            "types": [r[0] for r in types_res.all()],
            "statuses": [r[0] for r in statuses_res.all()],
        }

    async def get_power_stats(self) -> dict:
        """Aggregate power and solar stats across all airports."""
        airports, _ = await self.list_airports(page_size=10000)
        total_power_mw = 0.0
        total_solar_mw = 0.0
        airports_with_power = 0
        airports_with_solar = 0

        for a in airports:
            power = _parse_mw(a.power_consumption_mw)
            solar = _parse_mw(a.solar_capacity_mw)
            total_power_mw += power
            total_solar_mw += solar
            if power > 0:
                airports_with_power += 1
            if solar > 0:
                airports_with_solar += 1

        green_share_pct = (total_solar_mw / total_power_mw * 100) if total_power_mw > 0 else 0.0
        return {
            "total_airports": len(airports),
            "airports_with_power_data": airports_with_power,
            "airports_with_solar_data": airports_with_solar,
            "total_power_mw": round(total_power_mw, 1),
            "total_solar_mw": round(total_solar_mw, 1),
            "grid_power_mw": round(max(total_power_mw - total_solar_mw, 0.0), 1),
            "green_share_pct": round(green_share_pct, 1),
            "grid_share_pct": round(100.0 - green_share_pct, 1) if total_power_mw > 0 else 0.0,
            "source": "AAI / MoCA · DB (seeded from airports.json)",
        }


def _parse_mw(value: str | None) -> float:
    if not value:
        return 0.0
    s = str(value).replace(",", "").strip().lstrip("~").strip()
    if s in ("N/A", "NA", "n/a", ""):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0
