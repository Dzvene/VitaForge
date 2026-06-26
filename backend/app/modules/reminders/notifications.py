"""Notification copy for push reminders, by kind and locale.

Kept local to the slice (not in core/i18n) because the scheduler runs outside any
request — there is no Accept-Language ContextVar to read. The user's chosen
language is stored on `ReminderPrefs.locale` and passed in explicitly.
"""

from typing import Literal

Kind = Literal["weigh_in", "log_meals", "test"]

_COPY: dict[Kind, dict[str, dict[str, str]]] = {
    "weigh_in": {
        "en": {
            "title": "Morning weigh-in",
            "body": "Step on the scale and log today's weight — daily weighing is what makes the trend honest.",
            "url": "/dashboard",
        },
        "ru": {
            "title": "Утреннее взвешивание",
            "body": "Встань на весы и запиши вес — ежедневное взвешивание делает тренд честным.",
            "url": "/dashboard",
        },
        "de": {
            "title": "Morgendliches Wiegen",
            "body": "Auf die Waage und das heutige Gewicht eintragen — tägliches Wiegen macht den Trend ehrlich.",
            "url": "/dashboard",
        },
    },
    "log_meals": {
        "en": {
            "title": "Log your day",
            "body": "Round off your food diary so tomorrow's numbers stay accurate.",
            "url": "/diary",
        },
        "ru": {
            "title": "Заполни дневник",
            "body": "Допиши приёмы пищи за день, чтобы расчёты остались точными.",
            "url": "/diary",
        },
        "de": {
            "title": "Tag eintragen",
            "body": "Vervollständige dein Ernährungstagebuch, damit die Zahlen stimmen.",
            "url": "/diary",
        },
    },
    "test": {
        "en": {
            "title": "VitaForge reminders are on",
            "body": "This is a test notification. You'll get nudges at the times you picked.",
            "url": "/dashboard",
        },
        "ru": {
            "title": "Напоминания VitaForge включены",
            "body": "Это тестовое уведомление. Напоминания придут в выбранное время.",
            "url": "/dashboard",
        },
        "de": {
            "title": "VitaForge-Erinnerungen sind aktiv",
            "body": "Das ist eine Testbenachrichtigung. Erinnerungen kommen zu deinen Zeiten.",
            "url": "/dashboard",
        },
    },
}


def build(kind: Kind, locale: str) -> dict[str, str]:
    by_locale = _COPY[kind]
    payload = by_locale.get(locale) or by_locale["en"]
    return {"title": payload["title"], "body": payload["body"], "url": payload["url"], "tag": kind}
