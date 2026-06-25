"""Backend i18n: Accept-Language parsing, tr() fallback/interpolation, and that
coaching copy + errors come back localized end-to-end."""

import pytest

from app.core.i18n import current_locale, parse_accept_language, tr


def test_parse_accept_language_picks_first_supported():
    assert parse_accept_language(None) == "en"
    assert parse_accept_language("ru") == "ru"
    assert parse_accept_language("de-DE,de;q=0.9,en;q=0.8") == "de"
    assert parse_accept_language("fr-FR,fr;q=0.9") == "en"  # unsupported → default
    assert parse_accept_language("en-US") == "en"


def test_tr_translates_by_active_locale_with_fallback():
    token = current_locale.set("ru")
    try:
        assert tr("coaching.guidance.on_track") == "День выглядит сбалансированным — отличная работа."
        # interpolation
        assert "12" in tr("coaching.guidance.protein_low", grams=12)
        # unknown key → returns the key, never raises
        assert tr("does.not.exist") == "does.not.exist"
    finally:
        current_locale.reset(token)


def test_tr_falls_back_to_english_for_default_locale():
    token = current_locale.set("en")
    try:
        assert tr("error.barcode_not_found") == "No product with that barcode."
    finally:
        current_locale.reset(token)


@pytest.mark.asyncio
async def test_hints_localized_via_accept_language(client, admin):
    en = await client.get("/coaching/hints", headers=admin["headers"])
    ru = await client.get(
        "/coaching/hints", headers={**admin["headers"], "Accept-Language": "ru"}
    )
    de = await client.get(
        "/coaching/hints", headers={**admin["headers"], "Accept-Language": "de"}
    )
    assert en.status_code == ru.status_code == de.status_code == 200
    en_titles = " ".join(h["title"] for h in en.json())
    ru_titles = " ".join(h["title"] for h in ru.json())
    de_titles = " ".join(h["title"] for h in de.json())
    assert "Why" in en_titles
    assert "Почему" in ru_titles
    assert "Warum" in de_titles


def test_calibration_degrade_reasons_localized():
    token = current_locale.set("ru")
    try:
        assert tr("calibration.degrade.no_data") == "Пока недостаточно взвешиваний или записей еды"
        assert tr("calibration.degrade.missing_logs").startswith("Слишком много")
        assert tr("calibration.skipped").startswith("Калибровка пропущена")
    finally:
        current_locale.reset(token)
    # English default keeps the substring older tests rely on.
    assert "food log" in tr("calibration.degrade.missing_logs")


@pytest.mark.asyncio
async def test_calibration_preview_reason_localized(client):
    """Guest preview degrade reason follows Accept-Language (regression: was
    hardcoded English, leaked into the RU/DE UI)."""
    payload = {"weights": [{"logged_on": "2026-06-01", "weight_kg": 80}], "intake": []}
    ru = await client.post(
        "/public/calibration/preview", json=payload, headers={"Accept-Language": "ru"}
    )
    de = await client.post(
        "/public/calibration/preview", json=payload, headers={"Accept-Language": "de"}
    )
    assert ru.status_code == de.status_code == 200
    assert ru.json()["reason"] == "Пока недостаточно взвешиваний или записей еды"
    assert de.json()["reason"] == "Noch nicht genug Wägungen oder Essenseinträge"


@pytest.mark.asyncio
async def test_error_localized_via_accept_language(client):
    # Duplicate registration → conflict, message in the requested language.
    body = {"email": "dup-i18n@test.dev", "password": "password123"}
    await client.post("/auth/register", json=body)
    r = await client.post("/auth/register", json=body, headers={"Accept-Language": "de"})
    assert r.status_code == 409
    assert r.json()["detail"] == "Ein Benutzer mit dieser E-Mail existiert bereits."
