import logging
import threading
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _send(to_email, subject, message):
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
        logger.info("Email sent to %s", to_email)
    except Exception:
        logger.exception("Email send failed")


def send_email(to_email, subject, message):
    """Returns True once the send has started. Failures are logged in the server terminal."""
    if not to_email:
        return False
    threading.Thread(target=_send, args=(to_email, subject, message), daemon=True).start()
    return True