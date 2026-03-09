export interface WindProfile {
    ws: number;   // wind speed m/s
    pd: number;   // power density W/m²
    ad: number;   // air density
}

export interface SolarAssessment {
    ghi: number;              // daily GHI kWh/m²/day
    ghi_annual: number;       // annual kWh/m²/yr
    gti: number;              // global tilted irradiation kWh/m²/day
    pvout: number;            // daily PVOUT kWh/kWp/day
    pvout_annual: number;     // annual PVOUT kWh/kWp/yr
    optimal_tilt: number;
    avg_temp: number;
    elevation: number;
    monthly: number[];        // 12 months pvout values
    seasonal_range: number;
    seasonal_label: string;   // e.g. 'High, Strong Monsoon Dip'
    aod: number;              // aerosol optical depth
    aod_label: string;
    cloud_pct: number;        // cloud cover fraction in percentage
    cloud_label: string;
    era5_ghi: number;         // cross-validated GHI from ERA5
    era5_agreement: number;
    slope: number;
    aspect: number;
    best_month: string;
    worst_month: string;
    score: number;
    rating: string;
}

export interface WindAssessment {
    profile: {
        '10': WindProfile;
        '50': WindProfile;
        '100': WindProfile;
        '150': WindProfile;
        '200': WindProfile;
    };
    cf3: number;
    cf3_pct: number;
    rix: number;
    shear_alpha: number;
    elevation: number;
    slope: number;
    pd100: number;
    annual_mwh_2mw: number;
    grade: string;
    grade_label: string;
    score: number;
    rating: string;
}

export interface WaterAssessment {
    precip_daily: number;
    precip_annual: number;
    occurrence: number;
    flood_risk: string;
    soil_0_10: number;
    soil_10_40: number;
    soil_40_100: number;
    root_zone: number;
    deficit: number;
    deficit_label: string;
    runoff: number;
    pet: number;
    aet: number;
    aridity: number;
    pdsi: number;
    pdsi_label: string;
    lwe: number;
    grace_label: string;
    ndwi: number;
    score: number;
    rating: string;
}

export interface Powerhouse {
    name: string;
    dist_km: number | null;
    cap_mw: number | null;
    energy_mu: number | null;
    river: string;
    type: string;
    class: string;
    completion_year: number | null;
}

export interface Groundwater {
    block: string;
    district: string;
    category: 'Safe' | 'Semi-Critical' | 'Critical' | 'Over Exploited' | string;
    ext_pct: number;
    risk_label?: string;            // Added for airports
    replenishable_mcm?: number;     // Added for airports (vs replenishable_total)
    avail_mcm: number;
    draft_total_mcm: number;
    replenishable_total?: number;   // Maintained for DCs
    irrigation_draft: number;
    industrial_draft: number;
    natural_discharge: number;
}

export type AssetType = 'datacenter' | 'airport';

export interface AssetProperties {
    slno: number;

    // Shared / Equivalent Base Fields
    city: string;
    state: string;
    lat: number;
    lon: number;
    overall_score: number;
    overall_rating: string;

    // ---------------------------------
    // Data Center Specific Fields
    // ---------------------------------
    dc_name?: string;
    company?: string;
    url?: string;
    address?: string;
    postal?: string;
    market?: string;
    tier_design?: string;
    power_mw?: string | number;
    whitespace?: string;

    // ---------------------------------
    // Airport Specific Fields
    // ---------------------------------
    airport_name?: string;
    iata_code?: string | null;
    official_website?: string | null;
    pincode?: string;
    type?: string;           // e.g. "International", "Military"
    status?: string;         // e.g. "Operational"

    operations?: {
        annual_passengers_mn: string | null;
        annual_flight_movements: string | null;
        avg_daily_departures: string | null;
        avg_daily_arrivals: string | null;
        cargo_capacity_mtpa: string | null;
        actual_cargo_handled_mt: string | null;
        no_of_runways: string | null;
        no_of_terminals: string | null;
        checkin_counters: string | null;
        immigration_desks: string | null;
        baggage_carousels: string | null;
        lounges: string | null;
        wifi: string | null;
        power_consumption_mw: string | null;
        power_mode_renewables: string | null;
        special_assistance: string | null;
        key_vendors_operators: string | null;
        operator_concessionaire: string | null;
    };

    green_energy?: {
        solar_capacity_installed_mw: string | null;
        annual_generation_mu: string | null;
        annual_consumption_mu: string | null;
        pct_green_coverage: string | null;
        green_energy_sources: string | null;
        carbon_neutral_aci_level: string | null;
    };

    is_notable_green?: boolean;
    notable_green?: unknown;

    // ---------------------------------
    // Assessment Shared Fields
    // ---------------------------------
    solar: SolarAssessment;
    wind: WindAssessment;
    water: WaterAssessment;
    local_analysis: {
        powerhouse: Powerhouse;
        groundwater: Groundwater | Record<string, never>;
    };
}

export interface AssetFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lon, lat]
    };
    properties: AssetProperties;
}

export interface AssetGeoJSON {
    type: 'FeatureCollection';
    metadata?: {
        generated_at: string;
        description: string;
        radius_km: number;
        total_features: number;
    };
    features: AssetFeature[];
}
