"""Legal / policy documents (Impressum, Privacy, Terms, Cookies).

Bundled defaults (`defaults.json`, ported from the original frontend copy) are the
baseline; the admin can override any (doc, locale) with a DB row — the same
defaults-plus-overrides shape as `app_config`. Lets the operator fill the
Impressum/Privacy placeholders (legal name, address, hosting) from the admin
console instead of a code change.
"""
