"""Trends & insights — weekly/monthly rollups over the diary + weight data.

A read-only, derived slice: it owns no tables, it aggregates what diary, weight,
nutrition and profile already store into the period summaries the UI needs
(averages, logging adherence, on-target days, weight rate, pace vs plan).
"""
