export interface ReportResponse {
  asset_key: string;
  asset_name: string;
  asset_type: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  markdown_content: string;
  html_content: string;
  generated_at: string;
  cached: boolean;
}

/**
 * Check whether a cached report exists for this asset.
 * Returns null if no report has been generated yet.
 */
export async function getReport(assetKey: string): Promise<ReportResponse | null> {
  const res = await fetch(`/api/v1/dc-assessment/reports/${encodeURIComponent(assetKey)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json() as Promise<ReportResponse>;
}

/**
 * Generate (or return cached) report for an asset.
 * Pass forceRegenerate=true to bypass the cache and regenerate.
 */
export async function generateReport(
  payload: Record<string, unknown>,
  assetKey: string,
  assetType: string,
  forceRegenerate = false,
): Promise<ReportResponse> {
  const res = await fetch('/api/v1/dc-assessment/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      asset_key: assetKey,
      asset_type: assetType,
      force_regenerate: forceRegenerate,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Failed to generate report');
  }
  return res.json() as Promise<ReportResponse>;
}

/**
 * Trigger a browser download of the stored HTML report file.
 */
export function downloadReport(report: ReportResponse): void {
  const safeName = report.asset_name.replace(/\s+/g, '_').replace(/\//g, '-');
  const blob = new Blob([report.html_content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_Environmental_Assessment.html`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
