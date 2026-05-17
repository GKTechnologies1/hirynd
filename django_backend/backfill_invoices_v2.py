import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hyrind.settings')
django.setup()

from billing.models import Payment, Invoice
from django.utils import timezone
from dateutil.relativedelta import relativedelta

pays = Payment.objects.filter(status__in=['completed', 'paid'])
count = 0

for pay in pays:
    ref1 = getattr(pay.razorpay_order, 'razorpay_payment_id', None) if getattr(pay, 'razorpay_order', None) else None
    ref2 = f'ADMIN-{pay.id}'
    
    if (ref1 and Invoice.objects.filter(payment_reference=ref1).exists()) or Invoice.objects.filter(payment_reference=ref2).exists():
        continue
        
    period_start = pay.payment_date or timezone.now().date()
    period_end = period_start + relativedelta(months=1)
    description = pay.payment_type.replace('_', ' ').title()
    
    Invoice.objects.create(
        subscription=getattr(pay, 'subscription', None),
        candidate=pay.candidate,
        amount=pay.amount,
        currency=pay.currency,
        period_start=period_start,
        period_end=period_end,
        status='paid',
        paid_at=timezone.now(),
        payment_reference=ref1 or ref2,
        description=description
    )
    count += 1
    
print(f'Backfilled {count} invoices.')
