"""Admin surface: stats, user management, food moderation, app params + RBAC."""

FOOD = {"name": "Shared milk", "kcal_100g": 64, "protein_100g": 3.4, "fat_100g": 3.6,
        "carb_100g": 4.8}


# ---- RBAC: every admin route is forbidden to a plain user ----

async def test_stats_forbidden_for_plain_user(client, user):
    assert (await client.get("/admin/stats", headers=user["headers"])).status_code == 403


async def test_users_forbidden_for_plain_user(client, user):
    assert (await client.get("/admin/users", headers=user["headers"])).status_code == 403


async def test_admin_routes_require_auth(client):
    assert (await client.get("/admin/stats")).status_code == 401


# ---- stats ----

async def test_stats_counts(client, admin, user):
    food = await client.post("/foods", json=FOOD, headers=admin["headers"])
    assert food.status_code == 201
    r = await client.get("/admin/stats", headers=admin["headers"])
    assert r.status_code == 200
    s = r.json()
    assert s["users"] == 2  # admin + plain user
    assert s["admins"] == 1
    assert s["foods"] >= 1
    assert s["custom_foods"] >= 1  # the owned custom food above


# ---- user management ----

async def test_list_and_patch_user(client, admin, user):
    users = await client.get("/admin/users", headers=admin["headers"])
    assert users.status_code == 200
    assert len(users.json()) == 2

    uid = user["user"]["id"]
    promote = await client.patch(
        f"/admin/users/{uid}", json={"role": "admin"}, headers=admin["headers"]
    )
    assert promote.status_code == 200
    assert promote.json()["role"] == "admin"

    deactivate = await client.patch(
        f"/admin/users/{uid}", json={"is_active": False}, headers=admin["headers"]
    )
    assert deactivate.json()["is_active"] is False


async def test_patch_unknown_user_404(client, admin):
    r = await client.patch("/admin/users/999999", json={"role": "user"}, headers=admin["headers"])
    assert r.status_code == 404


async def test_patch_invalid_role_rejected(client, admin, user):
    uid = user["user"]["id"]
    r = await client.patch(
        f"/admin/users/{uid}", json={"role": "superuser"}, headers=admin["headers"]
    )
    assert r.status_code == 422


# ---- food moderation (shared catalog) ----

async def test_admin_food_crud(client, admin):
    created = await client.post("/admin/foods", json=FOOD, headers=admin["headers"])
    assert created.status_code == 201
    fid = created.json()["id"]
    assert created.json()["source"] == "manual"

    listed = await client.get("/admin/foods", params={"q": "milk"}, headers=admin["headers"])
    assert any(f["id"] == fid for f in listed.json())

    updated = await client.put(
        f"/admin/foods/{fid}", json={**FOOD, "name": "Shared milk 1.5%"},
        headers=admin["headers"],
    )
    assert updated.json()["name"] == "Shared milk 1.5%"

    assert (
        await client.delete(f"/admin/foods/{fid}", headers=admin["headers"])
    ).status_code == 204


# ---- app params ----

async def test_get_and_set_params(client, admin):
    view = await client.get("/admin/params", headers=admin["headers"])
    assert view.status_code == 200
    assert "calibration_window_days" in view.json()["effective"]

    upd = await client.put(
        "/admin/params", json={"overrides": {"calibration_window_days": 10}},
        headers=admin["headers"],
    )
    assert upd.status_code == 200
    assert upd.json()["overrides"]["calibration_window_days"] == 10
    assert upd.json()["effective"]["calibration_window_days"] == 10


async def test_set_params_drops_unknown_keys(client, admin):
    upd = await client.put(
        "/admin/params", json={"overrides": {"not_a_real_param": 1, "trend_alpha": 0.2}},
        headers=admin["headers"],
    )
    assert "not_a_real_param" not in upd.json()["overrides"]
    assert upd.json()["overrides"]["trend_alpha"] == 0.2
