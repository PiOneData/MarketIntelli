import { AssetFeature } from '@/types/dc';

export const GW_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
    'Safe': { bg: 'rgba(16,185,129,0.1)', text: '#065f46', border: '#10b981', accent: '#10b981' },
    'Semi-Critical': { bg: 'rgba(245,158,11,0.1)', text: '#78350f', border: '#f59e0b', accent: '#f59e0b' },
    'Critical': { bg: 'rgba(249,115,22,0.1)', text: '#7c2d12', border: '#f97316', accent: '#f97316' },
    'Over Exploited': { bg: 'rgba(239,68,68,0.1)', text: '#7f1d1d', border: '#ef4444', accent: '#ef4444' },
};

export const RATING_COLORS: Record<string, { bg: string; accent: string; border: string }> = {
    'EXCELLENT': { bg: 'rgba(16,185,129,0.12)', accent: '#059669', border: '#10b981' },
    'GOOD': { bg: 'rgba(16,185,129,0.08)', accent: '#10b981', border: '#6ee7b7' },
    'VIABLE': { bg: 'rgba(245,158,11,0.1)', accent: '#d97706', border: '#f59e0b' },
    'MODERATE': { bg: 'rgba(249,115,22,0.1)', accent: '#ea580c', border: '#f97316' },
    'POOR': { bg: 'rgba(239,68,68,0.1)', accent: '#dc2626', border: '#ef4444' },
    'ABUNDANT': { bg: 'rgba(16,185,129,0.12)', accent: '#059669', border: '#10b981' },
    'ADEQUATE': { bg: 'rgba(59,130,246,0.1)', accent: '#2563eb', border: '#3b82f6' },
    'SCARCE': { bg: 'rgba(239,68,68,0.1)', accent: '#dc2626', border: '#ef4444' },
};

export function getRatingColor(rating: string) {
    return RATING_COLORS[rating?.toUpperCase()] ?? {
        bg: 'rgba(107,114,128,0.1)', accent: '#6b7280', border: '#9ca3af',
    };
}

export function getGWColor(category: string) {
    return GW_COLORS[category] ?? {
        bg: 'rgba(107,114,128,0.1)', text: '#374151', border: '#6b7280', accent: '#6b7280',
    };
}

export function getMarkerColor(feature: AssetFeature): string {
    const gw = feature.properties.local_analysis?.groundwater as any;
    const gwCat = gw?.category;
    if (gwCat === 'Safe') return '#10b981';
    if (gwCat === 'Semi-Critical') return '#f59e0b';
    if (gwCat === 'Critical') return '#f97316';
    if (gwCat === 'Over Exploited') return '#ef4444';
    return '#6b7280';
}

export function getOverallRatingColor(rating: string): string {
    const map: Record<string, string> = {
        'EXCELLENT': '#059669', 'GOOD': '#10b981', 'VIABLE': '#d97706',
        'MODERATE': '#ea580c', 'POOR': '#dc2626',
    };
    return map[rating] ?? '#6b7280';
}

export function formatNum(val: number | null | undefined, decimals = 1): string {
    if (val == null || isNaN(val as number)) return 'N/A';
    return (val as number).toFixed(decimals);
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getDCId(feature: AssetFeature): number {
    return feature.properties.slno;
}

export function getGWCategory(feature: AssetFeature): string {
    const gw = feature.properties.local_analysis?.groundwater as any;
    return gw?.category ?? 'No Data';
}

export function getRiskDescription(category: string): string {
    const map: Record<string, string> = {
        'Safe': 'Extraction is well within sustainable limits. Low risk.',
        'Semi-Critical': 'Elevated extraction, still within bounds. Monitor trends.',
        'Critical': 'Approaching maximum sustainable levels. High aquifer stress.',
        'Over Exploited': 'Usage exceeds natural recharge. High sustainability risk.',
    };
    return map[category] ?? 'No groundwater data available for this location.';
}

export function getWindGradeColor(grade: string): string {
    const map: Record<string, string> = {
        'A': '#10b981', 'B': '#3b82f6', 'C': '#8b5cf6',
        'D': '#f59e0b', 'E': '#f97316', 'F': '#ef4444',
    };
    return map[grade] ?? '#6b7280';
}
