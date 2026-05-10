from django.core.management.base import BaseCommand
from users.models import User
from candidates.models import InterestedCandidate
from django.db import transaction

class Command(BaseCommand):
    help = 'Fixes missing sequence numbers for Users and InterestedCandidates'

    def handle(self, *args, **options):
        self.stdout.write('Fixing sequences...')
        
        with transaction.atomic():
            # Fix Users
            users_to_fix = User.objects.filter(seq_number__isnull=True).order_by('created_at')
            self.stdout.write(f'Found {users_to_fix.count()} users to fix.')
            for user in users_to_fix:
                user.save() # The updated save() method will handle it
                self.stdout.write(f'  Fixed user: {user.email} -> {user.display_id}')
            
            # Fix InterestedCandidates
            leads_to_fix = InterestedCandidate.objects.filter(seq_number__isnull=True).order_by('created_at')
            self.stdout.write(f'Found {leads_to_fix.count()} leads to fix.')
            for lead in leads_to_fix:
                lead.save() # The save() method handles it
                self.stdout.write(f'  Fixed lead: {lead.email} -> {lead.display_id}')
        
        self.stdout.write(self.style.SUCCESS('Successfully fixed all sequences.'))
