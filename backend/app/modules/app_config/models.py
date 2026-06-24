"""App-level configuration (spec §6 — params overridable at the app level).

Owns `app_params`: a single row (id=1) holding whitelisted parameter overrides
applied on top of the code defaults, beneath any per-user override. Admin-managed.
"""

from sqlalchemy import JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class AppParams(Base, TimestampMixin):
    __tablename__ = "app_params"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
