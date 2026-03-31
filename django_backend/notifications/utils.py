import logging
from django.conf import settings
from django.utils import timezone
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


def get_styled_email_html(user_name: str, content_html: str, action_label: str = None, action_url: str = None):
    """
    Wraps raw HTML content in a professional, branded Hyrind template.
    """
    site_url = getattr(settings, 'SITE_URL', 'https://hyrnd.netlify.app')
    
    action_button = ""
    if action_label and action_url:
        full_url = action_url if action_url.startswith('http') else f"{site_url.rstrip('/')}/{action_url.lstrip('/')}"
        action_button = f"""
            <div style="margin: 30px 0; text-align: center;">
                <a href="{full_url}" style="background-color: #0d47a1; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    {action_label}
                </a>
            </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; }}
            .header {{ text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #0d47a1; letter-spacing: -0.5px; }}
            .content {{ padding: 30px 0; }}
            .footer {{ text-align: center; font-size: 12px; color: #888; padding-top: 20px; border-top: 1px solid #f0f0f0; }}
            p {{ margin-bottom: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">HYRIND</div>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                {content_html}
                {action_button}
                <p>Best regards,<br>The Hyrind Team</p>
            </div>
            <div class="footer">
                &copy; {timezone.now().year} Hyrind. All rights reserved.<br>
                This is a transactional email related to your account on {site_url}
            </div>
        </div>
    </body>
    </html>
    """
