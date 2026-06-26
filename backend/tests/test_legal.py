"""Legal documents: public read (defaults + locale) and admin overrides."""

_PW = "Sup3rSecret!"


async def _admin_headers(client):
    """First registered user becomes admin (spec §2)."""
    await client.post("/auth/register", json={"email": "admin@x.io", "password": _PW})
    r = await client.post("/auth/login", json={"email": "admin@x.io", "password": _PW})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---- public read -----------------------------------------------------------


async def test_public_get_returns_default(client):
    r = await client.get("/legal/privacy")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["doc"] == "privacy"
    assert body["customized"] is False
    assert body["title"]
    assert isinstance(body["sections"], list) and body["sections"]


async def test_public_get_localized_via_accept_language(client):
    de = (await client.get("/legal/impressum", headers={"Accept-Language": "de"})).json()
    ru = (await client.get("/legal/impressum", headers={"Accept-Language": "ru"})).json()
    assert de["locale"] == "de" and de["title"] == "Impressum"
    assert ru["locale"] == "ru"
    assert de["title"] != ru["title"]


async def test_public_get_locale_query_overrides_header(client):
    body = (
        await client.get("/legal/terms?locale=ru", headers={"Accept-Language": "de"})
    ).json()
    assert body["locale"] == "ru"


async def test_public_unknown_locale_falls_back_to_english(client):
    body = (await client.get("/legal/cookies?locale=fr")).json()
    assert body["locale"] == "en"


async def test_public_unknown_doc_is_404(client):
    r = await client.get("/legal/nonsense")
    assert r.status_code == 404


# ---- admin list + override -------------------------------------------------


async def test_admin_list_returns_all_doc_locale_pairs(client):
    headers = await _admin_headers(client)
    r = await client.get("/admin/legal", headers=headers)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 12  # 4 docs x 3 locales
    assert all(row["customized"] is False for row in rows)


async def test_admin_requires_admin_role(client):
    # A normal (second) user is not admin.
    await client.post("/auth/register", json={"email": "owner@x.io", "password": _PW})
    await client.post("/auth/register", json={"email": "user@x.io", "password": _PW})
    login = await client.post("/auth/login", json={"email": "user@x.io", "password": _PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    r = await client.get("/admin/legal", headers=headers)
    assert r.status_code == 403


async def test_admin_put_creates_override_and_public_reflects_it(client):
    headers = await _admin_headers(client)
    payload = {
        "title": "Imprint (edited)",
        "intro": "Custom intro.",
        "updated": "2026-07-01",
        "sections": [
            {"heading": "Operator", "body": ["Acme GmbH", "Main St 1, 10115 Berlin, DE"]},
        ],
    }
    put = await client.put("/admin/legal/impressum/en", json=payload, headers=headers)
    assert put.status_code == 200, put.text
    assert put.json()["customized"] is True
    assert put.json()["title"] == "Imprint (edited)"

    # Public read now serves the override (no placeholders).
    pub = (await client.get("/legal/impressum?locale=en")).json()
    assert pub["title"] == "Imprint (edited)"
    assert pub["customized"] is True
    assert pub["sections"][0]["body"][0] == "Acme GmbH"

    # The admin grid marks just this one as customized.
    rows = (await client.get("/admin/legal", headers=headers)).json()
    customized = [r for r in rows if r["customized"]]
    assert len(customized) == 1
    assert customized[0]["doc"] == "impressum" and customized[0]["locale"] == "en"


async def test_admin_put_updates_existing_override(client):
    headers = await _admin_headers(client)
    base = {"title": "T1", "intro": None, "updated": "2026-07-01", "sections": []}
    await client.put("/admin/legal/cookies/de", json=base, headers=headers)
    base["title"] = "T2"
    r = await client.put("/admin/legal/cookies/de", json=base, headers=headers)
    assert r.json()["title"] == "T2"
    # Still a single row, not a duplicate.
    rows = (await client.get("/admin/legal", headers=headers)).json()
    assert len([x for x in rows if x["doc"] == "cookies" and x["locale"] == "de"]) == 1


async def test_admin_put_rejects_unknown_locale(client):
    headers = await _admin_headers(client)
    payload = {"title": "x", "intro": None, "updated": "2026-07-01", "sections": []}
    r = await client.put("/admin/legal/privacy/fr", json=payload, headers=headers)
    assert r.status_code == 404
