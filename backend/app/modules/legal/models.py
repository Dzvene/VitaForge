"""Legal document overrides.

One row per (doc, locale) that the admin has customized. Absent rows fall back
to the bundled defaults (see ``defaults.py``).
"""

from sqlalchemy import JSON, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class LegalDocument(Base, TimestampMixin):
    __tablename__ = "legal_documents"
    __table_args__ = (UniqueConstraint("doc", "locale", name="uq_legal_doc_locale"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doc: Mapped[str] = mapped_column(String(32), nullable=False)  # impressum/privacy/terms/cookies
    locale: Mapped[str] = mapped_column(String(8), nullable=False)  # en/ru/de
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ISO date string shown as "last updated" (matches the frontend's display).
    updated_on: Mapped[str] = mapped_column(String(32), nullable=False)
    # list[{"heading": str, "body": list[str]}]
    sections: Mapped[list] = mapped_column(JSON, nullable=False)
