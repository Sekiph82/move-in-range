from dataclasses import dataclass
from email.message import EmailMessage
import smtplib

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


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.email_sender == "smtp":
        return SmtpEmailSender()
    return ConsoleEmailSender()
