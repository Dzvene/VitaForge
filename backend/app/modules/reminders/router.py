"""Reminder endpoints — preferences, push subscription management, test push."""

import json

from fastapi import APIRouter, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.modules.reminders import notifications, sender
from app.modules.reminders.schemas import ConfigOut, PrefsIn, PrefsOut, SubscriptionIn
from app.modules.reminders.service import ReminderService

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("/config", response_model=ConfigOut)
async def get_config(user: CurrentUser, db: DbSession) -> ConfigOut:
    svc = ReminderService(db)
    prefs = await svc.get_or_create(user.id)
    return ConfigOut(
        vapid_public_key=sender.application_server_key(),
        push_enabled=settings.push_enabled,
        prefs=svc.to_out(prefs),
        subscriptions=await svc.count_subscriptions(user.id),
    )


@router.put("/prefs", response_model=PrefsOut)
async def update_prefs(payload: PrefsIn, user: CurrentUser, db: DbSession) -> PrefsOut:
    svc = ReminderService(db)
    prefs = await svc.update_prefs(user.id, payload)
    return svc.to_out(prefs)


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(payload: SubscriptionIn, user: CurrentUser, db: DbSession) -> None:
    await ReminderService(db).save_subscription(user.id, payload)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(payload: dict, user: CurrentUser, db: DbSession) -> None:
    endpoint = str(payload.get("endpoint", ""))
    if endpoint:
        await ReminderService(db).remove_subscription(user.id, endpoint)


@router.post("/test")
async def send_test(user: CurrentUser, db: DbSession) -> dict:
    """Push a test notification to all of this account's devices (UX: 'send test')."""
    svc = ReminderService(db)
    prefs = await svc.get_or_create(user.id)
    subs = await svc.list_subscriptions(user.id)
    payload = json.dumps(notifications.build("test", prefs.locale))
    delivered = 0
    for sub in subs:
        result = sender.send_push(
            {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            payload,
        )
        if result == "gone":
            await svc.remove_subscription_by_id(sub.id)
        elif result == "ok":
            delivered += 1
    return {"delivered": delivered, "devices": len(subs)}
