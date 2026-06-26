"""Reminders: prefs validation, subscription lifecycle, due-reminder logic.

Web Push itself is not configured under tests (no VAPID key), so delivery is a
no-op — the value here is the scheduling logic: when is a reminder due, and does
it stay silent once the day's action is already done.
"""

from datetime import UTC, datetime

from app.core.database import AsyncSessionLocal
from app.modules.reminders.service import ReminderService


async def test_config_defaults(client, admin):
    r = await client.get("/reminders/config", headers=admin["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["push_enabled"] is False  # no VAPID key in tests
    assert body["vapid_public_key"] == ""
    assert body["subscriptions"] == 0
    p = body["prefs"]
    assert p["enabled"] is False
    assert p["weigh_in_time"] == "08:00"
    assert p["log_meals_time"] == "20:00"


async def test_update_prefs_persists(client, admin):
    payload = {
        "enabled": True,
        "timezone": "Europe/Berlin",
        "locale": "de",
        "weigh_in_enabled": True,
        "weigh_in_time": "07:30",
        "log_meals_enabled": False,
        "log_meals_time": "21:00",
    }
    r = await client.put("/reminders/prefs", json=payload, headers=admin["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["weigh_in_time"] == "07:30"
    # round-trips through config
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["prefs"]["timezone"] == "Europe/Berlin"
    assert cfg["prefs"]["log_meals_enabled"] is False
    assert cfg["prefs"]["locale"] == "de"


async def test_update_prefs_rejects_bad_time(client, admin):
    bad = {"enabled": True, "weigh_in_time": "7:30"}  # not zero-padded HH:MM
    r = await client.put("/reminders/prefs", json=bad, headers=admin["headers"])
    assert r.status_code == 422


async def test_invalid_locale_falls_back(client, admin):
    r = await client.put(
        "/reminders/prefs", json={"enabled": True, "locale": "xx"}, headers=admin["headers"]
    )
    assert r.status_code == 200
    assert r.json()["locale"] == "en"


async def test_subscription_lifecycle(client, admin):
    sub = {
        "endpoint": "https://push.example.com/abc123",
        "keys": {"p256dh": "BPK_fake", "auth": "AUTH_fake"},
    }
    r = await client.post("/reminders/subscribe", json=sub, headers=admin["headers"])
    assert r.status_code == 204
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["subscriptions"] == 1

    # re-subscribing the same endpoint is idempotent (no duplicate)
    await client.post("/reminders/subscribe", json=sub, headers=admin["headers"])
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["subscriptions"] == 1

    r = await client.post(
        "/reminders/unsubscribe", json={"endpoint": sub["endpoint"]}, headers=admin["headers"]
    )
    assert r.status_code == 204
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["subscriptions"] == 0


async def test_test_push_no_devices(client, admin):
    r = await client.post("/reminders/test", headers=admin["headers"])
    assert r.status_code == 200
    assert r.json() == {"delivered": 0, "devices": 0}


async def test_endpoints_require_auth(client):
    assert (await client.get("/reminders/config")).status_code == 401
    assert (await client.put("/reminders/prefs", json={})).status_code == 401


# ----- scheduling logic (service-level) -----


async def _enable_always_due(user_id: int) -> None:
    """Set prefs enabled with both times at 00:00 and no prior send, so the
    reminder is unconditionally due (bypasses update_prefs' anti-retro seeding)."""
    async with AsyncSessionLocal() as db:
        svc = ReminderService(db)
        prefs = await svc.get_or_create(user_id)
        prefs.enabled = True
        prefs.timezone = "UTC"
        prefs.weigh_in_time = "00:00"
        prefs.log_meals_time = "00:00"
        prefs.last_weigh_sent_on = None
        prefs.last_log_sent_on = None
        await db.commit()


async def test_collect_due_fires_when_nothing_done(client, admin):
    await _enable_always_due(admin["user"]["id"])
    async with AsyncSessionLocal() as db:
        due = await ReminderService(db).collect_due()
    kinds = {(d.kind, d.should_send) for d in due if d.prefs.user_id == admin["user"]["id"]}
    assert ("weigh_in", True) in kinds
    assert ("log_meals", True) in kinds


async def test_weigh_in_goes_silent_once_logged(client, admin):
    await _enable_always_due(admin["user"]["id"])
    today = datetime.now(tz=UTC).date().isoformat()
    r = await client.post(
        "/weight", json={"logged_on": today, "weight_kg": 80.0}, headers=admin["headers"]
    )
    assert r.status_code == 204, r.text

    async with AsyncSessionLocal() as db:
        due = await ReminderService(db).collect_due()
    weigh = next(d for d in due if d.prefs.user_id == admin["user"]["id"] and d.kind == "weigh_in")
    # already weighed today → still "due" but should_send is False (no nagging)
    assert weigh.should_send is False


async def test_mark_sent_dedupes_same_day(client, admin):
    await _enable_always_due(admin["user"]["id"])
    async with AsyncSessionLocal() as db:
        svc = ReminderService(db)
        due = await svc.collect_due()
        item = next(d for d in due if d.prefs.user_id == admin["user"]["id"] and d.kind == "weigh_in")
        await svc.mark_sent(item.prefs, "weigh_in", item.local_date)
    # second pass: weigh_in no longer due (already fired today)
    async with AsyncSessionLocal() as db:
        due2 = await ReminderService(db).collect_due()
    weigh = [d for d in due2 if d.prefs.user_id == admin["user"]["id"] and d.kind == "weigh_in"]
    assert weigh == []


# ----- native device tokens (APNs / FCM) -----


async def test_config_reports_native_disabled(client, admin):
    body = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert body["native_push_enabled"] is False  # no APNs/FCM creds in tests
    assert body["devices"] == 0


async def test_register_and_unregister_device(client, admin):
    r = await client.post(
        "/reminders/devices",
        json={"platform": "ios", "token": "apns-token-abc"},
        headers=admin["headers"],
    )
    assert r.status_code == 204
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["devices"] == 1

    # idempotent re-register of the same token
    await client.post(
        "/reminders/devices",
        json={"platform": "ios", "token": "apns-token-abc"},
        headers=admin["headers"],
    )
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["devices"] == 1

    r = await client.request(
        "DELETE",
        "/reminders/devices",
        json={"token": "apns-token-abc"},
        headers=admin["headers"],
    )
    assert r.status_code == 204
    cfg = (await client.get("/reminders/config", headers=admin["headers"])).json()
    assert cfg["devices"] == 0


async def test_register_device_bad_platform(client, admin):
    r = await client.post(
        "/reminders/devices",
        json={"platform": "windows", "token": "x"},
        headers=admin["headers"],
    )
    assert r.status_code == 422


async def test_register_device_requires_auth(client):
    assert (
        await client.post("/reminders/devices", json={"platform": "ios", "token": "x"})
    ).status_code == 401


async def test_test_push_counts_native_devices(client, admin):
    await client.post(
        "/reminders/devices",
        json={"platform": "android", "token": "fcm-token-xyz"},
        headers=admin["headers"],
    )
    r = await client.post("/reminders/test", headers=admin["headers"])
    assert r.status_code == 200
    body = r.json()
    # FCM not configured in tests → nothing delivered, but the device is counted.
    assert body["devices"] == 1
    assert body["delivered"] == 0


async def test_native_sender_disabled_without_creds():
    from app.modules.reminders import native_sender

    payload = {"title": "t", "body": "b", "url": "/"}
    assert await native_sender.send_to_device("ios", "tok", payload) == "disabled"
    assert await native_sender.send_to_device("android", "tok", payload) == "disabled"
    assert await native_sender.send_to_device("windows", "tok", payload) == "error"
