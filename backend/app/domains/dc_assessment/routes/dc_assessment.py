from __future__ import annotations

import os
import textwrap
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:latest")


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


def _build_prompt(p: ReportPayload) -> str:
    is_airport = bool(p.airport_name)
    asset_type = "Airport" if is_airport else "Datacenter/Asset"
    name = p.dc_name or p.airport_name or "N/A"

    wind_profile = p.wind.get("profile", {})
    ws_100 = wind_profile.get("100", {}).get("ws", "N/A")

    return textwrap.dedent(f"""
        You are an expert Environmental Engineer. Write a formal Operational Environmental Assessment Report for the requested existing {asset_type}.
        Do not invent or hallucinate data. Use EVERY SINGLE EXACT metric provided below.
        Format your response using Markdown with bold syntax, bullet points, and headers.

        Include:
        1. Executive Summary
        2. Operational Stressors (how Solar, Wind, Water metrics impact cooling efficiency and business continuity)
        3. Environmental Vulnerabilities & Mitigation
        4. Longevity & Resilience Outlook

        **Site Details:**
        Name: {name}
        Location: {p.city}, {p.state}, {p.country}
        Coordinates: {p.lat}° N, {p.lon}° E
        Power Capacity: {p.power_mw or "N/A"} MW

        **Solar Metrics:**
        GHI: {p.solar.get("ghi_annual", "N/A")} kWh/m²/year ({p.solar.get("ghi", "N/A")} kWh/m²/day)
        Optimal Tilt: {p.solar.get("optimal_tilt", "N/A")}°
        Average Temp: {p.solar.get("avg_temp", "N/A")}°C
        Elevation: {p.solar.get("elevation", "N/A")}m
        AOD (Aerosols): {p.solar.get("aod", "N/A")} ({p.solar.get("aod_label", "N/A")})
        Cloud Cover: {p.solar.get("cloud_pct", "N/A")}% ({p.solar.get("cloud_label", "N/A")})

        **Wind Metrics:**
        Average Wind Speed (100m): {ws_100} m/s
        Power Density (100m): {p.wind.get("pd100", "N/A")} W/m²
        Capacity Factor: {p.wind.get("cf3_pct", "N/A")}%
        Ruggedness Index: {p.wind.get("rix", "N/A")}

        **Water Metrics:**
        Annual Precipitation: {p.water.get("precip_annual", "N/A")} mm
        Water Stress Deficit: {p.water.get("deficit", "N/A")} mm ({p.water.get("deficit_label", "N/A")})
        Flood Risk: {p.water.get("flood_risk", "N/A")}
        Drought Condition (PDSI): {p.water.get("pdsi_label", "N/A")}
        Groundwater Trend (GRACE LWE): {p.water.get("lwe", "N/A")} cm ({p.water.get("grace_label", "N/A")})

        Write the report now.
    """).strip()


def _markdown_to_html(md: str) -> str:
    """Convert basic markdown to HTML without external libraries."""
    import re
    lines = md.split("\n")
    html_lines: list[str] = []
    in_ul = False

    for line in lines:
        # Headers
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
        # Bullet points
        elif line.startswith("- ") or line.startswith("* "):
            if not in_ul:
                html_lines.append("<ul>")
                in_ul = True
            content = line[2:]
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", content)
            html_lines.append(f"<li>{content}</li>")
        # Empty line
        elif line.strip() == "":
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            html_lines.append("<br>")
        # Regular paragraph
        else:
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
            html_lines.append(f"<p>{content}</p>")

    if in_ul:
        html_lines.append("</ul>")

    return "\n".join(html_lines)


def _build_html(name: str, body_html: str) -> str:
    date_str = datetime.now().strftime("%B %d, %Y")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Environmental Assessment — {name}</title>
<style>
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }}
  h1 {{ color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }}
  h2 {{ color: #1d4ed8; margin-top: 30px; }}
  h3 {{ color: #2563eb; }}
  p, li {{ font-size: 14px; }}
  .header {{ text-align: right; font-size: 12px; color: #64748b; margin-bottom: 40px; }}
  ul {{ padding-left: 20px; }}
  @media print {{ body {{ padding: 20px; }} }}
</style>
</head>
<body>
<div class="header">
  <strong>Generated:</strong> {date_str}<br>
  <strong>Site:</strong> {name}
</div>
{body_html}
</body>
</html>"""


@router.post("/generate-report", response_model=None)
async def generate_report(payload: ReportPayload) -> HTMLResponse | JSONResponse:
    """Generate an AI-powered environmental assessment report.

    Calls Ollama LLM to generate a markdown report, converts to HTML,
    and returns it as an HTML response suitable for browser printing to PDF.
    Returns 503 if Ollama is not available.
    """
    name = payload.dc_name or payload.airport_name or "Site"
    prompt = _build_prompt(payload)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            markdown_content: str = data.get("response", "")
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as exc:
        return JSONResponse(
            status_code=503,
            content={"error": "Ollama LLM service not available", "details": str(exc)},
        )

    body_html = _markdown_to_html(markdown_content)
    full_html = _build_html(name, body_html)

    safe_name = name.replace(" ", "_").replace("/", "-")
    return HTMLResponse(
        content=full_html,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_Assessment.html"',
        },
    )
