import os
import sys
import django

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hyrind.settings')
django.setup()

from users.models import User, ROLE_PREFIX_MAP
from candidates.models import InterestedCandidate
from billing.models import Payment, Invoice

def master_backfill():
    # 1. Backfill Users
    print("--- Backfilling Users ---")
    roles = User.objects.values_list('role', flat=True).distinct()
    for role in roles:
        users = User.objects.filter(role=role, seq_number__isnull=True).order_by('created_at')
        from django.db.models import Max
        current_max = User.objects.filter(role=role, seq_number__isnull=False).aggregate(Max('seq_number'))['seq_number__max'] or 0
        for i, user in enumerate(users, start=current_max + 1):
            user.seq_number = i
            user.save(update_fields=['seq_number'])
            print(f"User: {user.email} -> {user.display_id}")

    # 2. Backfill InterestedCandidates (Leads)
    print("\n--- Backfilling Interested Candidates ---")
    leads = InterestedCandidate.objects.filter(seq_number__isnull=True).order_by('created_at')
    from django.db.models import Max
    current_max = InterestedCandidate.objects.filter(seq_number__isnull=False).aggregate(Max('seq_number'))['seq_number__max'] or 0
    for i, lead in enumerate(leads, start=current_max + 1):
        lead.seq_number = i
        lead.save(update_fields=['seq_number'])
        print(f"Lead: {lead.email} -> {lead.display_id}")

    # 3. Backfill Payments
    print("\n--- Backfilling Payments ---")
    payments = Payment.objects.filter(seq_number__isnull=True).order_by('created_at')
    current_max = Payment.objects.filter(seq_number__isnull=False).aggregate(Max('seq_number'))['seq_number__max'] or 0
    for i, payment in enumerate(payments, start=current_max + 1):
        payment.seq_number = i
        payment.save(update_fields=['seq_number'])
        print(f"Payment: {payment.id} -> {payment.display_id}")

    # 4. Backfill Invoices
    print("\n--- Backfilling Invoices ---")
    invoices = Invoice.objects.filter(seq_number__isnull=True).order_by('created_at')
    current_max = Invoice.objects.filter(seq_number__isnull=False).aggregate(Max('seq_number'))['seq_number__max'] or 0
    for i, invoice in enumerate(invoices, start=current_max + 1):
        invoice.seq_number = i
        invoice.save(update_fields=['seq_number'])
        print(f"Invoice: {invoice.id} -> {invoice.display_id}")

    print("\nMaster Backfill Completed Successfully.")

if __name__ == "__main__":
    master_backfill()
