# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker (recommended)
```bash
docker-compose up -d          # Start all services (backend :9001, frontend :9002, redis :9004)
docker-compose down           # Stop all services
docker-compose up -d --build  # Rebuild images after package/dep changes
```

### Backend (Python 3.11 + FastAPI)
```bash
cd backend
pip install -e .              # Install dependencies from pyproject.toml
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # Dev server
pytest                        # Run tests (asyncio_mode=auto)
ruff check .                  # Lint
ruff format .                 # Format
mypy app/                     # Type check
```

### Frontend (Node 22 + Vite + React 19)
```bash
cd frontend
npm install                   # Install dependencies
npm run dev                   # Dev server on http://localhost:3000
npm run build                 # tsc -b && vite build (type-checks first)
npm run type-check            # tsc --noEmit (no emit, just check)
npm run lint                  # ESLint
```

> **Note**: Docker volume mounts `./backend:/app` and `./frontend/src:/app/src`. Changes to `index.html`, `package.json`, or `pyproject.toml` require `docker-compose up -d --build`.

---

## Architecture

### Backend

**Domain-driven layout** under `backend/app/domains/`:
```
backend/app/
├── api/v1/router.py          # Registers all domain routers
├── core/
│   ├── config.py             # Pydantic Settings (env vars)
│   ├── security.py           # JWT (python-jose) + bcrypt
│   └── celery_app.py         # Celery + Redis config
├── db/
│   ├── base.py               # SQLAlchemy DeclarativeBase (MappedAsDataclass)
│   └── session.py            # AsyncSession factory (SQLAlchemy 2.0 async)
├── domains/<name>/
│   ├── routes/               # FastAPI APIRouter endpoints
│   ├── services/             # Business logic
│   ├── models/               # SQLAlchemy ORM models
│   └── schemas/              # Pydantic request/response schemas
├── tasks/                    # Celery background tasks
└── main.py                   # App factory + lifespan startup/shutdown
```

Each domain follows the same pattern: `routes → services → models/schemas`. Add a new domain by creating the folder structure and registering the router in `api/v1/router.py`.

**Database**: PostgreSQL via `asyncpg` (async) + Alembic migrations. All session usage via `Depends(get_db)` → `AsyncSession`. Models inherit from `Base(DeclarativeBase, MappedAsDataclass)`.

**Background tasks**: Celery + Redis. Scheduler launches news and compliance scrapes twice daily at startup in `main.py`.

**Optional heavy dependencies** (earthengine-api, openmeteo-requests, etc.) must be **lazily imported** inside functions — do not import at module level, as these are not guaranteed to be installed.

### Frontend

**Routing** (`src/App.tsx`):
- Layout: `MainLayout` wraps all routes via `<Outlet>`
- Pattern: `/section/:subsection` (e.g., `/geo-analytics/:section`)
- Page components receive `useParams()` to render per-section content

**State management**:
- Server state: `@tanstack/react-query` (staleTime=0, refetchOnWindowFocus=true)
- UI state: local `useState` in components
- API client: Axios instance in `src/api/` (base URL: `/api/v1`)

**Component conventions**:
- Pages: `src/pages/`
- Feature components: `src/components/<feature-name>/`
- Shared API layer: `src/api/<domain>.ts`

**TypeScript is strict** (`tsconfig.json`):
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noUncheckedIndexedAccess: true`
- Path alias: `@/*` → `src/*`
- **Never use `AreaChart` from recharts directly** — use `ComposedChart` with `Area` child instead (AreaChart cannot combine with Line elements)

### Key Data Flow

1. Frontend calls `POST /api/v1/solar-assessment/analyze` → backend `AssessmentService.analyze(lat, lon)` → Google Earth Engine (optional, returns 503 if credentials absent)
2. Live weather: `POST /api/v1/solar-assessment/live-weather` → Open-Meteo API (lazy import, returns 503 if packages missing)
3. GeoJSON data: `GET /api/v1/solar-assessment/data/wind-solar-data` → serves `backend/data/wind_solar_data.geojson` via FileResponse
4. Datacenter markers: served from `frontend/public/datacenters.geojson` via Vite static

---

## Environment Variables

Required in `backend/.env` (see `.env.example`):
- `DATABASE_URL` — async PostgreSQL: `postgresql+asyncpg://...`
- `SYNC_DATABASE_URL` — sync PostgreSQL for Alembic: `postgresql+psycopg2://...`
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `SECRET_KEY` — JWT signing key
- `CORS_ORIGINS` — JSON list of allowed origins

---

## Solar & Wind Assessment Feature

The `/geo-analytics/assessment` tab renders a full renewable energy site analysis tool:
- **`SolarWindAssessmentPage`** — orchestrates map ↔ report view switching, caches analysis in localStorage
- **`SolarWindMap`** — MapLibre GL satellite map with wind/solar heatmap layers and datacenter markers; fires `onLocationSelect(lat, lon)` on click
- **`SolarWindReport`** — multi-tab dashboard (datacenter info, wind analysis, solar analysis, hydrology) with recharts charts, yield simulator, and live hub-height weather matrix

Earth Engine credentials (`GOOGLE_APPLICATION_CREDENTIALS` or service account JSON) must be configured for the `/analyze` endpoint to return real data. Without credentials, it returns HTTP 503 gracefully.
