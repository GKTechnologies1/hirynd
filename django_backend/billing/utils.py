import io
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def generate_invoice_pdf(invoice):
    """
    Generates a PDF for the given invoice.
    Returns the binary PDF content (bytes).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightHeading', parent=styles['Heading1'], alignment=2))
    styles.add(ParagraphStyle(name='CompanyInfo', parent=styles['Normal'], fontSize=10, leading=12))
    styles.add(ParagraphStyle(name='InvoiceInfo', parent=styles['Normal'], alignment=2, fontSize=10, leading=12))

    Story = []

    # Header section
    header_table_data = [
        [
            Paragraph("<b>HYRIND INC.</b><br/>123 Innovation Drive<br/>Tech City, CA 94000<br/>billing@hyrind.com", styles['CompanyInfo']),
            Paragraph(f"<b>INVOICE</b><br/>#{str(invoice.id).split('-')[0].upper()}<br/>Date: {timezone.now().strftime('%b %d, %Y')}", styles['InvoiceInfo'])
        ]
    ]
    header_table = Table(header_table_data, colWidths=[200, 260])
    Story.append(header_table)
    Story.append(Spacer(1, 40))

    # Bill To
    candidate_name = getattr(invoice.candidate.user.profile, 'full_name', invoice.candidate.user.email) if hasattr(invoice.candidate.user, 'profile') else invoice.candidate.user.email
    bill_to_data = [
        [Paragraph(f"<b>BILL TO:</b><br/>{candidate_name}<br/>{invoice.candidate.user.email}", styles['Normal'])]
    ]
    bill_to_table = Table(bill_to_data, colWidths=[460])
    Story.append(bill_to_table)
    Story.append(Spacer(1, 20))

    # Invoice Details Table
    plan_name = invoice.subscription.plan_name if invoice.subscription else "Marketing Services"
    period_str = f"{invoice.period_start.strftime('%b %d, %Y')} - {invoice.period_end.strftime('%b %d, %Y')}"
    
    table_data = [
        ["DESCRIPTION", "PERIOD", "AMOUNT"]
    ]
    
    table_data.append([
        plan_name,
        period_str,
        f"${invoice.amount} {invoice.currency}"
    ])
    
    # Defaults to Paid/Unpaid styling
    status_text = invoice.status.upper()
    
    table_data.append(["", "TOTAL:", f"${invoice.amount} {invoice.currency}"])
    table_data.append(["", "STATUS:", status_text])

    invoice_table = Table(table_data, colWidths=[240, 140, 80])
    invoice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (1, -2), (1, -1), 'RIGHT'), # Align totals
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -3), 1, colors.HexColor('#e5e7eb')),
        ('LINEABOVE', (1, -2), (-1, -1), 1, colors.HexColor('#d1d5db')),
    ]))
    Story.append(invoice_table)
    Story.append(Spacer(1, 40))

    # Footer Notes
    Story.append(Paragraph("Thank you for choosing Hyrind!", styles['Normal']))

    doc.build(Story)
    
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value
