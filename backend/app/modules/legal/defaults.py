"""Bundled default legal copy (ported from the original frontend `lib/legal.ts`).

Baseline content for every (doc, locale). A DB row in ``LegalDocument`` overrides
the matching default. The bracketed placeholders (operator name, address, hosting
provider) are meant to be replaced from the admin console before launch.
"""

import json
from pathlib import Path

LOCALES: tuple[str, ...] = ("en", "ru", "de")
DOCS: tuple[str, ...] = ("impressum", "privacy", "terms", "cookies")
DEFAULT_LOCALE = "en"

_DEFAULTS: dict[str, dict[str, dict]] = json.loads(
    (Path(__file__).parent / "defaults.json").read_text(encoding="utf-8")
)


def default_content(doc: str, locale: str) -> dict | None:
    """The bundled default for (doc, locale), falling back to English."""
    by_locale = _DEFAULTS.get(locale) or _DEFAULTS.get(DEFAULT_LOCALE) or {}
    if doc in by_locale:
        return by_locale[doc]
    en = _DEFAULTS.get(DEFAULT_LOCALE, {})
    return en.get(doc)
