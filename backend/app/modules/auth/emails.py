"""Builds the localized verification / password-reset emails.

Copy comes from the i18n catalog (``tr``) so the message is rendered in the
caller's ``Accept-Language``. Both a plain-text and a minimal HTML part are
produced from the same translated lines.
"""

from app.core.config import settings
from app.core.email import send_email
from app.core.i18n import tr


def _link(path: str, token: str) -> str:
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}{path}?token={token}"


def _render_html(intro: str, action: str, url: str, ignore: str) -> str:
    return f"""\
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:20px;margin:0 0 16px">{settings.SMTP_FROM_NAME}</h1>
  <p style="font-size:15px;line-height:1.5">{intro}</p>
  <p style="margin:24px 0">
    <a href="{url}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">{action}</a>
  </p>
  <p style="font-size:13px;color:#666">{tr("email.fallback_link")}<br>
    <a href="{url}" style="color:#16a34a;word-break:break-all">{url}</a>
  </p>
  <p style="font-size:13px;color:#999;margin-top:24px">{ignore}</p>
</div>"""


def _render_text(intro: str, action: str, url: str, ignore: str) -> str:
    return f"{intro}\n\n{action}: {url}\n\n{ignore}"


async def send_verification_email(to: str, token: str) -> None:
    url = _link("/verify-email", token)
    intro = tr("email.verify.intro")
    action = tr("email.verify.action")
    ignore = tr("email.verify.ignore")
    await send_email(
        to,
        tr("email.verify.subject"),
        text=_render_text(intro, action, url, ignore),
        html=_render_html(intro, action, url, ignore),
    )


async def send_password_reset_email(to: str, token: str) -> None:
    url = _link("/reset-password", token)
    intro = tr("email.reset.intro", minutes=settings.PASSWORD_RESET_TTL_MINUTES)
    action = tr("email.reset.action")
    ignore = tr("email.reset.ignore")
    await send_email(
        to,
        tr("email.reset.subject"),
        text=_render_text(intro, action, url, ignore),
        html=_render_html(intro, action, url, ignore),
    )
