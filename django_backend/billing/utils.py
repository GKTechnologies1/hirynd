import io
import os
from django.utils import timezone
from django.db import transaction
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Register Unicode fonts for Rupee symbol support ──
_FONTS_READY = False
FONT_REG = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'

def _ensure_fonts():
    global _FONTS_READY, FONT_REG, FONT_BOLD
    if _FONTS_READY:
        return
    _FONTS_READY = True
    win_dir = os.environ.get('WINDIR', 'C:\\Windows')
    font_dir = os.path.join(win_dir, 'Fonts')
    # Try Segoe UI first (clean, supports Indian Rupee)
    reg_path = os.path.join(font_dir, 'segoeui.ttf')
    bold_path = os.path.join(font_dir, 'segoeuib.ttf')
    if os.path.exists(reg_path) and os.path.exists(bold_path):
        try:
            pdfmetrics.registerFont(TTFont('SegoeUI', reg_path))
            pdfmetrics.registerFont(TTFont('SegoeUI-Bold', bold_path))
            FONT_REG = 'SegoeUI'
            FONT_BOLD = 'SegoeUI-Bold'
            return
        except Exception:
            pass
    # Fallback: Arial
    reg_path = os.path.join(font_dir, 'arial.ttf')
    bold_path = os.path.join(font_dir, 'arialbd.ttf')
    if os.path.exists(reg_path) and os.path.exists(bold_path):
        try:
            pdfmetrics.registerFont(TTFont('ArialU', reg_path))
            pdfmetrics.registerFont(TTFont('ArialU-Bold', bold_path))
            FONT_REG = 'ArialU'
            FONT_BOLD = 'ArialU-Bold'
        except Exception:
            pass


# ── Logo paths ──
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HYRIND_LOGO = os.path.join(BASE_DIR, 'invoice_assets', 'hyrind_logo.png')
RAZORPAY_LOGO = os.path.join(BASE_DIR, 'invoice_assets', 'razorpay_logo.png')


def _get_logo(path, max_w, max_h):
    """Load a logo image scaled to fit within max_w x max_h."""
    try:
        if os.path.exists(path):
            img = Image(path)
            aspect = img.imageWidth / img.imageHeight
            if img.imageWidth > max_w:
                img.drawWidth = max_w
                img.drawHeight = max_w / aspect
            if img.drawHeight > max_h:
                img.drawHeight = max_h
                img.drawWidth = max_h * aspect
            return img
    except Exception:
        pass
    return ''


def generate_invoice_pdf(invoice):
    """
    Generates a professional PDF invoice matching Hyrind Private Limited's
    standard Razorpay-powered template with logos and proper ₹ symbol.
    """
    _ensure_fonts()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=50,
        bottomMargin=50,
    )

    # ── Colours ──
    TEXT_PRIMARY = colors.HexColor('#1A1A2E')
    TEXT_SECONDARY = colors.HexColor('#555566')
    TEXT_MUTED = colors.HexColor('#888899')
    TH_BG = colors.HexColor('#F5F5F8')
    BORDER = colors.HexColor('#E0E0E8')

    # ── Styles (using registered Unicode font) ──
    styles = getSampleStyleSheet()
    FR = FONT_REG
    FB = FONT_BOLD

    styles.add(ParagraphStyle('Co', parent=styles['Normal'], fontSize=15, leading=19, fontName=FB, textColor=TEXT_PRIMARY))
    styles.add(ParagraphStyle('Gstin', parent=styles['Normal'], fontSize=8.5, leading=11, fontName=FR, textColor=TEXT_MUTED))
    styles.add(ParagraphStyle('RzpBrand', parent=styles['Normal'], fontSize=14, leading=18, fontName=FB, textColor=colors.HexColor('#2962FF'), alignment=TA_RIGHT))
    styles.add(ParagraphStyle('RzpSub', parent=styles['Normal'], fontSize=7.5, leading=10, fontName=FR, textColor=TEXT_MUTED, alignment=TA_RIGHT))
    styles.add(ParagraphStyle('InvW', parent=styles['Normal'], fontSize=18, leading=22, fontName=FB, textColor=TEXT_PRIMARY))
    styles.add(ParagraphStyle('DueLbl', parent=styles['Normal'], fontSize=9, leading=12, fontName=FB, textColor=TEXT_SECONDARY, spaceAfter=3))
    styles.add(ParagraphStyle('DueAmt', parent=styles['Normal'], fontSize=16, leading=20, fontName=FB, textColor=TEXT_PRIMARY))
    styles.add(ParagraphStyle('DtLbl', parent=styles['Normal'], fontSize=9, leading=12, fontName=FB, textColor=TEXT_SECONDARY, spaceBefore=14, spaceAfter=3))
    styles.add(ParagraphStyle('DtVal', parent=styles['Normal'], fontSize=11, leading=14, fontName=FR, textColor=TEXT_PRIMARY))
    styles.add(ParagraphStyle('ThL', parent=styles['Normal'], fontSize=8.5, leading=11, fontName=FB, textColor=TEXT_SECONDARY))
    styles.add(ParagraphStyle('ThR', parent=styles['Normal'], fontSize=8.5, leading=11, fontName=FB, textColor=TEXT_SECONDARY, alignment=TA_RIGHT))
    styles.add(ParagraphStyle('ThC', parent=styles['Normal'], fontSize=8.5, leading=11, fontName=FB, textColor=TEXT_SECONDARY, alignment=TA_CENTER))
    styles.add(ParagraphStyle('TdL', parent=styles['Normal'], fontSize=10, leading=14, fontName=FR, textColor=TEXT_PRIMARY))
    styles.add(ParagraphStyle('TdR', parent=styles['Normal'], fontSize=10, leading=14, fontName=FR, textColor=TEXT_PRIMARY, alignment=TA_RIGHT))
    styles.add(ParagraphStyle('TdC', parent=styles['Normal'], fontSize=10, leading=14, fontName=FR, textColor=TEXT_PRIMARY, alignment=TA_CENTER))
    styles.add(ParagraphStyle('TotL', parent=styles['Normal'], fontSize=11, leading=15, fontName=FB, textColor=TEXT_PRIMARY, alignment=TA_RIGHT))
    styles.add(ParagraphStyle('TotV', parent=styles['Normal'], fontSize=11, leading=15, fontName=FB, textColor=TEXT_PRIMARY, alignment=TA_RIGHT))
    styles.add(ParagraphStyle('Ft', parent=styles['Normal'], fontSize=8, leading=10, fontName=FR, textColor=TEXT_MUTED, alignment=TA_CENTER))

    Story = []
    pw = letter[0] - 120  # page width (minus 60+60 margins)

    # ═══════════════════════════════════════════════════════
    # 1. HEADER — [Hyrind Logo] Company | [Razorpay Logo]
    # ═══════════════════════════════════════════════════════
    hyrind_logo = _get_logo(HYRIND_LOGO, 35, 35)
    razorpay_logo = _get_logo(RAZORPAY_LOGO, 100, 32)
    co_text = Paragraph('<b>HYRIND PRIVATE LIMITED</b>', styles['Co'])
    gstin = Paragraph('GSTIN - 37AAICH2320M1ZI', styles['Gstin'])
    rzp_sub = Paragraph('Invoicing and payments<br/>powered by Razorpay', styles['RzpSub'])

    # Left side: logo + text in a nested table to ensure alignment
    if hyrind_logo:
        left_side_data = [[hyrind_logo, co_text], ['', gstin]]
        left_side_table = Table(left_side_data, colWidths=[40, pw * 0.6 - 40])
        left_side_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('SPAN', (0, 0), (0, 1)),
        ]))
        left_content = left_side_table
    else:
        left_content = Table([[co_text], [gstin]], colWidths=[pw * 0.6])
        left_content.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0)]))

    # Right side: Razorpay logo + subtext (ensuring strict right alignment)
    right_side_data = [[razorpay_logo or ''], [rzp_sub]]
    right_side_table = Table(right_side_data, colWidths=[pw * 0.4])
    right_side_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    header = Table([[left_content, right_side_table]], colWidths=[pw * 0.6, pw * 0.4])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    Story.append(header)
    Story.append(Spacer(1, 24))
    Story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=22))

    # ═══════════════════════════════════════════════════════
    # 2. "Invoice  Receipt: HYRIND0021"
    # ═══════════════════════════════════════════════════════
    inv_num = f"HYRIND{str(invoice.id).split('-')[0][:4].upper().zfill(4)}"
    try:
        issue_date = (invoice.created_at or timezone.now()).strftime('%-d %b %Y')
    except ValueError:
        issue_date = (invoice.created_at or timezone.now()).strftime('%d %b %Y').lstrip('0')

    Story.append(Paragraph(
        f'<b>Invoice</b>&nbsp;&nbsp;'
        f'<font size="11" color="#555566">Receipt: {inv_num}</font>',
        styles['InvW']
    ))
    Story.append(Spacer(1, 22))

    # ═══════════════════════════════════════════════════════
    # 3. AMOUNT DUE
    # ═══════════════════════════════════════════════════════
    plan_name = (
        invoice.subscription.plan_name
        if invoice.subscription
        else "Profile Marketing Services Fee"
    )
    amount = invoice.amount
    currency = invoice.currency.upper() if invoice.currency else 'USD'
    currency_sym = '\u20b9' if currency == 'INR' else '$'
    fmt_amt = f"{currency_sym} {amount:,.2f}"

    status = invoice.status.upper() if invoice.status else 'UNPAID'
    due_lbl = "AMOUNT PAID" if status in ('PAID', 'COMPLETED') else "AMOUNT DUE"

    Story.append(Paragraph(due_lbl, styles['DueLbl']))
    Story.append(Paragraph(f'<b>{fmt_amt}</b>', styles['DueAmt']))

    # ═══════════════════════════════════════════════════════
    # 4. ISSUE DATE
    # ═══════════════════════════════════════════════════════
    Story.append(Paragraph('ISSUE DATE', styles['DtLbl']))
    Story.append(Paragraph(issue_date, styles['DtVal']))
    Story.append(Spacer(1, 26))

    # ═══════════════════════════════════════════════════════
    # 5. LINE ITEMS TABLE
    # ═══════════════════════════════════════════════════════
    cw = [pw * 0.42, pw * 0.22, pw * 0.10, pw * 0.26]

    hdr = [
        Paragraph('<b>DESCRIPTION</b>', styles['ThL']),
        Paragraph('<b>UNIT PRICE</b>', styles['ThR']),
        Paragraph('<b>QTY</b>', styles['ThC']),
        Paragraph('<b>AMOUNT</b>', styles['ThR']),
    ]
    itm = [
        Paragraph(plan_name, styles['TdL']),
        Paragraph(fmt_amt, styles['TdR']),
        Paragraph('1', styles['TdC']),
        Paragraph(fmt_amt, styles['TdR']),
    ]
    spc = ['', '', '', '']
    tot = [
        '', '',
        Paragraph('<b>Total</b>', styles['TotL']),
        Paragraph(f'<b>{fmt_amt}</b>', styles['TotV']),
    ]

    tbl = Table([hdr, itm, spc, tot], colWidths=cw)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TH_BG),
        ('TOPPADDING', (0, 0), (-1, 0), 10), ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('LEFTPADDING', (0, 0), (0, 0), 14), ('RIGHTPADDING', (-1, 0), (-1, 0), 14),
        ('TOPPADDING', (0, 1), (-1, 1), 14), ('BOTTOMPADDING', (0, 1), (-1, 1), 14),
        ('LEFTPADDING', (0, 1), (0, 1), 14), ('RIGHTPADDING', (-1, 1), (-1, 1), 14),
        ('TOPPADDING', (0, 2), (-1, 2), 4), ('BOTTOMPADDING', (0, 2), (-1, 2), 4),
        ('TOPPADDING', (0, 3), (-1, 3), 10), ('BOTTOMPADDING', (0, 3), (-1, 3), 10),
        ('LEFTPADDING', (0, 3), (0, 3), 14), ('RIGHTPADDING', (-1, 3), (-1, 3), 14),
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, BORDER),
        ('LINEBELOW', (0, 3), (-1, 3), 0.5, BORDER),
        ('LINEBEFORE', (0, 0), (0, 3), 0.5, BORDER),
        ('LINEAFTER', (-1, 0), (-1, 3), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    Story.append(tbl)
    Story.append(Spacer(1, 50))

    # ═══════════════════════════════════════════════════════
    # 6. FOOTER
    # ═══════════════════════════════════════════════════════
    Story.append(HRFlowable(width='100%', thickness=0.3, color=BORDER, spaceAfter=8))
    Story.append(Paragraph('Page 1 of 1', styles['Ft']))

    doc.build(Story)
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value


def ensure_default_subscription(candidate):
    """
    Ensures the candidate has a default $400 monthly subscription.
    Called when roles are confirmed.
    """
    from .models import Subscription, SubscriptionPlan
    
    with transaction.atomic():
        plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Monthly Service Fee",
            defaults={
                'amount': 400.00,
                'currency': 'USD',
                'billing_cycle': 'monthly',
                'description': 'Standard monthly marketing & support fee',
                'is_active': True,
                'is_base': True
            }
        )

        sub, created = Subscription.objects.get_or_create(
            candidate=candidate,
            defaults={
                'plan': plan,
                'plan_name': plan.name,
                'amount': plan.amount,
                'currency': plan.currency,
                'billing_cycle': plan.billing_cycle,
                'status': 'pending_payment',
            }
        )
        
        if not created and sub.status in ('canceled', 'unpaid'):
            sub.status = 'pending_payment'
            sub.save(update_fields=['status'])
            
    return sub
