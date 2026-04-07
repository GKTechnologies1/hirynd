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
        
        # If result is empty or has an error field (depends on SDK version)
        if not result or hasattr(result, 'error'):
            error_msg = getattr(result, 'error', 'Unknown Error')
            logger.error(f"Resend Send Failed: {error_msg}")
            EmailLog.objects.create(recipient_email=to, email_type=email_type, status='failed', error_message=str(error_msg))
            return None

        EmailLog.objects.create(recipient_email=to, email_type=email_type, status='sent')
        return result
    except Exception as exc:
        # Capture full error details for debugging
        error_detail = str(exc)
        if "403" in error_detail or "422" in error_detail:
            error_detail += " (Note: This often means the domain is unverified. Use onboarding@resend.dev for testing.)"
            
        logger.error('Resend failed to %s (%s): %s', to, email_type, error_detail)
        try:
            EmailLog.objects.create(
                recipient_email=to, email_type=email_type,
                status='failed', error_message=error_detail,
            )
        except Exception as e:
            logger.error('CRITICAL: Failed to create EmailLog: %s', str(e))
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
            <div style="margin: 40px 0; text-align: center;">
                <a href="{full_url}" class="action-btn">
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
            body {{ font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }}
            .container {{ max-width: 600px; margin: 40px auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
            .header {{ text-align: center; padding-bottom: 32px; border-bottom: 1px solid #f1f5f9; }}
            .logo {{ font-size: 28px; font-weight: 800; color: #2563eb; letter-spacing: -1px; text-transform: uppercase; }}
            .content {{ padding: 32px 0; font-size: 16px; }}
            .footer {{ text-align: center; font-size: 12px; color: #64748b; padding-top: 32px; border-top: 1px solid #f1f5f9; }}
            p {{ margin-bottom: 20px; }}
            .action-btn {{ background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block; transition: background-color 0.2s; }}
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
