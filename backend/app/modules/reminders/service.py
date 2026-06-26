"""Reminder preferences, subscriptions, and due-reminder computation."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.diary.service import DiaryService
from app.modules.reminders.models import DevicePushToken, PushSubscription, ReminderPrefs
from app.modules.reminders.schemas import PrefsIn, PrefsOut, SubscriptionIn
from app.modules.weight.service import WeightService

_log = logging.getLogger(__name__)


@dataclass
class DueReminder:
    prefs: ReminderPrefs
    kind: str  # "weigh_in" | "log_meals"
    local_date: date
    should_send: bool  # False = already done today; mark resolved, don't notify


def _safe_zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        return ZoneInfo("UTC")


class ReminderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ----- preferences -----

    async def get_or_create(self, user_id: int) -> ReminderPrefs:
        prefs = await self.db.get(ReminderPrefs, user_id)
        if prefs is None:
            prefs = ReminderPrefs(user_id=user_id)
            self.db.add(prefs)
            await self.db.commit()
            await self.db.refresh(prefs)
        return prefs

    async def update_prefs(self, user_id: int, payload: PrefsIn) -> ReminderPrefs:
        prefs = await self.get_or_create(user_id)
        prefs.enabled = payload.enabled
        prefs.timezone = payload.timezone
        prefs.locale = payload.locale
        prefs.weigh_in_enabled = payload.weigh_in_enabled
        prefs.weigh_in_time = payload.weigh_in_time
        prefs.log_meals_enabled = payload.log_meals_enabled
        prefs.log_meals_time = payload.log_meals_time

        # Don't retro-fire: if a reminder's time has already passed in the user's
        # local day at save time, treat today as already handled so the first
        # nudge lands tomorrow rather than the instant they hit "save".
        local = datetime.now(tz=UTC).astimezone(_safe_zone(prefs.timezone))
        hm = local.strftime("%H:%M")
        if hm >= prefs.weigh_in_time:
            prefs.last_weigh_sent_on = local.date()
        if hm >= prefs.log_meals_time:
            prefs.last_log_sent_on = local.date()

        await self.db.commit()
        await self.db.refresh(prefs)
        return prefs

    @staticmethod
    def to_out(prefs: ReminderPrefs) -> PrefsOut:
        return PrefsOut(
            enabled=prefs.enabled,
            timezone=prefs.timezone,
            locale=prefs.locale,
            weigh_in_enabled=prefs.weigh_in_enabled,
            weigh_in_time=prefs.weigh_in_time,
            log_meals_enabled=prefs.log_meals_enabled,
            log_meals_time=prefs.log_meals_time,
        )

    # ----- subscriptions -----

    async def save_subscription(self, user_id: int, payload: SubscriptionIn) -> None:
        existing = (
            await self.db.execute(
                select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
            )
        ).scalar_one_or_none()
        if existing is None:
            self.db.add(
                PushSubscription(
                    user_id=user_id,
                    endpoint=payload.endpoint,
                    p256dh=payload.keys.p256dh,
                    auth=payload.keys.auth,
                )
            )
        else:
            # A re-subscribe (e.g. key rotation, or another user on this browser).
            existing.user_id = user_id
            existing.p256dh = payload.keys.p256dh
            existing.auth = payload.keys.auth
        await self.db.commit()

    async def remove_subscription(self, user_id: int, endpoint: str) -> None:
        await self.db.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id, PushSubscription.endpoint == endpoint
            )
        )
        await self.db.commit()

    async def remove_subscription_by_id(self, sub_id: int) -> None:
        await self.db.execute(delete(PushSubscription).where(PushSubscription.id == sub_id))
        await self.db.commit()

    async def list_subscriptions(self, user_id: int) -> list[PushSubscription]:
        return list(
            (
                await self.db.execute(
                    select(PushSubscription).where(PushSubscription.user_id == user_id)
                )
            )
            .scalars()
            .all()
        )

    async def count_subscriptions(self, user_id: int) -> int:
        return len(await self.list_subscriptions(user_id))

    # ----- native device tokens (APNs / FCM) -----

    async def register_device(self, user_id: int, platform: str, token: str) -> None:
        existing = (
            await self.db.execute(select(DevicePushToken).where(DevicePushToken.token == token))
        ).scalar_one_or_none()
        if existing is None:
            self.db.add(DevicePushToken(user_id=user_id, platform=platform, token=token))
        else:
            # Same physical install re-registering (token rotation, or a new user
            # signing in on this device).
            existing.user_id = user_id
            existing.platform = platform
        await self.db.commit()

    async def unregister_device(self, user_id: int, token: str) -> None:
        await self.db.execute(
            delete(DevicePushToken).where(
                DevicePushToken.user_id == user_id, DevicePushToken.token == token
            )
        )
        await self.db.commit()

    async def remove_device_by_id(self, device_id: int) -> None:
        await self.db.execute(delete(DevicePushToken).where(DevicePushToken.id == device_id))
        await self.db.commit()

    async def list_device_tokens(self, user_id: int) -> list[DevicePushToken]:
        return list(
            (
                await self.db.execute(
                    select(DevicePushToken).where(DevicePushToken.user_id == user_id)
                )
            )
            .scalars()
            .all()
        )

    async def count_devices(self, user_id: int) -> int:
        return len(await self.list_device_tokens(user_id))

    # ----- scheduling -----

    async def _weighed_today(self, user_id: int, day: date) -> bool:
        logs = await WeightService(self.db).raw_logs(user_id, since=day, until=day)
        return len(logs) > 0

    async def _logged_today(self, user_id: int, day: date) -> bool:
        totals = await DiaryService(self.db).daily_calories(user_id, day, day)
        return bool(totals)

    async def collect_due(self, now_utc: datetime | None = None) -> list[DueReminder]:
        """Reminders that are due right now across all enabled users.

        A reminder is due when its local time has passed today and it has not yet
        fired today. `should_send` is False when the action is already done — the
        scheduler then marks it resolved without pushing (calibration-first: no
        nagging about something you've already done)."""
        now_utc = now_utc or datetime.now(tz=UTC)
        rows = (
            await self.db.execute(select(ReminderPrefs).where(ReminderPrefs.enabled.is_(True)))
        ).scalars().all()

        due: list[DueReminder] = []
        for p in rows:
            local = now_utc.astimezone(_safe_zone(p.timezone))
            local_date = local.date()
            hm = local.strftime("%H:%M")

            if p.weigh_in_enabled and p.last_weigh_sent_on != local_date and hm >= p.weigh_in_time:
                done = await self._weighed_today(p.user_id, local_date)
                due.append(DueReminder(p, "weigh_in", local_date, should_send=not done))

            if p.log_meals_enabled and p.last_log_sent_on != local_date and hm >= p.log_meals_time:
                done = await self._logged_today(p.user_id, local_date)
                due.append(DueReminder(p, "log_meals", local_date, should_send=not done))

        return due

    async def mark_sent(self, prefs: ReminderPrefs, kind: str, local_date: date) -> None:
        if kind == "weigh_in":
            prefs.last_weigh_sent_on = local_date
        elif kind == "log_meals":
            prefs.last_log_sent_on = local_date
        await self.db.commit()
