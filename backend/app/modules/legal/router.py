"""Public legal documents — localized via Accept-Language. No auth."""

from fastapi import APIRouter, Query

from app.core.deps import DbSession
from app.core.i18n import current_locale
from app.modules.legal.schemas import LegalContentOut
from app.modules.legal.service import LegalService

router = APIRouter(prefix="/legal", tags=["legal"])


@router.get("/{doc}", response_model=LegalContentOut)
async def get_legal(
    doc: str,
    db: DbSession,
    locale: str | None = Query(default=None, max_length=8),
) -> LegalContentOut:
    """Return one legal document. Locale comes from ``?locale=`` if given, else
    the request's Accept-Language; unknown locales degrade to English."""
    return await LegalService(db).get(doc, locale or current_locale.get())
