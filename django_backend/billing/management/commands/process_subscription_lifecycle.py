from django.core.management.base import BaseCommand
from billing.services import SubscriptionLifecycleManager

class Command(BaseCommand):
    help = 'Processes subscription state transitions and renewal reminders'

    def handle(self, *args, **options):
        self.stdout.write('Running subscription lifecycle manager...')
        try:
            SubscriptionLifecycleManager.check_and_update_all_subscriptions()
            self.stdout.write(self.style.SUCCESS('Successfully processed subscription expirations and state updates.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to check/update subscriptions: {e}'))

        try:
            SubscriptionLifecycleManager.send_upcoming_expiry_reminders()
            self.stdout.write(self.style.SUCCESS('Successfully sent upcoming subscription renewal reminders.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send renewal reminders: {e}'))

        self.stdout.write(self.style.SUCCESS('Subscription lifecycle processing complete.'))
