"""Weekly coaching summary email — sent every Sunday morning."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import Date, ForeignKey, Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import AsyncSessionLocal
from app.core.email import send_email
from app.shared.base_model import Base, TimestampMixin

_log = logging.getLogger(__name__)


class WeeklyEmailSend(Base, TimestampMixin):
    __tablename__ = "weekly_email_sends"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sent_on: Mapped[date] = mapped_column(Date, nullable=False)


async def _send_for_user(db: AsyncSession, user_id: int, email: str, full_name: str | None, tz_str: str) -> None:
    try:
        tz = ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, Exception):
        tz = ZoneInfo("UTC")

    from datetime import datetime
    local_now = datetime.now(tz)
    today = local_now.date()
    week_start = today - timedelta(days=7)

    # Check already sent this week
    sent = await db.scalar(
        select(WeeklyEmailSend.id).where(
            WeeklyEmailSend.user_id == user_id,
            WeeklyEmailSend.sent_on >= week_start,
        )
    )
    if sent:
        return

    # Collect diary stats for the last 7 days
    from app.modules.diary.models import DiaryEntry
    from app.modules.foods.models import Food
    from app.modules.weight.models import WeightLog

    # Join diary with foods to compute kcal per entry
    diary_rows = (
        await db.execute(
            select(DiaryEntry.entry_date, DiaryEntry.grams, Food.kcal_100g).join(
                Food, Food.id == DiaryEntry.food_id
            ).where(
                DiaryEntry.user_id == user_id,
                DiaryEntry.entry_date >= week_start,
                DiaryEntry.entry_date <= today,
            )
        )
    ).all()

    weight_rows = (
        await db.scalars(
            select(WeightLog).where(
                WeightLog.user_id == user_id,
                WeightLog.logged_on >= week_start,
                WeightLog.logged_on <= today,
            ).order_by(WeightLog.logged_on)
        )
    ).all()

    days_logged = len({row.entry_date for row in diary_rows})
    if days_logged == 0:
        return  # No data — nothing useful to say

    from app.modules.nutrition.service import NutritionService
    target = await NutritionService(db).target(user_id)
    target_kcal = target.target_calories if target else 2000

    total_kcal = sum((row.grams / 100) * row.kcal_100g for row in diary_rows)
    avg_kcal = total_kcal / days_logged if days_logged else 0
    delta = round(avg_kcal - target_kcal)

    weight_note = ""
    if len(weight_rows) >= 2:
        change = weight_rows[-1].weight_kg - weight_rows[0].weight_kg
        sign = "+" if change > 0 else ""
        weight_note = f"{sign}{change:.1f} kg over the week"

    name = full_name or email.split("@")[0]
    subject = f"VitaForge weekly: {days_logged}/7 days logged"

    delta_str = f"+{delta}" if delta > 0 else str(delta)
    text = f"""Hi {name},

Here's your VitaForge week in review:

📅 Days logged: {days_logged}/7
🔥 Avg calories: {round(avg_kcal)} kcal/day (target: {round(target_kcal)}, delta: {delta_str})
{f"⚖️  Weight: {weight_note}" if weight_note else ""}

{"Great consistency this week! Keep it up." if days_logged >= 5 else "Try to log every day for the most accurate calibration."}

Keep tracking,
VitaForge
"""

    html = f"""<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:20px;margin:0 0 20px;color:#111">Weekly check-in, {name}!</h1>
  <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:0 0 20px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:#fff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#3b82f6">{days_logged}/7</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Days logged</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#{"ef4444" if abs(delta) > 200 else "22c55e"}">{round(avg_kcal)}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Avg kcal/day ({delta_str} vs target)</div>
      </div>
    </div>
    {f'<div style="margin-top:12px;background:#fff;border-radius:8px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:600;color:#8b5cf6">{weight_note}</div><div style="font-size:12px;color:#666;margin-top:4px">Weight change</div></div>' if weight_note else ""}
  </div>
  <p style="font-size:14px;color:#555;line-height:1.6">{"Great consistency! Logging every day gives VitaForge the data it needs to calibrate your real metabolism." if days_logged >= 5 else "Try to log every day — even rough estimates help the calibration algorithm."}</p>
  <p style="margin-top:20px"><a href="{__import__('app.core.config', fromlist=['settings']).settings.FRONTEND_BASE_URL}/dashboard" style="background:#3b82f6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">Open VitaForge</a></p>
  <p style="font-size:12px;color:#999;margin-top:24px">VitaForge · calibrate · track · adapt</p>
</div>"""

    await send_email(email, subject, text=text, html=html)

    # Mark sent
    send_record = WeeklyEmailSend(user_id=user_id, sent_on=today)
    db.add(send_record)
    await db.commit()


async def _weekly_tick() -> None:
    from datetime import datetime

    async with AsyncSessionLocal() as db:
        from app.modules.auth.models import User
        from app.modules.reminders.models import ReminderPrefs

        # Find users with reminders prefs (has timezone) who have email enabled
        rows = (
            await db.execute(
                select(User.id, User.email, User.full_name, ReminderPrefs.timezone, ReminderPrefs.enabled)
                .join(ReminderPrefs, ReminderPrefs.user_id == User.id)
                .where(User.is_active == True, User.email_verified == True)
            )
        ).all()

        for row in rows:
            user_id, email, full_name, tz_str, rem_enabled = row
            try:
                tz = ZoneInfo(tz_str or "UTC")
            except Exception:
                tz = ZoneInfo("UTC")

            local_now = datetime.now(tz)
            # Only send on Sunday (weekday 6) between 8am and 10am local time
            if local_now.weekday() != 6:
                continue
            if not (8 <= local_now.hour < 10):
                continue

            try:
                await _send_for_user(db, user_id, email, full_name, tz_str or "UTC")
            except Exception:
                _log.exception("weekly email failed for user_id=%s", user_id)


async def run_weekly_email_scheduler() -> None:
    _log.info("weekly email scheduler started (tick=3600s)")
    while True:
        try:
            await _weekly_tick()
        except asyncio.CancelledError:
            raise
        except Exception:
            _log.exception("weekly email tick failed")
        await asyncio.sleep(3600)
