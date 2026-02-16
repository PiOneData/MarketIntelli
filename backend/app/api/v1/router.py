from fastapi import APIRouter

from app.domains.dashboard.routes.dashboard import router as dashboard_router
from app.domains.geo_analytics.routes.geo_analytics import router as geo_analytics_router
from app.domains.project_intelligence.routes.projects import router as projects_router
from app.domains.policy_intelligence.routes.policy import router as policy_router
from app.domains.alerts.routes.alerts import router as alerts_router
from app.domains.data_center_intelligence.routes.data_centers import router as data_centers_router

api_router = APIRouter()

api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(geo_analytics_router, prefix="/geo-analytics", tags=["Geo Analytics"])
api_router.include_router(projects_router, prefix="/projects", tags=["Project Intelligence"])
api_router.include_router(policy_router, prefix="/policy", tags=["Policy Intelligence"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(data_centers_router, prefix="/data-centers", tags=["Data Center Intelligence"])
