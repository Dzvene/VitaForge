"""Coaching content registry (spec §5).

The actual copy now lives in ``app.core.i18n`` (en/ru/de) and is resolved via
``tr()`` at response time from the request's Accept-Language. This module keeps
only the structural registry: which warning types exist and the ordered hint
keys. Translation keys follow ``coaching.warning.<type>.{title,message}`` and
``coaching.hint.<key>.{title,body}``.

Real principles only — energy balance, metabolic adaptation, muscle retention in
a deficit. Calm-coach tone: explain the consequence once, neutrally, no shame.
"""

from __future__ import annotations


class WarningType:
    AGGRESSIVE_RATE = "aggressive_rate"
    SKIP_CALIBRATION = "skip_calibration"
    MISSED_LOGGING = "missed_logging"
    IRREGULAR_WEIGHING = "irregular_weighing"
    SINGLE_DAY_CONCLUSION = "single_day_conclusion"
    LOW_PROTEIN = "low_protein"
    CHRONIC_UNDEREATING = "chronic_undereating"


# Valid warning types (used to validate accept/dismiss + translation lookups).
WARNING_TYPES: frozenset[str] = frozenset(
    {
        WarningType.AGGRESSIVE_RATE,
        WarningType.SKIP_CALIBRATION,
        WarningType.MISSED_LOGGING,
        WarningType.IRREGULAR_WEIGHING,
        WarningType.SINGLE_DAY_CONCLUSION,
        WarningType.LOW_PROTEIN,
        WarningType.CHRONIC_UNDEREATING,
    }
)

# §5.1 passive hints, in display order. Copy resolved via tr() per locale.
HINT_KEYS: tuple[str, ...] = (
    "why_maintenance_first",
    "why_trend_not_scale",
    "why_moderate_deficit",
    "why_protein_priority",
    "why_recalculate",
)
