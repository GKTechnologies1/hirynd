import os
import sys
import django

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hyrind.settings')
django.setup()

from candidates.models import InterestedCandidate

def backfill_leads():
    leads = InterestedCandidate.objects.filter(seq_number__isnull=True).order_by('created_at')
    print(f"Found {leads.count()} leads to backfill.")
    
    count = 0
    for lead in leads:
        # Save will trigger the seq_number assignment
        lead.save()
        count += 1
        print(f"Backfilled lead: {lead.email} -> {lead.display_id}")
    
    print(f"Successfully backfilled {count} leads.")

if __name__ == "__main__":
    backfill_leads()
