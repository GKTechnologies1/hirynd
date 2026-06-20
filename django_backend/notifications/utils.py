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
    # Automatically wrap raw/snippet HTML contents in the branded email template
    if html and not ("<html>" in html.lower() or "<!doctype html>" in html.lower()):
        html = get_styled_email_html(None, html)

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


def get_styled_email_html(user_name: str = None, content_html: str = "", action_label: str = None, action_url: str = None):
    """
    Wraps raw HTML content in a professional, branded Hyrind template.
    Adheres to industry standards by using inline styles for high email client compatibility.
    """
    site_url = getattr(settings, 'SITE_URL', 'https://hyrnd.netlify.app')
    site_url_label = site_url.replace('https://', '').replace('http://', '').rstrip('/')
    current_year = timezone.now().year
    
    full_url = None
    if action_label and action_url:
        full_url = action_url if action_url.startswith('http') else f"{site_url.rstrip('/')}/{action_url.lstrip('/')}"
        
    context = {
        'user_name': user_name,
        'content_html': content_html,
        'action_label': action_label,
        'action_url': full_url,
        'site_url': site_url,
        'site_url_label': site_url_label,
        'current_year': current_year,
    }
    
    try:
        from django.template.loader import render_to_string
        return render_to_string('emails/base_email.html', context)
    except Exception:
        # Fallback to python multi-line formatted string if django template engine is not initialized/configured
        greeting_block = f'<p style="margin-top: 0; margin-bottom: 18px; font-weight: 700; font-size: 18px; color: #0f172a; letter-spacing: -0.3px;">Hi {user_name},</p>' if user_name else ""
        
        action_button = ""
        if action_label and full_url:
            action_button = f"""
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 16px 0;">
                <tr>
                    <td>
                        <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" bgcolor="#2563eb" style="border-radius: 8px;">
                                    <a href="{full_url}" target="_blank" class="bulletproof-button" style="background-color: #2563eb; border: 1px solid #2563eb; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 15px; font-weight: 600; line-height: 1; padding: 14px 28px; text-decoration: none; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                        {action_label}
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            """
            
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>Hyrind</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }}
        img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
        body {{ height: 100% !important; width: 100% !important; background-color: #f8fafc; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }}
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body, table, td, p, a, span, div {{ font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }}
        @media screen and (max-width: 600px) {{
            .email-card {{ width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }}
            .content-padding {{ padding: 24px !important; }}
            .button-cell {{ display: block !important; width: 100% !important; }}
            .bulletproof-button {{ display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box; }}
        }}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 24px 12px; table-layout: fixed;">
        <tr>
            <td align="center">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" class="email-card" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border-collapse: separate; text-align: left;">
                    <tr>
                        <td height="6" style="background: linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%); line-height: 6px; font-size: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
                            <a href="{site_url}" target="_blank" style="text-decoration: none; display: inline-block;">
                                <span style="font-size: 26px; font-weight: 800; color: #2563eb; letter-spacing: -1.5px; text-transform: uppercase;">HYRIND</span>
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td class="content-padding" style="padding: 40px; font-size: 16px; line-height: 1.6; color: #1e293b;">
                            {greeting_block}
                            <div style="color: #334155; font-size: 15px; line-height: 1.6;">
                                {content_html}
                            </div>
                            {action_button}
                            <p style="margin-top: 36px; margin-bottom: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                                Best regards,<br>
                                <strong style="color: #0f172a; font-weight: 600;">The Hyrind Team</strong>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content-padding" style="padding: 28px 40px; background-color: #fafafa; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #64748b;">&copy; {current_year} Hyrind. All rights reserved.</p>
                            <p style="margin: 0; color: #64748b;">
                                This is a transactional email related to your account on 
                                <a href="{site_url}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 500;">{site_url_label}</a>.
                            </p>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>"""
