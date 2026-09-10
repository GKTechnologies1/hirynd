"""
Reconcile stale Razorpay orders that were captured on Razorpay but never
recorded in the Hyrind database.  Designed to run as a periodic cron job
(e.g. every 15 minutes) as a safety net behind the webhook + client-side
verification flow.

Usage:
    python manage.py reconcile_payments            # default: check orders older than 30 min
    python manage.py reconcile_payments --age 60   # check orders older than 60 min
    python manage.py reconcile_payments --dry-run  # preview only, no changes
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Finds RazorpayOrder records stuck in "created" status and verifies '
        'their actual payment status with Razorpay.  Fulfils any that were '
        'captured but never recorded locally.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--age', type=int, default=30,
            help='Only check orders older than AGE minutes (default: 30).'
        )
        parser.add_argument(
            '--dry-run', action='store_true', default=False,
            help='Preview what would be reconciled without making changes.'
        )

    def handle(self, *args, **options):
        from billing.models import RazorpayOrder, Payment
        from billing.services import PaymentService, AddonService
        from billing.views import _get_razorpay_client

        age_minutes = options['age']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(minutes=age_minutes)

        stale_orders = RazorpayOrder.objects.filter(
            status='created',
            created_at__lt=cutoff,
        ).select_related('candidate', 'candidate__user', 'subscription')

        total = stale_orders.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No stale orders found. Everything is in sync.'))
            return

        self.stdout.write(f'Found {total} stale order(s) older than {age_minutes} minutes.')

        razorpay_client, _ = _get_razorpay_client()
        if razorpay_client is None:
            self.stderr.write(self.style.ERROR('Razorpay client not configured. Cannot reconcile.'))
            return

        reconciled = 0
        failed = 0
        skipped = 0

        for order in stale_orders:
            try:
                # Fetch the order status from Razorpay
                rz_data = razorpay_client.order.fetch(order.razorpay_order_id)
                rz_status = rz_data.get('status', '')

                if rz_status != 'paid':
                    self.stdout.write(
                        f'  Order {order.razorpay_order_id} — Razorpay status: {rz_status} (not paid). Skipping.'
                    )
                    # If Razorpay says the order has been attempted but not paid,
                    # mark it as failed locally so it's not re-checked every cycle
                    if rz_status in ('attempted',) and order.created_at < (timezone.now() - timedelta(hours=24)):
                        if not dry_run:
                            order.status = 'failed'
                            order.save(update_fields=['status'])
                            self.stdout.write(f'    → Marked as failed (stale > 24h).')
                    skipped += 1
                    continue

                # Order is paid on Razorpay — find the payment ID
                rz_payments = razorpay_client.order.payments(order.razorpay_order_id)
                items = rz_payments.get('items', [])
                captured_payment = None
                for item in items:
                    if item.get('status') == 'captured':
                        captured_payment = item
                        break

                if not captured_payment:
                    self.stdout.write(
                        f'  Order {order.razorpay_order_id} — Razorpay says paid but no captured payment found. Skipping.'
                    )
                    skipped += 1
                    continue

                razorpay_payment_id = captured_payment['id']

                self.stdout.write(
                    f'  Order {order.razorpay_order_id} — PAID on Razorpay '
                    f'(payment_id={razorpay_payment_id}). '
                    f'Candidate: {order.candidate.user.email}'
                )

                if dry_run:
                    self.stdout.write(self.style.WARNING('    → DRY RUN: would reconcile this order.'))
                    reconciled += 1
                    continue

                # Fulfil based on payment type
                if order.payment_type == 'subscription':
                    PaymentService.fulfill_subscription_payment(order, razorpay_payment_id)
                    self.stdout.write(self.style.SUCCESS(
                        f'    → Subscription payment fulfilled for {order.candidate.user.email}.'
                    ))
                else:
                    # Individual/addon payment
                    billing_payment_id = None
                    if isinstance(order.notes, dict):
                        billing_payment_id = order.notes.get('billing_payment_id')

                    if billing_payment_id:
                        try:
                            pay = Payment.objects.get(id=billing_payment_id, candidate=order.candidate)
                            if pay.status != 'completed':
                                pay.status = 'completed'
                                pay.payment_date = timezone.now().date()
                                pay.razorpay_order = order
                                pay.notes = (pay.notes or '') + f' | Razorpay: {razorpay_payment_id} (reconciled)'
                                pay.save(update_fields=['status', 'payment_date', 'razorpay_order', 'notes'])

                                if pay.addon_assignment:
                                    AddonService.complete_addon_payment(pay.addon_assignment, payment_reference=razorpay_payment_id)

                                try:
                                    AddonService.generate_invoice_for_addon(pay)
                                except Exception as inv_err:
                                    logger.error("Reconcile: Invoice gen failed for %s: %s", billing_payment_id, inv_err)
                        except Payment.DoesNotExist:
                            logger.warning("Reconcile: billing Payment %s not found", billing_payment_id)

                    # Mark order as paid
                    order.razorpay_payment_id = razorpay_payment_id
                    order.status = 'paid'
                    order.verified_at = timezone.now()
                    order.save(update_fields=['razorpay_payment_id', 'status', 'verified_at'])
                    self.stdout.write(self.style.SUCCESS(
                        f'    → Individual payment fulfilled for {order.candidate.user.email}.'
                    ))

                reconciled += 1

            except Exception as e:
                logger.error("Reconcile failed for order %s: %s", order.razorpay_order_id, str(e))
                self.stderr.write(self.style.ERROR(
                    f'  Order {order.razorpay_order_id} — ERROR: {e}'
                ))
                failed += 1

        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'\n{prefix}Reconciliation complete: '
            f'{reconciled} reconciled, {skipped} skipped, {failed} errors (out of {total} stale orders).'
        ))
