from fastapi import APIRouter

from app.domains.dashboard.routes.dashboard import router as dashboard_router
from app.domains.geo_analytics.routes.geo_analytics import router as geo_analytics_router
from app.domains.project_intelligence.routes.projects import router as projects_router
from app.domains.policy_intelligence.routes.policy import router as policy_router
from app.domains.alerts.routes.alerts import router as alerts_router
from app.domains.data_center_intelligence.routes.data_centers import router as data_centers_router
from app.domains.power_market.routes.power_market import router as power_market_router
from app.domains.finance.routes.power_trading import router as power_trading_router
from app.domains.solar_assessment.routes.solar_assessment import router as solar_assessment_router

api_router = APIRouter()

api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(geo_analytics_router, prefix="/geo-analytics", tags=["Geo Analytics"])
api_router.include_router(projects_router, prefix="/projects", tags=["Project Intelligence"])
api_router.include_router(policy_router, prefix="/policy", tags=["Policy Intelligence"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(data_centers_router, prefix="/data-centers", tags=["Data Center Intelligence"])
api_router.include_router(power_market_router, prefix="/power-market", tags=["Power Market Intelligence"])
api_router.include_router(power_trading_router, prefix="/finance", tags=["Finance – Power Trading"])
api_router.include_router(solar_assessment_router, prefix="/solar-assessment", tags=["Solar & Wind Assessment"])
