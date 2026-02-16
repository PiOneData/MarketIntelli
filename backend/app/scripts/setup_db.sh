#!/bin/bash
# MarketIntelli Database Setup Script
#
# Sets up the PostgreSQL database by:
# 1. Creating all tables (init_db.sql)
# 2. Importing data from dc_118.csv (via csv_to_sql.py)
#
# Usage:
#   DB_HOST=20.40.61.170 DB_PORT=9003 ./setup_db.sh
#
# Environment variables (with defaults):
#   DB_HOST     - PostgreSQL host (default: localhost)
#   DB_PORT     - PostgreSQL port (default: 5432)
#   DB_USER     - PostgreSQL user (default: postgres)
#   DB_PASSWORD - PostgreSQL password (default: marketintelli123)
#   DB_NAME     - Database name (default: marketintelli)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-marketintelli123}"
DB_NAME="${DB_NAME:-marketintelli}"

export PGPASSWORD="$DB_PASSWORD"

echo "=== MarketIntelli Database Setup ==="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo ""

# Step 1: Create tables
echo "[1/2] Creating database tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$SCRIPT_DIR/init_db.sql" 2>&1

echo ""

# Step 2: Generate and import seed data
echo "[2/2] Importing data from dc_118.csv..."
python3 "$SCRIPT_DIR/csv_to_sql.py" > /tmp/marketintelli_seed.sql
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f /tmp/marketintelli_seed.sql 2>&1

echo ""

# Verify
echo "=== Verification ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'Tables' as entity, count(*) as count FROM information_schema.tables WHERE table_schema='public'
UNION ALL
SELECT 'Companies', count(*) FROM data_center_companies
UNION ALL
SELECT 'Facilities', count(*) FROM data_center_facilities;
"

echo ""
echo "=== Setup Complete ==="
