import logging
from django.conf import settings
from .models import EmailLog

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, email_type: str = 'transactional', attachments: list = None):
    """
    Send via Resend SDK.  Falls back silently to console logging if the API key
    is missing / a placeholder — so the backend never crashes on email errors.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    from_email = getattr(settings, 'RESEND_FROM_EMAIL', 'Hyrind <noreply@hyrind.com>')

    # Detect dummy / unset key
    is_placeholder = not api_key or api_key.startswith('re_xxx') or api_key == 'your-resend-key'

    if is_placeholder:
        # Dev / CI: just log so the rest of the request continues normally
        logger.info('--- [EMAIL DUMMY SEND] ---')
        logger.info('To: %s', to)
        logger.info('Subject: %s', subject)
        logger.info('Type: %s', email_type)
        logger.info('Body: %s', html)
        if attachments:
            logger.info('Attachments: %s', [a.get('filename') for a in attachments])
        logger.info('--------------------------')
        try:
            EmailLog.objects.create(recipient_email=to, email_type=email_type, status='skipped')
        except Exception:
            pass
        return None

    try:
        import resend  # pip install resend
        resend.api_key = api_key
        
        email_params = {
            'from': from_email,
            'to': [to],
            'subject': subject,
            'html': html,
        }
        if attachments:
            email_params['attachments'] = attachments

        result = resend.Emails.send(email_params)
        EmailLog.objects.create(recipient_email=to, email_type=email_type, status='sent')
        return result
    except Exception as exc:
        logger.error('Resend failed to %s (%s): %s', to, email_type, exc)
        try:
            EmailLog.objects.create(
                recipient_email=to, email_type=email_type,
                status='failed', error_message=str(exc),
            )
        except Exception:
            pass
        return None  # Never propagate — email is non-critical


def create_notification(user, title: str, message: str, link: str = None):
    """Create an in-app notification for a user."""
    from .models import Notification
    return Notification.objects.create(user=user, title=title, message=message, link=link)
