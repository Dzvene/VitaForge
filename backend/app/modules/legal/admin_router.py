"""Admin: legal document management — edit any (doc, locale)."""

from fastapi import APIRouter

from app.core.deps import AdminUser, DbSession
from app.modules.legal.schemas import LegalContentOut, LegalContentUpdate
from app.modules.legal.service import LegalService

admin_router = APIRouter(prefix="/admin/legal", tags=["admin:legal"])


@admin_router.get("", response_model=list[LegalContentOut])
async def list_legal(admin: AdminUser, db: DbSession) -> list[LegalContentOut]:
    return await LegalService(db).list_all()


@admin_router.get("/{doc}/{locale}", response_model=LegalContentOut)
async def get_legal(doc: str, locale: str, admin: AdminUser, db: DbSession) -> LegalContentOut:
    return await LegalService(db).get(doc, locale)


@admin_router.put("/{doc}/{locale}", response_model=LegalContentOut)
async def update_legal(
    doc: str, locale: str, payload: LegalContentUpdate, admin: AdminUser, db: DbSession
) -> LegalContentOut:
    return await LegalService(db).upsert(doc, locale, payload)
