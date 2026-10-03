import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(phone, message):
    """Returns True if handed off successfully. Numbers must be international, e.g. +254712345678."""
    backend = getattr(settings, 'SMS_BACKEND', 'console')

    if backend == 'africastalking':
        try:
            resp = requests.post(
                settings.AT_URL,
                headers={'apiKey': settings.AT_API_KEY, 'Accept': 'application/json'},
                data={'username': settings.AT_USERNAME, 'to': phone, 'message': message},
                timeout=10,
            )
            resp.raise_for_status()
            return True
        except requests.RequestException:
            logger.exception("SMS send failed")
            return False

    # Development: print to the Django terminal instead of sending
    print(f"\n[SMS -> {phone}] {message}\n")
    return True