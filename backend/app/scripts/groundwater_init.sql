-- =============================================================================
-- groundwater_init.sql
-- SolarWindAssessment integration – Assessment Tab
--
-- PURPOSE
--   Creates (or verifies) the two tables needed for the Assessment tab:
--     1. groundwater_resources  – holds every feature from groundwater.geojson
--     2. google_service_credentials – holds the Google Cloud service-account key
--
-- USAGE
--   psql -h <host> -U <user> -d <db> -f groundwater_init.sql
--
--   The INSERT block at the bottom shows how to load the GeoJSON directly from
--   a $groundwater_json psql variable.  Replace the placeholder with the actual
--   GeoJSON string, or pass it in via \set in a shell script.
-- =============================================================================

-- Enable PostGIS if not already present (requires superuser once per database)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Table: groundwater_resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groundwater_resources (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gml_id                          VARCHAR(255)   NOT NULL DEFAULT '',
    objectid                        INTEGER,
    block                           VARCHAR(255)   NOT NULL DEFAULT '',
    tehsil                          VARCHAR(255)   NOT NULL DEFAULT '',
    district                        VARCHAR(255)   NOT NULL DEFAULT '',
    gwr_2011_2                      FLOAT,
    code                            FLOAT,
    -- "Over Exploited" | "Critical" | "Semi-Critical" | "Safe" | "Saline"
    classification                  VARCHAR(100)   NOT NULL DEFAULT '',
    net_annual_gw_availability      FLOAT,
    annual_gw_draft_irrigation      FLOAT,
    -- Stage of Ground Water Development (%)
    stage_of_gw_development         FLOAT,
    annual_gw_draft_domestic_industrial FLOAT,
    annual_gw_draft_total           FLOAT,
    annual_replenishable_gw_total   FLOAT,
    state_name                      VARCHAR(255)   NOT NULL DEFAULT '',
    natural_discharge_non_monsoon   FLOAT,
    st_area_shape                   FLOAT,
    st_length_shape                 FLOAT,
    -- Geometry stored as MultiPolygon in EPSG:4326
    geometry                        GEOMETRY(MultiPolygon, 4326),
    created_at                      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Useful indexes for the map queries
CREATE INDEX IF NOT EXISTS idx_groundwater_state_name
    ON groundwater_resources (state_name);

CREATE INDEX IF NOT EXISTS idx_groundwater_classification
    ON groundwater_resources (classification);

CREATE INDEX IF NOT EXISTS idx_groundwater_district
    ON groundwater_resources (district);

CREATE INDEX IF NOT EXISTS idx_groundwater_geometry
    ON groundwater_resources USING GIST (geometry);

-- ---------------------------------------------------------------------------
-- Table: google_service_credentials
-- ---------------------------------------------------------------------------
-- Security note: private_key is stored as plain TEXT.
-- In production ENCRYPT this column (e.g. pgcrypto / KMS / Vault).
-- The backend reads the active row and reconstructs a service-account JSON dict
-- in memory; the private key never leaves the backend process.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_service_credentials (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                            VARCHAR(255)   NOT NULL,          -- human label
    credential_type                 VARCHAR(50)    NOT NULL DEFAULT 'service_account',
    project_id                      VARCHAR(255)   NOT NULL DEFAULT '',
    private_key_id                  VARCHAR(255)   NOT NULL DEFAULT '',
    -- RSA private key in PEM format – ENCRYPT IN PRODUCTION
    private_key                     TEXT           NOT NULL DEFAULT '',
    client_email                    VARCHAR(255)   NOT NULL DEFAULT '',
    client_id                       VARCHAR(255)   NOT NULL DEFAULT '',
    auth_uri                        VARCHAR(500)   NOT NULL DEFAULT 'https://accounts.google.com/o/oauth2/auth',
    token_uri                       VARCHAR(500)   NOT NULL DEFAULT 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url     VARCHAR(500)   NOT NULL DEFAULT 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url            VARCHAR(500)   NOT NULL DEFAULT '',
    is_active                       BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at                      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Only one active credential at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_creds_single_active
    ON google_service_credentials (is_active)
    WHERE is_active = TRUE;

-- =============================================================================
-- INSERT: load groundwater.geojson into groundwater_resources
-- =============================================================================
-- Replace the JSON literal below with the actual contents of groundwater.geojson,
-- OR use a psql variable:
--
--   \set gw_json `cat /path/to/groundwater.geojson`
--   :gw_json   (use the variable as shown in the WITH block below)
--
-- The query below unpacks each Feature in the FeatureCollection and calls
-- ST_GeomFromGeoJSON() to convert the geometry object.
-- =============================================================================

/*
-- EXAMPLE USAGE (uncomment and fill in the JSON):

WITH raw AS (
    SELECT value AS feature
    FROM   jsonb_array_elements(
               '<PASTE_FULL_GEOJSON_HERE>'::jsonb -> 'features'
           )
)
INSERT INTO groundwater_resources (
    gml_id,
    objectid,
    block,
    tehsil,
    district,
    gwr_2011_2,
    code,
    classification,
    net_annual_gw_availability,
    annual_gw_draft_irrigation,
    stage_of_gw_development,
    annual_gw_draft_domestic_industrial,
    annual_gw_draft_total,
    annual_replenishable_gw_total,
    state_name,
    natural_discharge_non_monsoon,
    st_area_shape,
    st_length_shape,
    geometry
)
SELECT
    COALESCE(feature -> 'properties' ->> 'GmlID',               ''),
    (feature -> 'properties' ->> 'objectid')::INTEGER,
    COALESCE(feature -> 'properties' ->> 'BLOCK',               ''),
    COALESCE(feature -> 'properties' ->> 'TEHSIL',              ''),
    COALESCE(feature -> 'properties' ->> 'DISTRICT',            ''),
    (feature -> 'properties' ->> 'GWR_2011_2')::FLOAT,
    (feature -> 'properties' ->> 'CODE')::FLOAT,
    COALESCE(feature -> 'properties' ->> 'CLASS',               ''),
    (feature -> 'properties' ->> 'Net_Annual_Ground_Water_Availability')::FLOAT,
    (feature -> 'properties' ->> 'Annual_Ground_Water_Draft_Irrigation')::FLOAT,
    (feature -> 'properties' ->> 'Stage_of_Ground_Water__Development____')::FLOAT,
    (feature -> 'properties' ->> 'Annual_Ground_Water_Draft_Domestic_and_industrial_uses')::FLOAT,
    (feature -> 'properties' ->> 'Annual_Ground_Water_Draft_Total')::FLOAT,
    (feature -> 'properties' ->> 'Annual_Replenishable_Ground_Water_Resource_Total')::FLOAT,
    COALESCE(feature -> 'properties' ->> 'State_Name',          ''),
    (feature -> 'properties' ->> 'Natural_Discharge_during_non-monsoon_season')::FLOAT,
    (feature -> 'properties' ->> 'st_area_shape_')::FLOAT,
    (feature -> 'properties' ->> 'st_length_shape_')::FLOAT,
    ST_SetSRID(
        ST_GeomFromGeoJSON(feature -> 'geometry'),
        4326
    )
FROM raw
ON CONFLICT DO NOTHING;

*/

-- =============================================================================
-- INSERT: store Google service-account credential
-- =============================================================================
-- Fill in the values from your downloaded service-account JSON file.
-- Only one row may have is_active = TRUE at a time (enforced by unique index above).
-- =============================================================================

/*
-- EXAMPLE USAGE (uncomment and fill in your values):

INSERT INTO google_service_credentials (
    name,
    credential_type,
    project_id,
    private_key_id,
    private_key,
    client_email,
    client_id,
    auth_uri,
    token_uri,
    auth_provider_x509_cert_url,
    client_x509_cert_url,
    is_active
) VALUES (
    'SolarWindAssessment – production',
    'service_account',
    'YOUR_PROJECT_ID',
    'YOUR_PRIVATE_KEY_ID',
    '-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END RSA PRIVATE KEY-----\n',
    'your-service-account@your-project.iam.gserviceaccount.com',
    'YOUR_CLIENT_ID',
    'https://accounts.google.com/o/oauth2/auth',
    'https://oauth2.googleapis.com/token',
    'https://www.googleapis.com/oauth2/v1/certs',
    'https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com',
    TRUE
);

*/
