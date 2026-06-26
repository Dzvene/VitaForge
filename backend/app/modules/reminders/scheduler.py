"""In-process reminder scheduler.

A single asyncio task (started from the app lifespan) wakes every
`REMINDER_TICK_SECONDS`, asks the service which reminders are due, and pushes
them. State (`last_*_sent_on`) lives in the DB, so a restart resumes cleanly and
a single backend container means exactly one scheduler — no double-sends.

Disabled entirely under tests, when the scheduler flag is off, or when no VAPID
key is configured.
"""

import asyncio
import json
import logging

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.modules.reminders import native_sender, notifications, sender
from app.modules.reminders.service import ReminderService

_log = logging.getLogger(__name__)


def _sub_info(sub) -> dict:
    return {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}


async def _tick() -> None:
    async with AsyncSessionLocal() as db:
        svc = ReminderService(db)
        due = await svc.collect_due()
        for item in due:
            if item.should_send:
                copy = notifications.build(item.kind, item.prefs.locale)
                payload = json.dumps(copy)
                # Browser subscriptions (Web Push / VAPID).
                subs = await svc.list_subscriptions(item.prefs.user_id)
                for sub in subs:
                    result = await asyncio.to_thread(sender.send_push, _sub_info(sub), payload)
                    if result == "gone":
                        await svc.remove_subscription_by_id(sub.id)
                # Native app tokens (APNs / FCM).
                devices = await svc.list_device_tokens(item.prefs.user_id)
                for dev in devices:
                    res = await native_sender.send_to_device(dev.platform, dev.token, copy)
                    if res == "gone":
                        await svc.remove_device_by_id(dev.id)
            # Mark resolved either way — whether we pushed or it was already done,
            # this reminder is finished for the user's local day.
            await svc.mark_sent(item.prefs, item.kind, item.local_date)
        if due:
            _log.info("reminder tick: processed %d due reminder(s)", len(due))


async def run_scheduler() -> None:
    interval = max(15, settings.REMINDER_TICK_SECONDS)
    _log.info("reminder scheduler started (tick=%ss)", interval)
    while True:
        try:
            await _tick()
        except asyncio.CancelledError:
            raise
        except Exception:
            _log.exception("reminder tick failed")
        await asyncio.sleep(interval)


def should_run() -> bool:
    return (
        settings.REMINDER_SCHEDULER_ENABLED
        and settings.APP_ENV != "test"
        and (settings.push_enabled or settings.native_push_enabled)
    )
