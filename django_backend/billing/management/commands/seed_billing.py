from django.core.management.base import BaseCommand
from billing.models import SubscriptionPlan, SubscriptionAddon
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds initial billing plans and addons as per Hyrind Spec v4'

    def handle(self, *args, **options):
        self.stdout.write('Seeding billing plans...')
        
        # 1. Monthly Service Fee
        Plan, created = SubscriptionPlan.objects.get_or_create(
            name='Monthly Service Fee',
            defaults={
                'description': 'Standard monthly service fee for Hyrind platform access.',
                'amount': Decimal('400.00'),
                'currency': 'USD',
                'billing_cycle': 'monthly',
                'is_active': True,
                'is_base': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created plan: {Plan.name}'))
        else:
            Plan.amount = Decimal('400.00')
            Plan.save()
            self.stdout.write(f'Updated plan: {Plan.name} to $400')

        # 2. Addons (Dynamic Pricing)
        addons = [
            ('Mock Practice Fee', 'Dynamic fee for mock interview practice sessions.'),
            ('Interview Support Fee', 'Dynamic fee for live interview support.'),
            ('Operations Support Fee', 'Dynamic fee for specialized operational assistance.'),
        ]

        for name, desc in addons:
            addon, created = SubscriptionAddon.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'amount': Decimal('0.00'), # Dynamic by default
                    'currency': 'USD',
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created addon: {name}'))
            else:
                self.stdout.write(f'Addon already exists: {name}')

        self.stdout.write(self.style.SUCCESS('Billing seeding complete.'))
