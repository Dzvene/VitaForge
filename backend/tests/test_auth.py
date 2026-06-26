"""Auth slice: register / login / refresh / me + access control."""


async def test_register_first_user_is_admin(client):
    r = await client.post(
        "/auth/register", json={"email": "first@x.io", "password": "Sup3rSecret!"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "first@x.io"
    assert body["role"] == "admin"
    assert body["is_active"] is True


async def test_second_user_is_plain(client):
    await client.post("/auth/register", json={"email": "a@x.io", "password": "Sup3rSecret!"})
    r = await client.post("/auth/register", json={"email": "b@x.io", "password": "Sup3rSecret!"})
    assert r.json()["role"] == "user"


async def test_register_duplicate_email_conflicts(client):
    await client.post("/auth/register", json={"email": "dup@x.io", "password": "Sup3rSecret!"})
    r = await client.post("/auth/register", json={"email": "dup@x.io", "password": "Sup3rSecret!"})
    assert r.status_code == 409


async def test_register_email_normalised_lowercase(client):
    await client.post("/auth/register", json={"email": "Mixed@Case.IO", "password": "Sup3rSecret!"})
    # Login with any casing resolves to the stored lowercase email.
    r = await client.post("/auth/login", json={"email": "mixed@case.io", "password": "Sup3rSecret!"})
    assert r.status_code == 200


async def test_register_short_password_rejected(client):
    r = await client.post("/auth/register", json={"email": "c@x.io", "password": "short"})
    assert r.status_code == 422


async def test_login_wrong_password(client, admin):
    r = await client.post(
        "/auth/login", json={"email": "owner@vitaforge.app", "password": "WrongPass123"}
    )
    assert r.status_code == 401


async def test_login_unknown_user(client):
    r = await client.post("/auth/login", json={"email": "nobody@x.io", "password": "Sup3rSecret!"})
    assert r.status_code == 401


async def test_me_returns_current_user(client, admin):
    r = await client.get("/auth/me", headers=admin["headers"])
    assert r.status_code == 200
    assert r.json()["email"] == "owner@vitaforge.app"


async def test_me_requires_auth(client):
    assert (await client.get("/auth/me")).status_code == 401


async def test_me_rejects_garbage_token(client):
    r = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


async def test_refresh_issues_new_pair(client, admin):
    r = await client.post(
        "/auth/refresh", json={"refresh_token": admin["tokens"]["refresh_token"]}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


async def test_refresh_rejects_access_token_as_refresh(client, admin):
    # An access token must not be usable on the refresh endpoint.
    r = await client.post(
        "/auth/refresh", json={"refresh_token": admin["tokens"]["access_token"]}
    )
    assert r.status_code == 401


async def test_inactive_user_cannot_login(client, user):
    # Admin disables the plain user, who then cannot authenticate.
    uid = user["user"]["id"]
    patch = await client.patch(
        f"/admin/users/{uid}", json={"is_active": False}, headers=(await _admin_headers(client))
    )
    assert patch.status_code == 200
    r = await client.post(
        "/auth/login", json={"email": "member@vitaforge.app", "password": "Sup3rSecret!"}
    )
    assert r.status_code == 401


async def _admin_headers(client):
    login = await client.post(
        "/auth/login", json={"email": "owner@vitaforge.app", "password": "Sup3rSecret!"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_update_full_name(client, admin):
    r = await client.patch("/auth/me", json={"full_name": "Renamed Owner"}, headers=admin["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["full_name"] == "Renamed Owner"
    me = (await client.get("/auth/me", headers=admin["headers"])).json()
    assert me["full_name"] == "Renamed Owner"


async def test_update_email_resets_verification(client, admin):
    r = await client.patch("/auth/me", json={"email": "moved@vitaforge.app"}, headers=admin["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "moved@vitaforge.app"
    assert r.json()["email_verified"] is False


async def test_update_email_conflict(client, admin, user):
    # `user` is member@vitaforge.app; the owner can't take it.
    r = await client.patch("/auth/me", json={"email": "member@vitaforge.app"}, headers=admin["headers"])
    assert r.status_code == 409


async def test_update_me_requires_auth(client):
    assert (await client.patch("/auth/me", json={"full_name": "x"})).status_code == 401
