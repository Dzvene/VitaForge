"""Reminders slice — Web Push nudges for weigh-in and meal logging.

Delivery is the Web Push protocol (VAPID), not email, so a working SMTP mailbox
is not required. An in-process scheduler (`scheduler.py`) wakes on a fixed tick,
finds users whose local reminder time has passed, and — crucially — stays silent
when the day's action is already done (weighed / logged). That "don't nag if
you already did it" behaviour is the calibration-first voice carried into push.
"""
