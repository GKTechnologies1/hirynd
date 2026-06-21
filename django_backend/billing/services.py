import logging
from decimal import Decimal
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.conf import settings
from candidates.models import Candidate
from notifications.utils import send_email, create_notification, get_styled_email_html
from .models import Subscription, SubscriptionPlan, SubscriptionAddon, SubscriptionAddonAssignment, Payment, RazorpayOrder, Invoice, PurchaseHistory
from .utils import generate_invoice_pdf

logger = logging.getLogger(__name__)

def _user_name(user):
    if hasattr(user, 'profile') and getattr(user.profile, 'full_name', None):
        return user.profile.full_name
    return user.email

class NotificationService:
    @staticmethod
    def send_subscription_reminder(user, days_left, plan_name, email_type=None):
        """Send warning/reminder before subscription expiry."""
        try:
            name = _user_name(user)
            if days_left == 0:
                subject = f"Payment Due Today: Hyrind Subscription Renewal - {plan_name}"
                content = f"<p>This is a reminder that payment for your subscription plan <strong>{plan_name}</strong> is due today.</p>" \
                          f"<p>Please log in and complete the payment to avoid any interruption to your marketing services.</p>"
                notif_msg = f"Your subscription for {plan_name} is due today. Please make a payment."
            else:
                subject = f"Your Hyrind Subscription is Expiring Soon: {plan_name}"
                content = f"<p>This is a reminder that your subscription plan <strong>{plan_name}</strong> will renew or expire in <strong>{days_left} days</strong>.</p>" \
                          f"<p>Please ensure your payment method is up to date or log in to make a payment to avoid interruption.</p>"
                notif_msg = f"Your subscription for {plan_name} expires in {days_left} days. Please complete payment."
            
            html = get_styled_email_html(name, content, action_label="Pay Now", action_url="/candidate-dashboard/payments")
            resolved_email_type = email_type or f"sub_rem_{days_left}"
            send_email(user.email, subject, html, email_type=resolved_email_type)
            create_notification(user, "Subscription Renewal Reminder", notif_msg, link="/candidate-dashboard/payments")
            logger.info(f"Renewal reminder ({days_left} days) sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send renewal reminder to {user.email}: {e}")

    @staticmethod
    def send_subscription_expired_notification(user, plan_name):
        """Send notification when subscription shifts to Pending Payment."""
        try:
            name = _user_name(user)
            subject = f"Payment Required: Hyrind Subscription Expired"
            content = f"<p>Your subscription to plan <strong>{plan_name}</strong> has expired and is now awaiting payment.</p>" \
                      f"<p>To keep your marketing services and profile active, please log in and make a payment.</p>"
            html = get_styled_email_html(name, content, action_label="Pay Now", action_url="/candidate-dashboard/payments")
            send_email(user.email, subject, html)
            create_notification(user, "Subscription Payment Required", f"Your subscription for {plan_name} has expired. Please make a payment to continue.", link="/candidate-dashboard/payments")
        except Exception as e:
            logger.error(f"Failed to send subscription expired notification to {user.email}: {e}")

    @staticmethod
    def send_addon_assigned_notification(user, addon_name, amount):
        """Send notification when an addon is assigned."""
        try:
            name = _user_name(user)
            subject = f"Payment Required: Add-On Service Assigned - {addon_name}"
            content = f"<p>A new addon service <strong>{addon_name}</strong> has been assigned to your profile for a fee of <strong>USD {amount}</strong>.</p>" \
                      f"<p>Please log in and complete the payment to activate this service.</p>"
            html = get_styled_email_html(name, content, action_label="Pay Now", action_url="/candidate-dashboard/payments")
            send_email(user.email, subject, html)
            create_notification(user, "Add-On Assigned", f"Addon '{addon_name}' has been assigned to your profile. Please make a payment of ${amount} to activate.", link="/candidate-dashboard/payments")
        except Exception as e:
            logger.error(f"Failed to send addon assigned notification to {user.email}: {e}")


class SubscriptionService:
    @staticmethod
    def assign_subscription(candidate, plan, custom_amount=None, billing_cycle=None, admin_notes=None, assigned_by=None):
        """Admin assigns a base SubscriptionPlan to a candidate."""
        amount = custom_amount if custom_amount is not None else plan.amount
        cycle = billing_cycle or plan.billing_cycle

        subscription, created = Subscription.objects.get_or_create(
            candidate=candidate,
            defaults={
                'plan': plan,
                'plan_name': plan.name,
                'amount': amount,
                'currency': plan.currency,
                'billing_cycle': cycle,
                'status': 'pending_payment',
                'assigned_by': assigned_by,
                'payment_initiated_at': timezone.now(),
            }
        )

        if not created:
            subscription.plan = plan
            subscription.plan_name = plan.name
            subscription.amount = amount
            subscription.currency = plan.currency
            subscription.billing_cycle = cycle
            subscription.assigned_by = assigned_by
            if subscription.status != 'active':
                subscription.status = 'pending_payment'
                subscription.payment_initiated_at = timezone.now()
            subscription.save()

        # Generate a pending payment for the subscription if not active
        if subscription.status != 'active':
            # Clean up other pending subscription payments to prevent duplicate billing orders
            Payment.objects.filter(
                candidate=candidate,
                status='pending',
                payment_type='monthly_service'
            ).delete()

            notes_str = f"Base Subscription Fee: {plan.name}"
            if admin_notes:
                notes_str += f" | Admin Notes: {admin_notes}"

            Payment.objects.create(
                candidate=candidate,
                subscription=subscription,
                amount=amount,
                currency=plan.currency,
                payment_type='monthly_service',
                status='pending',
                notes=notes_str,
                recorded_by=assigned_by
            )

            # Notify the candidate
            create_notification(
                candidate.user, 'Payment Required',
                f'Your subscription plan "{plan.name}" has been assigned. Please complete payment to continue.',
                link='/candidate-dashboard/payments',
            )
            try:
                send_email(
                    candidate.user.email, 'Action Required: Complete Your Payment',
                    get_styled_email_html(
                        _user_name(candidate.user),
                        f'<p>Your Hyrind plan <strong>{plan.name}</strong> ({plan.currency} {amount}) has been assigned. '
                        f'Please log in and complete the payment to proceed.</p>',
                        action_label="Pay Now",
                        action_url="/candidate-dashboard/payments"
                    )
                )
            except Exception as e:
                logger.error(f"Failed to send email to {candidate.user.email}: {e}")

        return subscription

    @staticmethod
    def activate_subscription(subscription, payment_reference=None):
        """Activate the subscription and heal candidate status."""
        candidate = subscription.candidate
        subscription.status = 'active'
        subscription.last_payment_at = timezone.now()
        subscription.start_date = timezone.now().date()

        cycle = subscription.billing_cycle or 'monthly'
        if cycle == 'monthly':
            subscription.next_billing_at = timezone.now().date() + relativedelta(months=1)
        elif cycle == 'quarterly':
            subscription.next_billing_at = timezone.now().date() + relativedelta(months=3)
        elif cycle == 'annual':
            subscription.next_billing_at = timezone.now().date() + relativedelta(years=1)
        else:
            subscription.next_billing_at = timezone.now().date() + relativedelta(months=1)

        subscription.save(update_fields=['status', 'last_payment_at', 'start_date', 'next_billing_at'])

        # Sync candidate status
        if candidate.status in ('payment_pending', 'roles_confirmed', 'pending_payment', 'past_due', 'intake_submitted'):
            if candidate.assignments.filter(is_active=True).exists() and candidate.credentials.exists():
                candidate.status = 'active_marketing'
            elif candidate.credentials.exists():
                candidate.status = 'credentials_submitted'
            else:
                candidate.status = 'payment_completed'
            candidate.save(update_fields=['status'])

    @staticmethod
    def cancel_subscription(subscription):
        """Cancel subscription."""
        subscription.status = 'canceled'
        subscription.canceled_at = timezone.now()
        subscription.save(update_fields=['status', 'canceled_at'])


class AddonService:
    @staticmethod
    def assign_addon(candidate, addon, custom_amount=None, admin_notes=None, added_by=None, activate_immediately=False):
        """Assigns an addon to a candidate independently."""
        amount = custom_amount if custom_amount is not None else addon.amount

        # Check if already assigned pending addon (not yet paid)
        existing = SubscriptionAddonAssignment.objects.filter(
            candidate=candidate,
            addon=addon,
            status='pending'
        ).exists()

        if existing and not activate_immediately:
            raise ValueError(f"Addon '{addon.name}' is already assigned and awaiting payment.")

        status_val = 'completed' if activate_immediately else 'pending'

        # Get user's base subscription (can be null/empty, but fetch it if it exists for backward compatibility)
        subscription = getattr(candidate, 'subscription', None)

        assignment = SubscriptionAddonAssignment.objects.create(
            candidate=candidate,
            subscription=subscription,
            addon=addon,
            amount=amount,
            added_by=added_by,
            status=status_val
        )

        payment_status = 'completed' if activate_immediately else 'pending'

        notes_str = f"Add-on Fee: {addon.name}"
        if admin_notes:
            notes_str += f" | Admin Notes: {admin_notes}"
        if activate_immediately:
            notes_str += " (Activated immediately by admin)"

        payment = Payment.objects.create(
            candidate=candidate,
            subscription=subscription,
            addon_assignment=assignment,
            amount=amount,
            currency=addon.currency,
            payment_type='addon',
            status=payment_status,
            payment_date=timezone.now().date() if activate_immediately else None,
            notes=notes_str,
            recorded_by=added_by
        )

        if activate_immediately:
            # Generate invoice for the manual activation
            try:
                AddonService.generate_invoice_for_addon(payment)
            except Exception as e:
                logger.error(f"Fulfillment failed for manually activated addon: {e}")
        else:
            # Send notification
            NotificationService.send_addon_assigned_notification(candidate.user, addon.name, amount)

        return assignment

    @staticmethod
    def complete_addon_payment(addon_assignment, payment_reference=None):
        """Transition addon assignment to completed."""
        addon_assignment.status = 'completed'
        addon_assignment.save(update_fields=['status'])

    @staticmethod
    def generate_invoice_for_addon(payment, payment_reference=None):
        """Create PDF receipt invoice for paid addon."""
        period_start = payment.payment_date or timezone.now().date()
        period_end = period_start + relativedelta(months=1)
        description = payment.notes or f"Add-on: {payment.addon_assignment.addon.name if payment.addon_assignment else 'Service'}"

        resolved_ref = payment_reference or (payment.razorpay_order.razorpay_payment_id if payment.razorpay_order else f"ADMIN-{payment.id}")

        invoice = Invoice.objects.create(
            subscription=payment.subscription,
            candidate=payment.candidate,
            amount=payment.amount,
            currency=payment.currency,
            period_start=period_start,
            period_end=period_end,
            status='paid',
            paid_at=timezone.now(),
            payment_reference=resolved_ref,
            description=description,
            tax_amount=Decimal('0.00'),
            tax_rate=Decimal('0.00'),
        )

        # Record the completed transaction in PurchaseHistory
        purchased_by_val = 'Candidate'
        if payment.razorpay_order:
            purchased_by_val = 'Candidate'
        elif payment.recorded_by:
            purchased_by_val = f"Admin ({_user_name(payment.recorded_by)})"
        elif payment.addon_assignment and payment.addon_assignment.added_by:
            purchased_by_val = f"Admin ({_user_name(payment.addon_assignment.added_by)})"

        PurchaseHistoryService.record_purchase(
            candidate=payment.candidate,
            service_name=payment.addon_assignment.addon.name if payment.addon_assignment else 'Service Add-on',
            amount=payment.amount,
            currency=payment.currency,
            addon_assignment=payment.addon_assignment,
            payment=payment,
            invoice=invoice,
            transaction_id=resolved_ref,
            purchased_by=purchased_by_val
        )

        try:
            pdf_bytes = generate_invoice_pdf(invoice)
            attachments = [{
                "filename": f"hyrind_invoice_{str(invoice.id).split('-')[0]}.pdf",
                "content": list(pdf_bytes),
            }]

            # Remove reference details from description for subjects and general body references
            clean_desc = description
            if " | Razorpay" in clean_desc:
                clean_desc = clean_desc.split(" | Razorpay")[0]
            if " | ADMIN-" in clean_desc:
                clean_desc = clean_desc.split(" | ADMIN-")[0]

            send_email(
                payment.candidate.user.email,
                f'Payment Confirmed — {clean_desc} — Hyrind',
                get_styled_email_html(
                    _user_name(payment.candidate.user),
                    f'<p>Your payment of <strong>{payment.currency} {payment.amount}</strong> '
                    f'for <strong>{clean_desc}</strong> has been received and confirmed. Please find your receipt attached.</p>',
                    action_label='View Invoices', action_url='/candidate-dashboard/billing',
                ),
                attachments=attachments,
            )

            # Notify Admin/Operations
            try:
                from django.utils.html import escape
                admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'hyrind.operations@gmail.com')
                cand_name = _user_name(payment.candidate.user)
                escaped_cand_name = escape(cand_name)
                escaped_clean_desc = escape(clean_desc)
                send_email(
                    to=admin_email,
                    subject=f'Payment Completed: {escaped_clean_desc} — {escaped_cand_name}',
                    html=f'<p><strong>{escaped_cand_name}</strong> ({payment.candidate.user.email}) has successfully completed a payment of <strong>{payment.currency} {payment.amount}</strong> for <strong>{escaped_clean_desc}</strong>.</p>'
                         f'<p><strong>Service Type:</strong> Addon Service ({escaped_clean_desc})</p>'
                         f'<p><strong>Payment Reference:</strong> {escape(resolved_ref)}</p>'
                         f'<p><a href="{settings.SITE_URL}/admin-dashboard/candidates/{payment.candidate.id}">View Candidate in Admin</a></p>',
                    email_type='admin_notification'
                )
            except Exception as admin_err:
                logger.error(f"Failed to send addon payment notification to admin: {admin_err}")
        except Exception as e:
            logger.error(f"Failed to generate invoice PDF or send email: {e}")


class PurchaseHistoryService:
    @staticmethod
    def record_purchase(candidate, service_name, amount, currency='USD', addon_assignment=None, payment=None, invoice=None, transaction_id=None, purchased_by='Candidate'):
        """Creates a record in the purchase history ledger."""
        inv_ref = f"INV{str(invoice.id)[:8].upper()}" if invoice else None
        return PurchaseHistory.objects.create(
            candidate=candidate,
            addon_assignment=addon_assignment,
            payment=payment,
            invoice=invoice,
            service_name=service_name,
            amount=amount,
            currency=currency,
            payment_status='completed',
            transaction_id=transaction_id or (payment.razorpay_order.razorpay_payment_id if payment and payment.razorpay_order else None),
            invoice_reference=inv_ref,
            purchased_by=purchased_by
        )


class PaymentService:
    @staticmethod
    def create_razorpay_order_for_subscription(candidate, subscription):
        """Creates Razorpay order strictly for core subscription plan."""
        if subscription.status == 'active':
            raise ValueError('Subscription already active')

        total_amount = float(subscription.amount)
        total_paise = int(total_amount * 100)

        # Get Razorpay client
        from .views import _get_razorpay_client
        razorpay_client, key_id = _get_razorpay_client()
        if razorpay_client is None:
            raise ValueError('Payment gateway not configured')

        try:
            rz_order = razorpay_client.order.create({
                'amount': total_paise,
                'currency': subscription.currency,
                'receipt': f'hyrind_{str(candidate.id)[:8]}',
                'notes': {'plan': subscription.plan_name, 'candidate': str(candidate.id), 'type': 'subscription'},
            })
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise ValueError(f"Razorpay order failed: {e}")

        # Update older pending orders to failed
        RazorpayOrder.objects.filter(candidate=candidate, status='created', payment_type='subscription').update(status='failed')

        rp_order = RazorpayOrder.objects.create(
            candidate=candidate,
            subscription=subscription,
            razorpay_order_id=rz_order['id'],
            amount=total_amount,
            currency=subscription.currency,
            payment_type='subscription',
            notes={'plan': subscription.plan_name},
        )

        return {
            'order_id': rz_order['id'],
            'amount': total_paise,
            'currency': subscription.currency,
            'key_id': key_id,
            'subscription_id': str(subscription.id),
            'internal_order_id': str(rp_order.id),
            'description': f'Hyrind | {subscription.plan_name}',
            'prefill': {
                'name': _user_name(candidate.user),
                'email': candidate.user.email,
                'contact': getattr(candidate.user.profile, 'phone', '') if hasattr(candidate.user, 'profile') else '',
            },
        }

    @staticmethod
    def verify_subscription_payment(candidate_id, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """Verifies signature and activates the base subscription."""
        try:
            rp_order = RazorpayOrder.objects.select_related('candidate', 'subscription').get(
                razorpay_order_id=razorpay_order_id
            )
        except RazorpayOrder.DoesNotExist:
            raise ValueError('Order not found')

        if str(rp_order.candidate_id) != str(candidate_id):
            raise ValueError('Forbidden order candidate mismatch')

        # Check Razorpay credentials
        from .views import _get_razorpay_client
        client, _ = _get_razorpay_client()
        if client:
            try:
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except Exception as e:
                raise ValueError(f"Signature mismatch: {e}")
        else:
            raise ValueError('Gateway not configured')

        # Mark paid
        rp_order.razorpay_payment_id = razorpay_payment_id
        rp_order.razorpay_signature = razorpay_signature
        rp_order.status = 'paid'
        rp_order.verified_at = timezone.now()
        rp_order.save()

        sub = rp_order.subscription
        candidate = rp_order.candidate
        SubscriptionService.activate_subscription(sub, payment_reference=razorpay_payment_id)

        # Update related Payment records
        pending_payments = Payment.objects.filter(
            candidate_id=candidate_id,
            status='pending',
            payment_type='monthly_service'
        )

        if not pending_payments.exists():
            Payment.objects.create(
                candidate=candidate,
                subscription=sub,
                razorpay_order=rp_order,
                amount=rp_order.amount,
                currency=rp_order.currency,
                payment_type='monthly_service',
                status='completed',
                payment_date=timezone.now().date(),
                notes=f"Base Subscription Fee: {sub.plan_name if sub else 'Standard'} | Razorpay payment {razorpay_payment_id}"
            )
        else:
            for payment in pending_payments:
                payment.razorpay_order = rp_order
                payment.amount = rp_order.amount
                payment.currency = rp_order.currency
                payment.status = 'completed'
                payment.payment_date = timezone.now().date()
                payment.notes = (payment.notes or '') + f' | Razorpay payment {razorpay_payment_id}'
                payment.save()

        # Fulfil Invoice Generation
        try:
            invoice = Invoice.objects.create(
                subscription=sub,
                candidate=candidate,
                amount=rp_order.amount,
                currency=rp_order.currency,
                period_start=timezone.now().date(),
                period_end=sub.next_billing_at if sub else (timezone.now().date() + relativedelta(months=1)),
                status='paid',
                paid_at=timezone.now(),
                payment_reference=razorpay_payment_id,
                description='Marketing Service Fee',
                tax_amount=Decimal('0.00'),
                tax_rate=Decimal('0.00'),
            )

            pdf_bytes = generate_invoice_pdf(invoice)
            attachments = [{
                "filename": f"hyrind_invoice_{str(invoice.id).split('-')[0]}.pdf",
                "content": list(pdf_bytes)
            }]

            send_email(
                candidate.user.email, 'Payment Confirmed & Invoice - Hyrind',
                get_styled_email_html(
                    _user_name(candidate.user),
                    f'<p>We received your payment of <strong>{rp_order.currency} {rp_order.amount}</strong>. '
                    f'Your subscription is now <strong>Active</strong>. Please find your receipt attached.</p>',
                    action_label="Go to Dashboard",
                    action_url="/candidate-dashboard"
                ),
                attachments=attachments,
            )

            # Notify Admin/Operations
            try:
                from django.utils.html import escape
                admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'hyrind.operations@gmail.com')
                cand_name = _user_name(candidate.user)
                escaped_cand_name = escape(cand_name)
                send_email(
                    to=admin_email,
                    subject=f'Payment Completed: Marketing Service Fee — {escaped_cand_name}',
                    html=f'<p><strong>{escaped_cand_name}</strong> ({candidate.user.email}) has successfully completed a payment of <strong>{rp_order.currency} {rp_order.amount}</strong>.</p>'
                         f'<p><strong>Service Type:</strong> Core Subscription Fee ({escape(sub.plan_name) if sub else "Marketing Service Fee"})</p>'
                         f'<p><strong>Payment Reference:</strong> {escape(razorpay_payment_id)}</p>'
                         f'<p><a href="{settings.SITE_URL}/admin-dashboard/candidates/{candidate.id}">View Candidate in Admin</a></p>',
                    email_type='admin_notification'
                )
            except Exception as admin_err:
                logger.error(f"Failed to send payment notification to admin: {admin_err}")
        except Exception as e:
            logger.error(f"Fulfillment invoice creation failed: {e}")

        return rp_order

    @staticmethod
    def create_razorpay_order_for_payment(candidate, payment):
        """Creates Razorpay order for an individual pending payment (addon)."""
        if payment.status != 'pending':
            raise ValueError(f"Payment is already {payment.status}")

        total_amount = float(payment.amount)
        currency = payment.currency or 'USD'
        total_paise = int(total_amount * 100)
        description = payment.notes or payment.payment_type.replace('_', ' ').title()

        from .views import _get_razorpay_client
        razorpay_client, key_id = _get_razorpay_client()
        if razorpay_client is None:
            raise ValueError('Payment gateway not configured')

        try:
            rz_order = razorpay_client.order.create({
                'amount': total_paise,
                'currency': currency,
                'receipt': f'hyrind_pay_{str(payment.id)[:8]}',
                'notes': {'payment_type': payment.payment_type, 'candidate': str(candidate.id), 'payment_id': str(payment.id)},
            })
        except Exception as e:
            logger.error(f"Razorpay order failed for individual payment: {e}")
            raise ValueError(f"Razorpay failed: {e}")

        RazorpayOrder.objects.filter(candidate=candidate, status='created', notes__billing_payment_id=str(payment.id)).update(status='failed')

        rp_order = RazorpayOrder.objects.create(
            candidate=candidate,
            subscription=payment.subscription,
            razorpay_order_id=rz_order['id'],
            amount=total_amount,
            currency=currency,
            payment_type=payment.payment_type,
            notes={'billing_payment_id': str(payment.id)},
        )

        return {
            'order_id': rz_order['id'],
            'amount': total_paise,
            'currency': currency,
            'key_id': key_id,
            'internal_order_id': str(rp_order.id),
            'billing_payment_id': str(payment.id),
            'description': f'Hyrind | {description}',
            'prefill': {
                'name': _user_name(candidate.user),
                'email': candidate.user.email,
                'contact': getattr(candidate.user.profile, 'phone', '') if hasattr(candidate.user, 'profile') else '',
            },
        }

    @staticmethod
    def verify_individual_payment(candidate_id, payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """Verifies signature and completes individual payments (addons)."""
        try:
            candidate = Candidate.objects.select_related('user').get(id=candidate_id)
        except Candidate.DoesNotExist:
            raise ValueError('Candidate not found')

        try:
            pay = Payment.objects.get(id=payment_id, candidate=candidate)
        except Payment.DoesNotExist:
            raise ValueError('Payment not found')

        try:
            rp_order = RazorpayOrder.objects.get(razorpay_order_id=razorpay_order_id, candidate=candidate)
        except RazorpayOrder.DoesNotExist:
            raise ValueError('Order not found')

        from .views import _get_razorpay_client
        client, _ = _get_razorpay_client()
        if client:
            try:
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except Exception as e:
                raise ValueError(f"Signature mismatch: {e}")
        else:
            raise ValueError('Gateway not configured')

        # Verify order
        rp_order.razorpay_payment_id = razorpay_payment_id
        rp_order.razorpay_signature = razorpay_signature
        rp_order.status = 'paid'
        rp_order.verified_at = timezone.now()
        rp_order.save()

        # Update Payment
        pay.status = 'completed'
        pay.payment_date = timezone.now().date()
        pay.razorpay_order = rp_order
        pay.notes = (pay.notes or '') + f' | Razorpay: {razorpay_payment_id}'
        pay.save(update_fields=['status', 'payment_date', 'razorpay_order', 'notes'])

        # If this is linked to an addon assignment, complete it
        if pay.addon_assignment:
            AddonService.complete_addon_payment(pay.addon_assignment, payment_reference=razorpay_payment_id)

        # Trigger invoice generation
        try:
            AddonService.generate_invoice_for_addon(pay)
        except Exception as e:
            logger.error(f"Fulfillment invoice failed for addon payment: {e}")

        return pay


class SubscriptionLifecycleManager:
    @staticmethod
    def get_days_before_expiry_config():
        """Retrieve list of days for upcoming warnings from settings."""
        # Defaults to [5, 3, 0] to support configurable intervals
        return getattr(settings, 'SUBSCRIPTION_REMINDER_DAYS', [5, 3, 0])

    @staticmethod
    def check_and_update_all_subscriptions():
        """
        Iterates over all subscriptions:
        - transition 'active' to 'expiring_soon' within configured reminder days
        - transition 'active' or 'expiring_soon' to 'pending_payment' upon expiry
        - transition 'pending_payment' to 'expired' if grace period ends without payment
        """
        today = timezone.now().date()
        reminder_config = SubscriptionLifecycleManager.get_days_before_expiry_config()
        reminder_days_list = reminder_config if isinstance(reminder_config, list) else [reminder_config]
        max_reminder_days = max(reminder_days_list) if reminder_days_list else 5
        
        # 1. Update active subscriptions
        active_subs = Subscription.objects.filter(status__in=['active', 'expiring_soon'])
        for sub in active_subs:
            if not sub.next_billing_at:
                continue
                
            days_until_expiry = (sub.next_billing_at - today).days
            
            if days_until_expiry <= 0:
                # Next billing date reached or passed: transition to pending_payment (awaiting renewal)
                sub.status = 'pending_payment'
                sub.save(update_fields=['status'])
                
                # Update candidate status
                candidate = sub.candidate
                if candidate.status in ('payment_completed', 'credentials_submitted', 'active_marketing'):
                    candidate.status = 'past_due'
                    candidate.save(update_fields=['status'])
                
                if days_until_expiry == 0:
                    # On the due date: send the "Payment Due Today" reminder (0 days left)
                    unique_email_type = f"sub_rem_0_{sub.id}_{sub.next_billing_at}"
                    from notifications.models import EmailLog
                    if not EmailLog.objects.filter(recipient_email=candidate.user.email, email_type=unique_email_type, status__in=['sent', 'skipped']).exists():
                        NotificationService.send_subscription_reminder(
                            candidate.user,
                            0,
                            sub.plan_name,
                            email_type=unique_email_type
                        )
                else:
                    # Past the due date: send standard expired notification
                    NotificationService.send_subscription_expired_notification(candidate.user, sub.plan_name)
                    logger.info(f"Subscription for candidate {candidate.user.email} marked pending_payment due to expiry.")
                
            elif 0 < days_until_expiry <= max_reminder_days:
                # Transition to expiring_soon
                if sub.status != 'expiring_soon':
                    sub.status = 'expiring_soon'
                    sub.save(update_fields=['status'])
                    
                # Check if this day is in our configured list
                if days_until_expiry in reminder_days_list:
                    unique_email_type = f"sub_rem_{days_until_expiry}_{sub.id}_{sub.next_billing_at}"
                    from notifications.models import EmailLog
                    if not EmailLog.objects.filter(recipient_email=sub.candidate.user.email, email_type=unique_email_type, status__in=['sent', 'skipped']).exists():
                        NotificationService.send_subscription_reminder(
                            sub.candidate.user,
                            days_until_expiry,
                            sub.plan_name,
                            email_type=unique_email_type
                        )
                    
        # 2. Check pending_payment subscriptions for grace period expiry
        pending_subs = Subscription.objects.filter(status='pending_payment')
        for sub in pending_subs:
            if not sub.next_billing_at:
                continue
                
            grace_days = sub.grace_days
            expiry_limit = sub.next_billing_at + relativedelta(days=grace_days)
            
            if today > expiry_limit:
                # Grace period expired: transition to expired!
                sub.status = 'expired'
                sub.save(update_fields=['status'])
                
                # Update candidate status
                candidate = sub.candidate
                candidate.status = 'past_due'
                candidate.save(update_fields=['status'])
                
                # Notify candidate
                try:
                    create_notification(
                        candidate.user, "Subscription Suspended",
                        f"Your subscription for {sub.plan_name} has expired and your services are suspended. Please pay immediately.",
                        link="/candidate-dashboard/payments"
                    )
                    send_email(
                        candidate.user.email, "Hyrind Subscription Suspended - Payment Overdue",
                        get_styled_email_html(
                            _user_name(candidate.user),
                            f"<p>Your grace period has ended, and your Hyrind subscription <strong>{sub.plan_name}</strong> is now officially <strong>Expired/Suspended</strong>.</p>"
                            f"<p>To reactivate your marketing services and candidate dashboard access, please log in and pay immediately.</p>",
                            action_label="Pay Now",
                            action_url="/candidate-dashboard/payments"
                        )
                    )
                except Exception as e:
                    logger.error(f"Failed to notify expired subscription: {e}")

    @staticmethod
    def send_upcoming_expiry_reminders():
        """Identify subscriptions expiring in configured days and trigger reminders."""
        today = timezone.now().date()
        reminder_config = SubscriptionLifecycleManager.get_days_before_expiry_config()
        reminder_days_list = reminder_config if isinstance(reminder_config, list) else [reminder_config]
        
        for days in reminder_days_list:
            if days <= 0:
                # Due date is handled during transition in check_and_update_all_subscriptions
                continue
            target_date = today + relativedelta(days=days)
            expiring_subs = Subscription.objects.filter(
                status__in=['active', 'expiring_soon'],
                next_billing_at=target_date
            )
            for sub in expiring_subs:
                unique_email_type = f"sub_rem_{days}_{sub.id}_{sub.next_billing_at}"
                from notifications.models import EmailLog
                if not EmailLog.objects.filter(recipient_email=sub.candidate.user.email, email_type=unique_email_type, status__in=['sent', 'skipped']).exists():
                    NotificationService.send_subscription_reminder(
                        sub.candidate.user,
                        days,
                        sub.plan_name,
                        email_type=unique_email_type
                    )
