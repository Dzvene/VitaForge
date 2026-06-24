"""Weight slice: logging (upsert per day) + EMA trend series."""

from datetime import date, timedelta

from tests.conftest import PROFILE_BODY


async def _log(client, headers, d, kg):
    return await client.post(
        "/weight", json={"logged_on": d.isoformat(), "weight_kg": kg}, headers=headers
    )


async def test_log_and_series(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    base = date.today() - timedelta(days=4)
    for i, kg in enumerate([81.0, 80.6, 80.8, 80.2, 80.0]):
        r = await _log(client, admin["headers"], base + timedelta(days=i), kg)
        assert r.status_code == 204

    series = await client.get("/weight/series", headers=admin["headers"])
    assert series.status_code == 200
    body = series.json()
    assert len(body["points"]) == 5
    # Raw values preserved, trend present and smoothed (between min and max raw).
    assert body["points"][0]["weight_kg"] == 81.0
    assert body["latest_trend_kg"] is not None
    assert 80.0 <= body["latest_trend_kg"] <= 81.0


async def test_relogging_same_day_overwrites(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    today = date.today()
    await _log(client, admin["headers"], today, 80.0)
    await _log(client, admin["headers"], today, 79.5)
    series = await client.get("/weight/series", headers=admin["headers"])
    points = series.json()["points"]
    assert len(points) == 1
    assert points[0]["weight_kg"] == 79.5


async def test_empty_series(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    series = await client.get("/weight/series", headers=admin["headers"])
    assert series.json()["points"] == []
    assert series.json()["latest_trend_kg"] is None


async def test_weight_out_of_range_rejected(client, admin):
    r = await _log(client, admin["headers"], date.today(), 5)
    assert r.status_code == 422


async def test_series_requires_auth(client):
    assert (await client.get("/weight/series")).status_code == 401
