"""App-config admin endpoints (spec §6)."""

from dataclasses import asdict

from fastapi import APIRouter

from app.core.deps import AdminUser, DbSession
from app.modules.app_config.schemas import ParamsUpdate, ParamsView
from app.modules.app_config.service import AppConfigService

admin_router = APIRouter(prefix="/admin/params", tags=["admin:params"])


@admin_router.get("", response_model=ParamsView)
async def get_params(admin: AdminUser, db: DbSession) -> ParamsView:
    svc = AppConfigService(db)
    effective = await svc.effective_app_params()
    return ParamsView(effective=asdict(effective), overrides=await svc.get_overrides())


@admin_router.put("", response_model=ParamsView)
async def update_params(payload: ParamsUpdate, admin: AdminUser, db: DbSession) -> ParamsView:
    svc = AppConfigService(db)
    await svc.set_overrides(payload.overrides)
    effective = await svc.effective_app_params()
    return ParamsView(effective=asdict(effective), overrides=await svc.get_overrides())
