"""Static coaching content (spec §5).

Real principles only — energy balance, metabolic adaptation, muscle retention in
a deficit. No invented study citations, no fake numbers. Calm-coach tone: explain
the consequence once, neutrally, never shame or alarm.
"""

from __future__ import annotations

from dataclasses import dataclass


class WarningType:
    AGGRESSIVE_RATE = "aggressive_rate"
    SKIP_CALIBRATION = "skip_calibration"
    MISSED_LOGGING = "missed_logging"
    IRREGULAR_WEIGHING = "irregular_weighing"
    SINGLE_DAY_CONCLUSION = "single_day_conclusion"
    LOW_PROTEIN = "low_protein"
    CHRONIC_UNDEREATING = "chronic_undereating"


@dataclass(frozen=True, slots=True)
class WarningCopy:
    title: str
    message: str   # what may go wrong + why, neutral tone


WARNINGS: dict[str, WarningCopy] = {
    WarningType.AGGRESSIVE_RATE: WarningCopy(
        "That pace is steep",
        "A loss rate this fast tends to burn muscle and pull your metabolism down, "
        "so the result often rebounds. A moderate deficit holds better.",
    ),
    WarningType.SKIP_CALIBRATION: WarningCopy(
        "Skipping calibration",
        "Without two weeks at maintenance the target is built on the formula, which "
        "misses for most people, so the deficit may be off. You can still proceed.",
    ),
    WarningType.MISSED_LOGGING: WarningCopy(
        "A few days unlogged",
        "On incomplete data the maintenance recalc is imprecise, so calibration takes "
        "longer. Logging every day keeps the estimate honest.",
    ),
    WarningType.IRREGULAR_WEIGHING: WarningCopy(
        "Weigh-ins are spotty",
        "The trend is built from daily morning weigh-ins; with gaps it drifts. A quick "
        "weigh each morning keeps the trend line trustworthy.",
    ),
    WarningType.SINGLE_DAY_CONCLUSION: WarningCopy(
        "That's one day of raw weight",
        "Day-to-day weight swings 1–2 kg on water and glycogen. Read the week's trend, "
        "not this morning's number.",
    ),
    WarningType.LOW_PROTEIN: WarningCopy(
        "Protein is low for a cut",
        "In a deficit, protein is what holds onto muscle. Setting it well below the "
        "recommended range tends to mean losing muscle instead of fat.",
    ),
    WarningType.CHRONIC_UNDEREATING: WarningCopy(
        "You're under target a lot",
        "Eating well under the target most days slows the result and hits recovery. "
        "The plan works best when you actually hit it.",
    ),
}


@dataclass(frozen=True, slots=True)
class Hint:
    key: str
    title: str
    body: str


# §5.1 passive hints — surfaced in context, collapsible, optional "more".
HINTS: list[Hint] = [
    Hint(
        "why_maintenance_first",
        "Why eat at maintenance first",
        "The formula is only a guess. We measure your real burn from your own intake "
        "and weight trend before cutting, so the deficit is built on facts.",
    ),
    Hint(
        "why_trend_not_scale",
        "Why we read the trend, not the scale",
        "Water and glycogen swing the scale 1–2 kg a day. The smoothed trend shows the "
        "real direction.",
    ),
    Hint(
        "why_moderate_deficit",
        "Why a moderate deficit",
        "A fast cut burns muscle and drops your metabolism. A moderate one is sustainable "
        "and keeps the muscle you have.",
    ),
    Hint(
        "why_protein_priority",
        "Why protein comes first",
        "In a deficit, protein is what keeps muscle on. We set it first, then fill the "
        "rest with fat and carbs.",
    ),
    Hint(
        "why_recalculate",
        "Why the norm changes over time",
        "Your burn falls as you diet (metabolic adaptation). Recalculating keeps the "
        "target matched to your real pace.",
    ),
]
