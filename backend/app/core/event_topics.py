"""Central registry of event topic names (see app/core/events.py)."""

# A profile was created or edited (weight/goal/activity/overrides changed).
PROFILE_UPDATED = "profile.updated"

# A diary entry was created/updated/deleted for a user+date.
DIARY_CHANGED = "diary.changed"

# A weight measurement was logged for a user+date.
WEIGHT_LOGGED = "weight.logged"

# A user accepted (acknowledged) an active warning of a given type.
WARNING_ACCEPTED = "coaching.warning_accepted"

# Calibration finished and produced a real-TDEE estimate.
CALIBRATION_COMPLETED = "calibration.completed"
