"""Provider-agnostic outbound email.

One entry point — ``send_email`` — picks a backend from settings at call time:

* **SMTP** when ``settings.email_enabled`` (SMTP_HOST + SMTP_PASSWORD set). The
  blocking ``smtplib`` call runs in a worker thread so the event loop is never
  stalled. SSL-on-connect (port 465) or STARTTLS (587) per ``SMTP_USE_SSL``.
* **Console** otherwise — logs the message and appends it to ``OUTBOX``. This
  keeps dev and the test suite fully exercisable with no SMTP account, and is
  what lets the whole password-reset / verification feature ship before the
  mailbox is provisioned: fill in the SMTP_* env vars and it goes live with no
  code change.

The feature is intentionally non-fatal: a failed send is logged, never raised,
so registration / forgot-password never 500 because mail is down.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as _MimeMessage

from app.core.config import settings

_log = logging.getLogger(__name__)


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    text: str
    html: str


# Console-backend capture. Tests read this; the SMTP backend never touches it.
OUTBOX: list[OutgoingEmail] = []


def reset_outbox() -> None:
    OUTBOX.clear()


def _build_mime(msg: OutgoingEmail) -> _MimeMessage:
    mime = _MimeMessage()
    mime["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    mime["To"] = msg.to
    mime["Subject"] = msg.subject
    mime.set_content(msg.text)
    mime.add_alternative(msg.html, subtype="html")
    return mime


def _send_smtp_blocking(msg: OutgoingEmail) -> None:
    mime = _build_mime(msg)
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(mime)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(mime)


async def send_email(to: str, subject: str, *, text: str, html: str) -> None:
    """Best-effort send. Never raises — failures are logged."""
    msg = OutgoingEmail(to=to, subject=subject, text=text, html=html)
    if not settings.email_enabled:
        OUTBOX.append(msg)
        _log.info("[email:console] to=%s subject=%r\n%s", to, subject, text)
        return
    try:
        await asyncio.to_thread(_send_smtp_blocking, msg)
        _log.info("[email:smtp] sent to=%s subject=%r", to, subject)
    except Exception:
        _log.exception("[email:smtp] send failed to=%s subject=%r", to, subject)
