"""Legal document resolution: bundled defaults + admin DB overrides."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.legal.defaults import DEFAULT_LOCALE, DOCS, LOCALES, default_content
from app.modules.legal.models import LegalDocument
from app.modules.legal.schemas import LegalContentOut, LegalContentUpdate
from app.shared.exceptions import NotFoundError


class LegalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _norm_locale(locale: str) -> str:
        return locale if locale in LOCALES else DEFAULT_LOCALE

    async def _row(self, doc: str, locale: str) -> LegalDocument | None:
        return (
            await self.db.execute(
                select(LegalDocument).where(
                    LegalDocument.doc == doc, LegalDocument.locale == locale
                )
            )
        ).scalar_one_or_none()

    @staticmethod
    def _from_row(row: LegalDocument) -> LegalContentOut:
        return LegalContentOut(
            doc=row.doc,
            locale=row.locale,
            title=row.title,
            intro=row.intro,
            updated=row.updated_on,
            sections=row.sections,
            customized=True,
        )

    @staticmethod
    def _from_default(doc: str, locale: str) -> LegalContentOut:
        d = default_content(doc, locale)
        if d is None:
            raise NotFoundError("Unknown legal document")
        return LegalContentOut(
            doc=doc,
            locale=locale,
            title=d["title"],
            intro=d.get("intro"),
            updated=d["updated"],
            sections=d["sections"],
            customized=False,
        )

    async def get(self, doc: str, locale: str) -> LegalContentOut:
        """Public read: DB override if present, else the bundled default.

        Unknown locales degrade to English; an unknown doc is a 404.
        """
        if doc not in DOCS:
            raise NotFoundError("Unknown legal document")
        locale = self._norm_locale(locale)
        row = await self._row(doc, locale)
        return self._from_row(row) if row else self._from_default(doc, locale)

    async def list_all(self) -> list[LegalContentOut]:
        """Every (doc, locale) for the admin grid — override or default."""
        rows = {
            (r.doc, r.locale): r
            for r in (await self.db.execute(select(LegalDocument))).scalars()
        }
        out: list[LegalContentOut] = []
        for doc in DOCS:
            for locale in LOCALES:
                row = rows.get((doc, locale))
                out.append(self._from_row(row) if row else self._from_default(doc, locale))
        return out

    async def upsert(
        self, doc: str, locale: str, payload: LegalContentUpdate
    ) -> LegalContentOut:
        if doc not in DOCS or locale not in LOCALES:
            raise NotFoundError("Unknown legal document or locale")
        sections = [s.model_dump() for s in payload.sections]
        row = await self._row(doc, locale)
        if row is None:
            row = LegalDocument(
                doc=doc,
                locale=locale,
                title=payload.title,
                intro=payload.intro,
                updated_on=payload.updated,
                sections=sections,
            )
            self.db.add(row)
        else:
            row.title = payload.title
            row.intro = payload.intro
            row.updated_on = payload.updated
            row.sections = sections
        await self.db.commit()
        return await self.get(doc, locale)
