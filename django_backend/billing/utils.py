import io
from django.utils import timezone
from django.db import transaction
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)


def generate_invoice_pdf(invoice):
    """
    Generates a professional, branded PDF invoice for Hyrind Private Limited.
    Matches the standard company invoice template.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=50,
        leftMargin=50,
        topMargin=40,
        bottomMargin=40,
    )

    # ── Colour Palette ──
    BRAND_NAVY = colors.HexColor('#0D1B2A')
    BRAND_BLUE = colors.HexColor('#1B4F72')
    BRAND_ACCENT = colors.HexColor('#2E86C1')
    HEADER_BG = colors.HexColor('#0D1B2A')
    ROW_ALT = colors.HexColor('#F8F9FA')
    BORDER = colors.HexColor('#DEE2E6')
    LIGHT_BG = colors.HexColor('#F0F4F8')
    WHITE = colors.white

    # ── Styles ──
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        'BrandTitle', parent=styles['Normal'],
        fontSize=22, leading=26, fontName='Helvetica-Bold',
        textColor=WHITE, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'BrandSub', parent=styles['Normal'],
        fontSize=9, leading=12, fontName='Helvetica',
        textColor=colors.HexColor('#ADB5BD'), alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'InvLabel', parent=styles['Normal'],
        fontSize=9, leading=12, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#6C757D'), alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        'InvValue', parent=styles['Normal'],
        fontSize=10, leading=14, fontName='Helvetica-Bold',
        textColor=BRAND_NAVY, alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        'SectionHead', parent=styles['Normal'],
        fontSize=9, leading=11, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#6C757D'), spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        'CellNormal', parent=styles['Normal'],
        fontSize=10, leading=13, fontName='Helvetica',
        textColor=BRAND_NAVY
    ))
    styles.add(ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontSize=10, leading=13, fontName='Helvetica-Bold',
        textColor=BRAND_NAVY
    ))
    styles.add(ParagraphStyle(
        'FooterNote', parent=styles['Normal'],
        fontSize=8, leading=10, fontName='Helvetica',
        textColor=colors.HexColor('#ADB5BD'), alignment=TA_CENTER
    ))

    Story = []
    page_width = letter[0] - 100  # 50 margins each side

    # ═══════════════════════════════════════════════════
    # 1. HEADER BANNER
    # ═══════════════════════════════════════════════════
    header_left = Paragraph(
        '<b>HYRIND PRIVATE LIMITED</b>',
        styles['BrandTitle']
    )
    header_gstin = Paragraph(
        'GSTIN - 37AAICH2320M1ZI',
        styles['BrandSub']
    )
    header_right = Paragraph(
        'Invoicing and payments<br/>powered by Razorpay',
        styles['BrandSub']
    )
    header_data = [
        [header_left, ''],
        [header_gstin, header_right],
    ]
    header_table = Table(header_data, colWidths=[page_width * 0.6, page_width * 0.4])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 18),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (0, -1), 20),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 20),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
    ]))
    Story.append(header_table)
    Story.append(Spacer(1, 24))

    # ═══════════════════════════════════════════════════
    # 2. INVOICE META (Receipt No + Issue Date)
    # ═══════════════════════════════════════════════════
    invoice_number = f"HYRIND{str(invoice.id).split('-')[0][:4].upper().zfill(4)}"
    issue_date = (invoice.created_at or timezone.now()).strftime('%d %b %Y')

    meta_data = [
        [
            Paragraph(f'<b>Invoice Receipt:</b> {invoice_number}', styles['CellBold']),
            Paragraph(f'<b>ISSUE DATE</b>', styles['InvLabel']),
        ],
        [
            '',
            Paragraph(issue_date, styles['InvValue']),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[page_width * 0.55, page_width * 0.45])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 4),
    ]))
    Story.append(meta_table)
    Story.append(Spacer(1, 10))

    # ── Divider ──
    Story.append(HRFlowable(
        width='100%', thickness=1,
        color=BORDER, spaceAfter=16, spaceBefore=4
    ))

    # ═══════════════════════════════════════════════════
    # 3. BILL TO
    # ═══════════════════════════════════════════════════
    candidate_name = (
        invoice.candidate.user.profile.full_name
        if hasattr(invoice.candidate.user, 'profile')
        else invoice.candidate.user.email
    )
    candidate_email = invoice.candidate.user.email

    Story.append(Paragraph('BILL TO', styles['SectionHead']))
    bill_info = Paragraph(
        f'<b>{candidate_name}</b><br/>{candidate_email}',
        styles['CellNormal']
    )
    Story.append(bill_info)
    Story.append(Spacer(1, 20))

    # ═══════════════════════════════════════════════════
    # 4. LINE ITEMS TABLE
    # ═══════════════════════════════════════════════════
    plan_name = (
        invoice.subscription.plan_name
        if invoice.subscription
        else "Profile Marketing Services Fee"
    )
    amount = invoice.amount
    currency = invoice.currency.upper() if invoice.currency else 'USD'

    # Currency symbol
    currency_sym = '₹' if currency == 'INR' else '$'
    formatted_amount = f"{currency_sym} {amount:,.2f}"

    col_widths = [page_width * 0.45, page_width * 0.20, page_width * 0.10, page_width * 0.25]
    
    # Header
    header_row = [
        Paragraph('<b>DESCRIPTION</b>', ParagraphStyle('th', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=WHITE)),
        Paragraph('<b>UNIT PRICE</b>', ParagraphStyle('th2', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_RIGHT)),
        Paragraph('<b>QTY</b>', ParagraphStyle('th3', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_CENTER)),
        Paragraph('<b>AMOUNT</b>', ParagraphStyle('th4', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_RIGHT)),
    ]
    
    # Line item
    item_row = [
        Paragraph(plan_name, styles['CellNormal']),
        Paragraph(formatted_amount, ParagraphStyle('pr', parent=styles['CellNormal'], alignment=TA_RIGHT)),
        Paragraph('1', ParagraphStyle('qty', parent=styles['CellNormal'], alignment=TA_CENTER)),
        Paragraph(f'<b>{formatted_amount}</b>', ParagraphStyle('amt', parent=styles['CellBold'], alignment=TA_RIGHT)),
    ]

    # Total row
    total_row = [
        '', '',
        Paragraph('<b>Total</b>', ParagraphStyle('tot', parent=styles['CellBold'], alignment=TA_RIGHT)),
        Paragraph(f'<b>{formatted_amount}</b>', ParagraphStyle('tota', parent=styles['CellBold'], alignment=TA_RIGHT)),
    ]

    items_table = Table([header_row, item_row, total_row], colWidths=col_widths)
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('LEFTPADDING', (0, 0), (0, 0), 12),
        ('RIGHTPADDING', (-1, 0), (-1, 0), 12),
        # Item row
        ('BACKGROUND', (0, 1), (-1, 1), WHITE),
        ('TOPPADDING', (0, 1), (-1, 1), 12),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 12),
        ('LEFTPADDING', (0, 1), (0, 1), 12),
        ('RIGHTPADDING', (-1, 1), (-1, 1), 12),
        # Total row
        ('BACKGROUND', (0, 2), (-1, 2), LIGHT_BG),
        ('TOPPADDING', (0, 2), (-1, 2), 10),
        ('BOTTOMPADDING', (0, 2), (-1, 2), 10),
        ('LEFTPADDING', (0, 2), (0, 2), 12),
        ('RIGHTPADDING', (-1, 2), (-1, 2), 12),
        # Borders
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, BORDER),
        ('LINEBELOW', (0, 2), (-1, 2), 1, BRAND_BLUE),
        # Valign
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    Story.append(items_table)
    Story.append(Spacer(1, 30))

    # ═══════════════════════════════════════════════════
    # 5. AMOUNT DUE BOX
    # ═══════════════════════════════════════════════════
    status_text = invoice.status.upper() if invoice.status else 'UNPAID'
    due_label = "AMOUNT PAID" if status_text in ('PAID', 'COMPLETED') else "AMOUNT DUE"

    due_data = [[
        Paragraph(f'<b>{due_label}</b>', ParagraphStyle('due_l', parent=styles['Normal'], fontSize=12, fontName='Helvetica-Bold', textColor=WHITE)),
        Paragraph(f'<b>{formatted_amount}</b>', ParagraphStyle('due_v', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_RIGHT)),
    ]]
    due_bg = colors.HexColor('#28A745') if status_text in ('PAID', 'COMPLETED') else BRAND_ACCENT
    due_table = Table(due_data, colWidths=[page_width * 0.5, page_width * 0.5])
    due_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), due_bg),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (0, -1), 16),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 16),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    Story.append(due_table)
    Story.append(Spacer(1, 40))

    # ═══════════════════════════════════════════════════
    # 6. FOOTER
    # ═══════════════════════════════════════════════════
    Story.append(HRFlowable(
        width='100%', thickness=0.5,
        color=BORDER, spaceAfter=10, spaceBefore=10
    ))
    Story.append(Paragraph(
        'Thank you for choosing Hyrind! For questions, contact billing@hyrind.com',
        styles['FooterNote']
    ))
    Story.append(Spacer(1, 4))
    Story.append(Paragraph(
        f'Page 1 of 1',
        styles['FooterNote']
    ))

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
        # 1. Get or create the default plan
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

        # 2. Get or create the subscription for this candidate
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
        
        # If it already existed but was canceled/unpaid, we might want to reactivate it as pending
        if not created and sub.status in ('canceled', 'unpaid'):
            sub.status = 'pending_payment'
            sub.save(update_fields=['status'])
            
    return sub
