from dataclasses import dataclass
from email.message import EmailMessage
import hashlib
import smtplib
import time

import httpx

from .settings import get_settings


@dataclass
class EmailResult:
    provider: str
    status: str
    provider_message_id: str | None = None
    error_code: str | None = None


class EmailSender:
    provider = "base"

    def send_password_reset(self, recipient: str, reset_link: str) -> EmailResult:
        raise NotImplementedError


class ConsoleEmailSender(EmailSender):
    provider = "console"

    def send_password_reset(self, recipient: str, reset_link: str) -> EmailResult:
        return EmailResult(provider=self.provider, status="preview", provider_message_id=None)


class SmtpEmailSender(EmailSender):
    provider = "smtp"

    def send_password_reset(self, recipient: str, reset_link: str) -> EmailResult:
        settings = get_settings()
        message = EmailMessage()
        message["From"] = settings.email_from
        message["To"] = recipient
        message["Subject"] = "Reset your MoveInRange password"
        message.set_content(
            "\n".join(
                [
                    "We received a request to reset your MoveInRange password.",
                    "",
                    f"Open this link to choose a new password: {reset_link}",
                    "",
                    "This link expires in 30 minutes. If you did not request it, ignore this email.",
                ]
            )
        )

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds) as client:
                if settings.smtp_use_tls:
                    client.starttls()
                if settings.smtp_username and settings.smtp_password:
                    client.login(settings.smtp_username, settings.smtp_password)
                refused = client.send_message(message)
            if refused:
                return EmailResult(provider=self.provider, status="failed", error_code="recipient_refused")
            return EmailResult(provider=self.provider, status="sent", provider_message_id=message["Message-ID"])
        except OSError:
            return EmailResult(provider=self.provider, status="failed", error_code="smtp_unavailable")
        except smtplib.SMTPException:
            return EmailResult(provider=self.provider, status="failed", error_code="smtp_error")


class ResendEmailSender(EmailSender):
    provider = "resend"
    endpoint = "https://api.resend.com/emails"

    def send_password_reset(self, recipient: str, reset_link: str) -> EmailResult:
        settings = get_settings()
        if not settings.resend_api_key or not settings.resend_from_email:
            return EmailResult(provider=self.provider, status="failed", error_code="resend_not_configured")
        text_body, html_body = _password_reset_bodies(reset_link)
        payload = {
            "from": settings.resend_from_email,
            "to": [recipient],
            "subject": "Reset your MoveInRange password",
            "text": text_body,
            "html": html_body,
        }
        idempotency_key = "mir-reset-" + hashlib.sha256(reset_link.encode()).hexdigest()[:32]
        headers = {
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Idempotency-Key": idempotency_key,
        }
        attempts = max(1, settings.resend_max_attempts)
        for attempt in range(attempts):
            try:
                response = httpx.post(
                    self.endpoint,
                    headers=headers,
                    json=payload,
                    timeout=settings.resend_timeout_seconds,
                )
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    return EmailResult(provider=self.provider, status="failed", error_code=f"resend_http_{response.status_code}")
                if response.status_code >= 400:
                    last_error = f"resend_http_{response.status_code}"
                else:
                    body = response.json() if response.content else {}
                    return EmailResult(provider=self.provider, status="sent", provider_message_id=body.get("id"))
            except (httpx.HTTPError, ValueError):
                last_error = "resend_unavailable"
            if attempt < attempts - 1:
                time.sleep(0.2 * (attempt + 1))
        return EmailResult(provider=self.provider, status="failed", error_code=last_error)


def _password_reset_bodies(reset_link: str) -> tuple[str, str]:
    text = "\n".join(
        [
            "We received a request to reset your MoveInRange password.",
            "MoveInRange sifrenizi sifirlamak icin bir istek aldik.",
            "",
            f"Open this one-time link within 30 minutes: {reset_link}",
            f"Bu tek kullanimlik baglantiyi 30 dakika icinde acin: {reset_link}",
            "",
            "If you did not request this, ignore the email and keep your current password.",
            "Bu istegi siz yapmadiysaniz e-postayi yok sayin; mevcut sifreniz gecerlidir.",
            "",
            "MoveInRange never asks for your password by email.",
        ]
    )
    html = (
        "<p>We received a request to reset your MoveInRange password.</p>"
        "<p>MoveInRange sifrenizi sifirlamak icin bir istek aldik.</p>"
        f'<p><a href="{reset_link}">Reset password / Sifreyi sifirla</a></p>'
        "<p>This one-time link expires in 30 minutes.</p>"
        "<p>Bu tek kullanimlik baglanti 30 dakika icinde sona erer.</p>"
        "<p>If you did not request this, ignore the email. MoveInRange never asks for your password by email.</p>"
    )
    return text, html


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.email_sender == "resend":
        return ResendEmailSender()
    if settings.email_sender == "smtp":
        return SmtpEmailSender()
    return ConsoleEmailSender()
