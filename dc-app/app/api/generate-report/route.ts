import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

export async function POST(req: NextRequest) {
    try {
        const p = await req.json();

        // Ensure we have Ollama URL
        const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
        const model = process.env.OLLAMA_MODEL || 'llama3:latest';

        const isAirport = !!p.airport_name;
        const assetTypeStr = isAirport ? "Airport" : "Datacenter/Asset";

        // 1. Construct strict prompt
        const prompt = `
You are an expert Environmental Engineer. Write a formal Operational Environmental Assessment Report for the requested existing ${assetTypeStr}.
Do not invent or hallucinate data. You MUST use and explicitly mention EVERY SINGLE EXACT mathematical metric provided below in your report. Describe the operational risks, vulnerabilities, and environmental stressors associated with those metrics for an already constructed, functioning ${assetTypeStr}.
Format your response using Markdown. Use bold syntax, bullet points, and headers logically.
The report should exactly include:
1. Executive Summary: High-level overview of the existing facility's environmental context.
2. Operational Stressors: How the Solar, Wind, and Water metrics directly impact cooling efficiency, structural wear, or business continuity.
3. Environmental Vulnerabilities & Mitigation: Focus on risks (e.g., severe pollution, water stress, flood risk) and suggest operational upgrades or maintenance strategies to mitigate them.
4. Longevity & Resilience Outlook: Given the data, what are the long-term wear-and-tear expectations for the facility.

**Site Details:**
Name: ${p.dc_name || p.airport_name || 'N/A'}
Location: ${p.city}, ${p.state}, ${p.country}
Coordinates: ${p.lat}° N, ${p.lon}° E
Power Capacity: ${p.power_mw || 'N/A'} MW

**Solar Metrics:**
GHI: ${p.solar?.ghi_annual || 'N/A'} kWh/m²/year (${p.solar?.ghi || 'N/A'} kWh/m²/day)
Optimal Tilt: ${p.solar?.optimal_tilt || 'N/A'}°
Average Temp: ${p.solar?.avg_temp || 'N/A'}°C
Elevation: ${p.solar?.elevation || 'N/A'}m
Slope: ${p.solar?.slope || 'N/A'}°
Aspect: ${p.solar?.aspect || 'N/A'}°
AOD (Aerosols / Dust): ${p.solar?.aod || 'N/A'} (${p.solar?.aod_label || 'N/A'})
Cloud Cover: ${p.solar?.cloud_pct || 'N/A'}% (${p.solar?.cloud_label || 'N/A'})

**Wind Metrics:**
Average Wind Speed (100m): ${p.wind?.profile?.[100]?.ws || 'N/A'} m/s
Power Density (100m): ${p.wind?.pd100 || 'N/A'} W/m²
Capacity Factor: ${p.wind?.cf3_pct || 'N/A'}%
Ruggedness Index: ${p.wind?.rix || 'N/A'}

**Water Metrics:**
Annual Precipitation: ${p.water?.precip_annual || 'N/A'} mm
Water Stress Deficit: ${p.water?.deficit || 'N/A'} mm (${p.water?.deficit_label || 'N/A'})
Flood Risk: ${p.water?.flood_risk || 'N/A'}
Drought Condition (PDSI): ${p.water?.pdsi_label || 'N/A'}
Groundwater Storage Trend (GRACE LWE): ${p.water?.lwe || 'N/A'} cm (${p.water?.grace_label || 'N/A'})

Write the report now.
`;

        // 2. Fetch from Ollama
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1 } // low temp avoiding hallucinations
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        const markdownContent = data.response;

        // 3. Convert Markdown to HTML
        let htmlContent = await marked.parse(markdownContent);

        // 4. Generate HTML Template
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Site Analysis Report</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #111827;
                        line-height: 1.6;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                    h2 { color: #1d4ed8; margin-top: 30px; }
                    h3 { color: #2563eb; }
                    p, li { font-size: 14px; }
                    .header { text-align: right; font-size: 12px; color: #64748b; margin-bottom: 40px; }
                    ul { padding-left: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <strong>Generated:</strong> ${new Date().toLocaleDateString()}<br>
                    <strong>Site:</strong> ${p.dc_name || p.airport_name || 'N/A'}
                </div>
                ${htmlContent}
            </body>
            </html>
        `;

        // 5. Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        // We evaluate returning a Buffer instead of Uint8Array depending on node version, but page.pdf returns a Buffer inherently in Node.js
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        });
        await browser.close();

        // 6. Return PDF as response (Convert Uint8Array to Node Buffer for NextResponse compatibility)
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${(p.dc_name || p.airport_name || 'Site').replace(/\s+/g, '_')}_Analysis.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating PDF report:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to generate report', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
