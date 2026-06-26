"""Reminder preferences + push subscriptions. Owns two tables.

`reminder_prefs` is one row per user (the schedule). `push_subscriptions` is one
row per browser/device the user has granted notification permission on — a user
may have several (laptop + phone), and a subscription can silently expire, so the
sender prunes dead ones on a 404/410.
"""

from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class ReminderPrefs(Base, TimestampMixin):
    __tablename__ = "reminder_prefs"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Master switch — when false the scheduler skips this user entirely.
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # IANA zone (e.g. "Europe/Berlin"); the local clock the times below mean.
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    # Notification copy language (en/ru/de); set from the UI, since the scheduler
    # runs outside any request and has no Accept-Language to read.
    locale: Mapped[str] = mapped_column(String(8), nullable=False, default="en")

    weigh_in_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    weigh_in_time: Mapped[str] = mapped_column(String(5), nullable=False, default="08:00")
    log_meals_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    log_meals_time: Mapped[str] = mapped_column(String(5), nullable=False, default="20:00")

    # Last local date each reminder actually fired — dedupes to once per day and
    # survives restarts (the scheduler re-reads this every tick).
    last_weigh_sent_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_log_sent_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class PushSubscription(Base, TimestampMixin):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # The push service endpoint URL — globally unique per browser subscription.
    endpoint: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    # ECDH public key + auth secret the push service needs to encrypt payloads.
    p256dh: Mapped[str] = mapped_column(String(255), nullable=False)
    auth: Mapped[str] = mapped_column(String(255), nullable=False)
