-- MarketIntelli Database Schema
-- Creates all tables matching SQLAlchemy models
-- Requires PostgreSQL 16+ with PostGIS extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- Dashboard Domain
-- ============================================================

CREATE TABLE IF NOT EXISTS installed_capacity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    capacity_mw DOUBLE PRECISION NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Geo Analytics Domain (PostGIS)
-- ============================================================

CREATE TABLE IF NOT EXISTS solar_potential_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    irradiance_kwh_m2 DOUBLE PRECISION NOT NULL,
    land_suitability_score DOUBLE PRECISION NOT NULL,
    area_sq_km DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_infrastructure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    infrastructure_type VARCHAR(100) NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326),
    capacity_mva DOUBLE PRECISION,
    congestion_level INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disaster_risk_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_type VARCHAR(100) NOT NULL,
    severity INTEGER NOT NULL,
    state VARCHAR(255) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326),
    description VARCHAR(1000) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Project Intelligence Domain
-- ============================================================

CREATE TABLE IF NOT EXISTS developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    headquarters VARCHAR(255) NOT NULL,
    total_capacity_mw DOUBLE PRECISION DEFAULT 0.0,
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    projects_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solar_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    capacity_mw DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL,
    developer_id UUID REFERENCES developers(id),
    commissioning_date TIMESTAMPTZ,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    issuing_authority VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    capacity_mw DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL,
    deadline TIMESTAMPTZ,
    awarded_to VARCHAR(255),
    winning_tariff DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Policy Intelligence Domain
-- ============================================================

CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    authority VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    state VARCHAR(255),
    summary TEXT DEFAULT '',
    effective_date TIMESTAMPTZ,
    document_url VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariff_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(255) NOT NULL,
    tariff_type VARCHAR(100) NOT NULL,
    rate_per_kwh DOUBLE PRECISION NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    expiry_date TIMESTAMPTZ,
    source VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subsidies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    authority VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    amount DOUBLE PRECISION,
    unit VARCHAR(50) DEFAULT 'INR/kW',
    status VARCHAR(50) DEFAULT 'active',
    disbursement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Alerts Domain
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    state VARCHAR(255),
    message TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    watch_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    alert_id UUID REFERENCES alerts(id),
    status VARCHAR(50) DEFAULT 'pending',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Data Center Intelligence Domain
-- ============================================================

CREATE TABLE IF NOT EXISTS data_center_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_company VARCHAR(255),
    headquarters VARCHAR(255),
    website VARCHAR(500),
    total_investment_usd DOUBLE PRECISION,
    annual_revenue_usd DOUBLE PRECISION,
    employee_count INTEGER,
    sustainability_rating VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_center_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES data_center_companies(id),
    name VARCHAR(500) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    location_detail VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    power_capacity_mw DOUBLE PRECISION DEFAULT 0.0,
    it_load_mw DOUBLE PRECISION,
    size_sqft DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(50) NOT NULL,
    tier_level VARCHAR(20),
    pue_target DOUBLE PRECISION,
    pue_actual DOUBLE PRECISION,
    current_renewable_pct DOUBLE PRECISION,
    target_renewable_pct DOUBLE PRECISION,
    cooling_type VARCHAR(50),
    water_consumption_kld DOUBLE PRECISION,
    commissioning_date TIMESTAMPTZ,
    expansion_plans TEXT,
    compliance_status VARCHAR(50),
    date_added TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Alembic version tracking table
-- ============================================================

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
