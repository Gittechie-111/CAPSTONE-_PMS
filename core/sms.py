import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

PROD_URL = 'https://api.africastalking.com/version1/messaging'
SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging'
OK_CODES = {100, 101, 102}   # processed / sent / queued
STATUS_HINTS = {
        401: 'risk hold',
        402: 'invalid sender ID',
        403: 'invalid phone number',
        404: 'unsupported number type',
        405: 'insufficient balance',
        406: 'recipient is on a block list',
        407: 'could not route to the network',
    }

def send_sms(phone, message):
    """Returns True only if the gateway accepted this recipient. Numbers like +254712345678."""
    if getattr(settings, 'SMS_BACKEND', 'console') != 'africastalking':
        logger.warning("SMS not sent to %s: no SMS gateway configured", phone)
        return False
    
    url = SANDBOX_URL if settings.AT_USERNAME == 'sandbox' else PROD_URL
    payload = {'username': settings.AT_USERNAME, 'to': phone, 'message': message}
    if getattr(settings, 'AT_SENDER_ID', ''):
        payload['from'] = settings.AT_SENDER_ID

    try:
        resp = requests.post(
            url,
            headers={'apiKey': settings.AT_API_KEY, 'Accept': 'application/json'},
            data=payload,
            timeout=15,
        )
        resp.raise_for_status()
        recipients = resp.json().get('SMSMessageData', {}).get('Recipients', [])
        if recipients and recipients[0].get('statusCode') in OK_CODES:
            logger.info("SMS accepted for %s", phone)
            return True
        # logger.error("SMS rejected for %s: %s", phone, recipients or resp.text)
        status = recipients[0] if recipients else {}
        logger.error(
            "SMS rejected for %s: %s (%s)",
            phone, STATUS_HINTS.get(status.get('statusCode'), 'unknown reason'), status.get('status'),
        )
        return False
    
    except (requests.RequestException, ValueError):
        logger.exception("SMS send failed")
        return False