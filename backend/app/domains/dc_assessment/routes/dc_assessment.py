from __future__ import annotations

import logging
import re
import textwrap
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

from app.domains.dc_assessment.models.report import AssessmentReport
from app.domains.dc_assessment.services.report_service import ReportService

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Request / Response schemas ───────────────────────────────────────────────


class ReportPayload(BaseModel):
    dc_name: str | None = None
    airport_name: str | None = None
    city: str = ""
    state: str = ""
    country: str = "India"
    lat: float = 0.0
    lon: float = 0.0
    power_mw: Any = None
    solar: dict[str, Any] = {}
    wind: dict[str, Any] = {}
    water: dict[str, Any] = {}
    # Caching fields
    asset_key: str = ""
    asset_type: str = "datacenter"
    force_regenerate: bool = False


class ReportResponse(BaseModel):
    asset_key: str
    asset_name: str
    asset_type: str
    city: str
    state: str
    lat: float
    lon: float
    analysis_json: str | None = None
    markdown_content: str
    html_content: str
    generated_at: str
    cached: bool
    solar_score: float | None = None
    wind_score: float | None = None
    water_score: float | None = None
    overall_score: float | None = None
    rating: str | None = None
    power_mw: float | None = None


class ScorePayload(BaseModel):
    solar_score: float
    wind_score: float
    water_score: float
    overall_score: float
    rating: str
    asset_name: str
    asset_type: str
    city: str | None = None
    state: str | None = None
    lat: float
    lon: float
    analysis_json: str | None = None
    power_mw: float | None = None


class AssessmentStatsResponse(BaseModel):
    total_reports: int
    datacenters: int
    airports: int
    states_covered: int
    total_mw: float


# ── Prompt builder ────────────────────────────────────────────────────────────


def _build_prompt(p: ReportPayload) -> str:
    is_airport = bool(p.airport_name)
    asset_type = "Airport" if is_airport else "Datacenter/Asset"
    name = p.dc_name or p.airport_name or "N/A"

    wind_profile = p.wind.get("profile", {})
    ws_100 = wind_profile.get("100", {}).get("ws", "N/A")

    return textwrap.dedent(f"""
        You are an expert Environmental Engineer specializing in renewable energy infrastructure in India.
        Write a formal Operational Environmental Assessment Report for the existing {asset_type} below.

        Do NOT invent or hallucinate data. Use EVERY exact metric provided. Be thorough and professional.
        Format your response using Markdown with bold syntax (**bold**), bullet points (- item), and headers (## Header).

        Structure the report with these exact sections:

        ## 1. Executive Summary
        Concise 3–4 sentence overview of the site's environmental profile and key risk factors.

        ## 2. Operational Stressors
        How Solar, Wind, and Water metrics impact cooling efficiency, power consumption, and business continuity.
        Include specific numbers from the metrics provided.

        ## 3. Environmental Vulnerabilities & Mitigation
        Identify the top 3–5 risks (flood, drought, heat, dust/aerosols, groundwater depletion).
        For each risk: current severity, projected trend, and 1–2 concrete mitigation actions.

        ## 4. Renewable Energy Potential
        Assess onsite solar generation feasibility (PV yield, optimal tilt, seasonal variability).
        Assess wind resource quality for supplemental generation.
        Recommend % renewable self-sufficiency achievable.

        ## 5. Longevity & Resilience Outlook
        10-year resilience rating (Excellent / Good / Moderate / At Risk / Critical).
        Key investments required to maintain operational continuity.

        ---

        **Site Details:**
        Name: {name}
        Type: {asset_type}
        Location: {p.city}, {p.state}, {p.country}
        Coordinates: {p.lat:.4f}° N, {p.lon:.4f}° E
        Power Capacity: {p.power_mw if p.power_mw not in (None, "", "Not Specified", "N/A") else "N/A"} MW

        **Solar Metrics:**
        GHI (daily): {p.solar.get("ghi", "N/A")} kWh/m²/day
        GHI (annual): {p.solar.get("ghi_annual", "N/A")} kWh/m²/year
        PV Output (daily): {p.solar.get("pvout", "N/A")} kWh/kWp/day
        PV Output (annual): {p.solar.get("pvout_annual", "N/A")} kWh/kWp/year
        Optimal Tilt: {p.solar.get("optimal_tilt", "N/A")}°
        Average Temperature: {p.solar.get("avg_temp", "N/A")}°C
        Elevation: {p.solar.get("elevation", "N/A")} m
        AOD (Aerosols): {p.solar.get("aod", "N/A")} — {p.solar.get("aod_label", "N/A")}
        Cloud Cover: {p.solar.get("cloud_pct", "N/A")}% — {p.solar.get("cloud_label", "N/A")}
        Seasonal Variability: {p.solar.get("seasonal_label", "N/A")}
        Solar Rating: {p.solar.get("rating", "N/A")}

        **Wind Metrics:**
        Wind Speed @ 100m: {ws_100} m/s
        Power Density @ 100m: {p.wind.get("pd100", "N/A")} W/m²
        Capacity Factor: {p.wind.get("cf3_pct", "N/A")}%
        Ruggedness Index: {p.wind.get("rix", "N/A")}
        Wind Grade: {p.wind.get("grade", "N/A")} — {p.wind.get("grade_label", "N/A")}
        Wind Rating: {p.wind.get("rating", "N/A")}

        **Water & Hydrology Metrics:**
        Annual Precipitation: {p.water.get("precip_annual", "N/A")} mm
        Flood Risk: {p.water.get("flood_risk", "N/A")}
        Water Stress Deficit: {p.water.get("deficit", "N/A")} mm — {p.water.get("deficit_label", "N/A")}
        Drought Index (PDSI): {p.water.get("pdsi_label", "N/A")}
        Groundwater Trend (GRACE): {p.water.get("lwe", "N/A")} cm — {p.water.get("grace_label", "N/A")}
        Aridity Index: {p.water.get("aridity", "N/A")}
        Water Rating: {p.water.get("rating", "N/A")}

        Write the complete report now.
    """).strip()


# ── Markdown → HTML (no external deps) ───────────────────────────────────────


def _markdown_to_html(md: str) -> str:
    lines = md.split("\n")
    html_lines: list[str] = []
    in_ul = False

    for line in lines:
        if line.startswith("### "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("## "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("# "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("---"):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append("<hr>")
        elif line.startswith("- ") or line.startswith("* "):
            if not in_ul:
                html_lines.append("<ul>")
                in_ul = True
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line[2:])
            html_lines.append(f"<li>{content}</li>")
        elif line.strip() == "":
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append("<br>")
        else:
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
            html_lines.append(f"<p>{content}</p>")

    if in_ul:
        html_lines.append("</ul>")

    return "\n".join(html_lines)


def _build_full_html(name: str, body_html: str) -> str:
    date_str = datetime.now().strftime("%B %d, %Y")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Environmental Assessment — {name}</title>
<style>
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; line-height: 1.7; padding: 48px; max-width: 860px; margin: 0 auto; }}
  h1 {{ color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; font-size: 22px; }}
  h2 {{ color: #1d4ed8; margin-top: 32px; font-size: 17px; border-left: 4px solid #3b82f6; padding-left: 12px; }}
  h3 {{ color: #2563eb; font-size: 14px; margin-top: 18px; }}
  p, li {{ font-size: 14px; color: #374151; }}
  li {{ margin-bottom: 4px; }}
  ul {{ padding-left: 24px; margin: 8px 0; }}
  strong {{ color: #111827; }}
  hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }}
  .header {{ text-align: right; font-size: 11px; color: #6b7280; margin-bottom: 40px; border-bottom: 1px solid #f3f4f6; padding-bottom: 12px; }}
  .header strong {{ color: #374151; }}
  @media print {{ body {{ padding: 20px; }} }}
</style>
</head>
<body>
<div class="header">
  <strong>Site:</strong> {name}&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Generated:</strong> {date_str}&nbsp;&nbsp;|&nbsp;&nbsp;<strong>MarketIntelli AI Assessment</strong>
</div>
{body_html}
</body>
</html>"""


# ── Helpers ───────────────────────────────────────────────────────────────────


def _to_response(report: AssessmentReport, cached: bool) -> ReportResponse:
    return ReportResponse(
        asset_key=report.asset_key,
        asset_name=report.asset_name,
        asset_type=report.asset_type,
        city=report.city,
        state=report.state,
        lat=report.lat,
        lon=report.lon,
        markdown_content=report.markdown_content,
        html_content=report.html_content,
        generated_at=report.generated_at.isoformat(),
        cached=cached,
        solar_score=report.solar_score,
        wind_score=report.wind_score,
        water_score=report.water_score,
        overall_score=report.overall_score,
        rating=report.rating,
        analysis_json=report.analysis_json,
        power_mw=report.power_mw,
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/generate-report", response_model=None)
async def generate_report(
    payload: ReportPayload,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse | JSONResponse:
    """Generate (or return cached) AI environmental assessment report.

    - If asset_key matches a DB record and force_regenerate=False: returns cached report instantly.
    - Otherwise: calls Azure OpenAI (or Ollama fallback), saves to DB, returns fresh report.
    """
    service = ReportService(db)
    asset_name = payload.dc_name or payload.airport_name or "Site"

    # ── Return cached report if available ───────────────────────────────────
    if payload.asset_key and not payload.force_regenerate:
        cached = await service.get_by_asset_key(payload.asset_key)
        if cached:
            return _to_response(cached, cached=True)

    # ── Generate fresh report ────────────────────────────────────────────────
    prompt = _build_prompt(payload)
    try:
        markdown_content = await service.generate_markdown(prompt)
    except Exception as exc:
        logger.error("Report generation failed for asset_key=%s: %s", payload.asset_key, exc, exc_info=True)
        return JSONResponse(
            status_code=503,
            content={"error": "Azure OpenAI service unavailable", "details": str(exc)},
        )

    html_body = _markdown_to_html(markdown_content)

    # Save to DB — power_mw may arrive as a string (e.g. "Not Specified") from GeoJSON properties
    try:
        power_mw = float(payload.power_mw) if payload.power_mw is not None else None
    except (ValueError, TypeError):
        power_mw = None
    report = await service.upsert(
        asset_key=payload.asset_key or f"{payload.asset_type}_unknown",
        asset_name=asset_name,
        asset_type=payload.asset_type,
        city=payload.city,
        state=payload.state,
        lat=payload.lat,
        lon=payload.lon,
        markdown_content=markdown_content,
        html_content=html_body,
        power_mw=power_mw,
    )

    return _to_response(report, cached=False)


@router.get("/reports/{asset_key:path}", response_model=None)
async def get_report(
    asset_key: str,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse | JSONResponse:
    """Return a previously generated report by asset_key, or 404 if none exists."""
    service = ReportService(db)
    report = await service.get_by_asset_key(asset_key)
    if not report:
        return JSONResponse(status_code=404, content={"error": "No cached report found"})

    return _to_response(report, cached=True)


@router.get("/saved", response_model=list[ReportResponse])
async def list_saved_assessments(
    db: AsyncSession = Depends(get_db),
) -> list[ReportResponse]:
    """Return all generated assessment reports for the Profile page.

    Any report that has been generated (AI text or RE scores) appears here,
    guaranteeing cross-device persistence without re-running AI.
    """
    result = await db.execute(
        select(AssessmentReport).order_by(AssessmentReport.generated_at.desc())
    )
    reports = result.scalars().all()
    return [_to_response(r, cached=True) for r in reports]


@router.get("/stats", response_model=AssessmentStatsResponse)
async def get_assessment_stats(
    db: AsyncSession = Depends(get_db),
) -> AssessmentStatsResponse:
    """Return aggregate KPI stats across all saved assessment reports."""
    total_result = await db.execute(select(func.count()).select_from(AssessmentReport))
    total_reports = total_result.scalar_one() or 0

    dc_result = await db.execute(
        select(func.count()).select_from(AssessmentReport).where(AssessmentReport.asset_type == "datacenter")
    )
    datacenters = dc_result.scalar_one() or 0

    airport_result = await db.execute(
        select(func.count()).select_from(AssessmentReport).where(AssessmentReport.asset_type == "airport")
    )
    airports = airport_result.scalar_one() or 0

    states_result = await db.execute(
        select(func.count(func.distinct(AssessmentReport.state))).where(AssessmentReport.state != "")
    )
    states_covered = states_result.scalar_one() or 0

    mw_result = await db.execute(
        select(func.coalesce(func.sum(AssessmentReport.power_mw), 0.0))
    )
    total_mw = float(mw_result.scalar_one() or 0.0)

    return AssessmentStatsResponse(
        total_reports=total_reports,
        datacenters=datacenters,
        airports=airports,
        states_covered=states_covered,
        total_mw=total_mw,
    )


@router.post("/reports/{asset_key:path}/scores", response_model=ReportResponse, status_code=201)
async def save_assessment_scores(
    asset_key: str,
    payload: ScorePayload,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    """Upsert renewable energy scores for an asset. Creates a stub row if no AI report exists yet."""
    service = ReportService(db)
    existing = await service.get_by_asset_key(asset_key)
    if existing:
        existing.solar_score = payload.solar_score
        existing.wind_score = payload.wind_score
        existing.water_score = payload.water_score
        existing.overall_score = payload.overall_score
        existing.rating = payload.rating
        if payload.analysis_json is not None:
            existing.analysis_json = payload.analysis_json
        if payload.power_mw is not None:
            existing.power_mw = payload.power_mw
        await db.commit()
        await db.refresh(existing)
        return _to_response(existing, cached=True)

    report = AssessmentReport(
        asset_key=asset_key,
        asset_name=payload.asset_name,
        asset_type=payload.asset_type,
        city=payload.city or "",
        state=payload.state or "",
        lat=payload.lat,
        lon=payload.lon,
        markdown_content="",
        html_content="",
        solar_score=payload.solar_score,
        wind_score=payload.wind_score,
        water_score=payload.water_score,
        overall_score=payload.overall_score,
        rating=payload.rating,
        analysis_json=payload.analysis_json,
        power_mw=payload.power_mw,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return _to_response(report, cached=False)


@router.delete("/reports/{asset_key:path}", status_code=204)
async def delete_assessment(
    asset_key: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a saved assessment report by asset_key."""
    service = ReportService(db)
    report = await service.get_by_asset_key(asset_key)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()


@router.get("/reports/{asset_key:path}/download", response_model=None)
async def download_report(
    asset_key: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse | JSONResponse:
    """Return the full printable HTML file for browser download."""
    service = ReportService(db)
    report = await service.get_by_asset_key(asset_key)
    if not report:
        return JSONResponse(status_code=404, content={"error": "No cached report found"})

    full_html = _build_full_html(report.asset_name, report.html_content)
    safe_name = report.asset_name.replace(" ", "_").replace("/", "-")
    return HTMLResponse(
        content=full_html,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_Environmental_Assessment.html"',
        },
    )
