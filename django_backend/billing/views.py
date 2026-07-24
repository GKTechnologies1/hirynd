"""
Billing views  Razorpay integration, subscription-plan management,
per-candidate subscription lifecycle, and payment verification.
"""
import hashlib
import hmac
import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response


def _user_name(user):
    """Return display name for a user without relying on get_full_name()."""
    if hasattr(user, 'profile') and getattr(user.profile, 'full_name', None):
        return user.profile.full_name
    return user.email

from audit.utils import log_action
from candidates.models import Candidate
from notifications.utils import send_email, create_notification, get_styled_email_html
from users.permissions import IsAdmin, IsApproved

from .models import (
    Invoice, Payment, RazorpayOrder,
    Subscription, SubscriptionAddon, SubscriptionAddonAssignment, SubscriptionPlan,
    PurchaseHistory,
)
from .serializers import (
    InvoiceSerializer, PaymentSerializer, RazorpayOrderSerializer,
    SubscriptionAddonSerializer, SubscriptionPlanSerializer, SubscriptionSerializer,
    SubscriptionAddonAssignmentSerializer, PurchaseHistorySerializer,
)
from .services import SubscriptionService, AddonService, PaymentService, SubscriptionLifecycleManager, PurchaseHistoryService

from .utils import generate_invoice_pdf
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse

logger = logging.getLogger(__name__)


def _update_candidate_and_subscription_status(candidate, subscription):
    """
    Activates the subscription and dynamically updates candidate status
    based on active recruiter assignments and submitted credentials.
    """
    if subscription:
        subscription.status = 'active'
        subscription.last_payment_at = timezone.now()
        subscription.start_date = timezone.now().date()
        
        # Calculate next billing date based on cycle
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


def _get_razorpay_client():
    try:
        import razorpay
    except ImportError:
        logger.error("Razorpay library not found. Please install it.")
        return None, None
    
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    
    if not key_id or not key_secret:
        logger.warning("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in settings.")
        return None, None
        
    client = razorpay.Client(auth=(key_id, key_secret))
    return client, key_id


#  Subscription Plan CRUD 
@api_view(['GET'])
@permission_classes([IsApproved])
def list_plans(request):
    plans = SubscriptionPlan.objects.filter(is_active=True)
    return Response(SubscriptionPlanSerializer(plans, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_plan(request):
    serializer = SubscriptionPlanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    plan = serializer.save(created_by=request.user)
    log_action(request.user, 'plan_created', str(plan.id), 'subscription_plan', request.data)
    return Response(SubscriptionPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def manage_plan(request, plan_id):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        plan.is_active = False
        plan.save(update_fields=['is_active'])
        return Response({'detail': 'Plan deactivated'})
    serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


#  Subscription Addon CRUD 
@api_view(['GET'])
@permission_classes([IsApproved])
def list_addons(request):
    addons = SubscriptionAddon.objects.filter(is_active=True)
    return Response(SubscriptionAddonSerializer(addons, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_addon(request):
    serializer = SubscriptionAddonSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    addon = serializer.save(created_by=request.user)
    log_action(request.user, 'addon_created', str(addon.id), 'subscription_addon', request.data)
    return Response(SubscriptionAddonSerializer(addon).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def manage_addon(request, addon_id):
    try:
        addon = SubscriptionAddon.objects.get(id=addon_id)
    except SubscriptionAddon.DoesNotExist:
        return Response({'error': 'Addon not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        addon.is_active = False
        addon.save(update_fields=['is_active'])
        return Response({'detail': 'Addon deactivated'})
    serializer = SubscriptionAddonSerializer(addon, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


#  Candidate Subscription 
@api_view(['GET'])
@permission_classes([IsApproved])
def subscription_detail(request, candidate_id):
    try:
        sub = Subscription.objects.select_related('plan', 'candidate__user').prefetch_related(
            'addon_assignments__addon'
        ).get(candidate_id=candidate_id)
        return Response(SubscriptionSerializer(sub).data)
    except Subscription.DoesNotExist:
        # ── Auto-provision the $400 default plan for role-confirmed candidates ──
        # This handles candidates who confirmed roles before the automation was deployed,
        # or whose subscription was never manually created by admin.
        try:
            candidate = Candidate.objects.get(id=candidate_id)
            ELIGIBLE_FOR_DEFAULT = (
                'roles_confirmed', 'pending_payment',
                'roles_suggested', 'roles_published',
            )
            if candidate.status in ELIGIBLE_FOR_DEFAULT:
                from .utils import ensure_default_subscription
                sub = ensure_default_subscription(candidate)
                if sub:
                    logger.info(
                        "Auto-provisioned default subscription for candidate %s (status=%s)",
                        candidate_id, candidate.status,
                    )
                    # Re-fetch with all relations to ensure serialization works correctly
                    sub = Subscription.objects.select_related('plan', 'candidate__user').prefetch_related(
                        'addon_assignments__addon'
                    ).get(id=sub.id)
                    return Response(SubscriptionSerializer(sub).data)
        except Candidate.DoesNotExist:
            pass
        assignments = SubscriptionAddonAssignment.objects.filter(candidate_id=candidate_id).order_by('-added_at')
        return Response({
            'id': None,
            'status': None,
            'amount': 0.00,
            'currency': 'USD',
            'plan_name': None,
            'addon_assignments': SubscriptionAddonAssignmentSerializer(assignments, many=True).data
        })


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_plan(request, candidate_id):
    """Admin assigns a base SubscriptionPlan to a candidate."""
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    plan_id = request.data.get('plan_id')
    if not plan_id:
        return Response({'error': 'plan_id is required'}, status=400)
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Plan not found or inactive'}, status=404)

    sub_amount = request.data.get('amount', plan.amount)
    try:
        sub_amount = Decimal(str(sub_amount))
    except Exception:
        sub_amount = plan.amount

    billing_cycle = request.data.get('billing_cycle', plan.billing_cycle)
    admin_notes = request.data.get('admin_notes', '')

    try:
        sub = SubscriptionService.assign_subscription(
            candidate=candidate,
            plan=plan,
            custom_amount=sub_amount,
            billing_cycle=billing_cycle,
            admin_notes=admin_notes,
            assigned_by=request.user
        )
        log_action(request.user, 'plan_assigned', str(candidate_id), 'subscription', {'plan': plan.name})
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to assign subscription: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_addon(request, candidate_id):
    """Admin assigns an independent standalone addon to a candidate."""
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    addon_id = request.data.get('addon_id')
    if not addon_id:
        return Response({'error': 'addon_id is required'}, status=400)
    try:
        addon = SubscriptionAddon.objects.get(id=addon_id, is_active=True)
    except SubscriptionAddon.DoesNotExist:
        return Response({'error': 'Addon not found or inactive'}, status=404)

    custom_amount = request.data.get('amount', addon.amount)
    try:
        custom_amount = Decimal(str(custom_amount))
    except Exception:
        custom_amount = addon.amount

    admin_notes = request.data.get('admin_notes', '')
    activate_immediately = request.data.get('activate_immediately', False)

    try:
        assignment = AddonService.assign_addon(
            candidate=candidate,
            addon=addon,
            custom_amount=custom_amount,
            admin_notes=admin_notes,
            added_by=request.user,
            activate_immediately=activate_immediately
        )
        log_action(request.user, 'addon_assigned', str(candidate_id), 'subscription_addon', {'addon': addon.name, 'amount': float(custom_amount)})
        return Response(SubscriptionAddonAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Failed to assign addon: {e}")
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAdmin])
def add_addon_to_subscription(request, candidate_id):
    """
    DEPRECATED: Backward compatible wrapper for older frontends.
    Routes to Stand-alone AddonService assignment.
    """
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)
    addon_id = request.data.get('addon_id')
    if not addon_id:
        return Response({'error': 'addon_id required'}, status=400)
    try:
        addon = SubscriptionAddon.objects.get(id=addon_id, is_active=True)
    except SubscriptionAddon.DoesNotExist:
        return Response({'error': 'Addon not found'}, status=404)
        
    custom_amount = request.data.get('amount', addon.amount)
    try:
        custom_amount = Decimal(str(custom_amount))
    except Exception:
        custom_amount = addon.amount

    try:
        assignment = AddonService.assign_addon(
            candidate=candidate,
            addon=addon,
            custom_amount=custom_amount,
            added_by=request.user,
            activate_immediately=False
        )
        log_action(request.user, 'addon_added', str(candidate_id), 'subscription_addon', {'addon': addon.name, 'amount': float(custom_amount)})
        return Response({'detail': 'Addon added', 'created': True, 'amount': float(custom_amount)})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_subscription(request, candidate_id):
    try:
        sub = Subscription.objects.get(candidate_id=candidate_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = SubscriptionSerializer(sub, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


#  Razorpay  Create Order 
@api_view(['POST'])
@permission_classes([IsApproved])
def create_razorpay_order(request, candidate_id):
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    if request.user.role == 'candidate' and str(candidate.user.id) != str(request.user.id):
        return Response({'error': 'Forbidden'}, status=403)

    try:
        sub = Subscription.objects.get(candidate=candidate)
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription assigned. Contact your advisor.'}, status=400)

    try:
        order_details = PaymentService.create_razorpay_order_for_subscription(candidate, sub)
        return Response(order_details)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Failed to create Razorpay order for subscription: {e}")
        return Response({'error': 'Payment order generation failed'}, status=500)


#  Razorpay  Verify Payment 
@api_view(['POST'])
@permission_classes([IsApproved])
def verify_razorpay_payment(request, candidate_id):
    rz_order_id = request.data.get('razorpay_order_id')
    rz_payment_id = request.data.get('razorpay_payment_id')
    rz_signature = request.data.get('razorpay_signature', '')

    try:
        rp_order = PaymentService.verify_subscription_payment(
            candidate_id=candidate_id,
            razorpay_order_id=rz_order_id,
            razorpay_payment_id=rz_payment_id,
            razorpay_signature=rz_signature
        )

        candidate = rp_order.candidate
        sub = rp_order.subscription

        # Get transaction details
        payment = Payment.objects.filter(razorpay_order=rp_order).first()

        return Response({
            'detail': 'Payment verified successfully',
            'payment_id': str(payment.id) if payment else None,
            'candidate_status': candidate.status,
            'subscription_status': sub.status if sub else None,
        })
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Fulfillment failed after verification: {e}")
        return Response({'error': 'Verification post-processing failed'}, status=500)


#  Manual / Admin Payments 
@api_view(['GET'])
@permission_classes([IsApproved])
def payments(request, candidate_id):
    pays = Payment.objects.filter(candidate_id=candidate_id).select_related('subscription', 'razorpay_order')
    return Response(PaymentSerializer(pays, many=True).data)


# ─── Initiate Razorpay order for a specific pending billing.Payment ───────────
@api_view(['POST'])
@permission_classes([IsApproved])
def initiate_payment(request, candidate_id, payment_id):
    """Create a Razorpay order for a specific pending billing.Payment record (addon)."""
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    if request.user.role == 'candidate' and str(candidate.user.id) != str(request.user.id):
        return Response({'error': 'Forbidden'}, status=403)

    try:
        pay = Payment.objects.get(id=payment_id, candidate=candidate)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=404)

    try:
        order_details = PaymentService.create_razorpay_order_for_payment(candidate, pay)
        return Response(order_details)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Failed to create individual Razorpay order: {e}")
        return Response({'error': 'Individual payment order generation failed'}, status=500)


# ─── Verify individual payment via Razorpay ───────────────────────────────────
@api_view(['POST'])
@permission_classes([IsApproved])
def verify_individual_payment(request, candidate_id, payment_id):
    """Verify a Razorpay payment for an individual billing.Payment (addon) and mark it completed."""
    rz_order_id = request.data.get('razorpay_order_id')
    rz_payment_id = request.data.get('razorpay_payment_id')
    rz_signature = request.data.get('razorpay_signature', '')

    try:
        pay = PaymentService.verify_individual_payment(
            candidate_id=candidate_id,
            payment_id=payment_id,
            razorpay_order_id=rz_order_id,
            razorpay_payment_id=rz_payment_id,
            razorpay_signature=rz_signature
        )

        log_action(request.user, 'payment_completed', str(candidate_id), 'payment',
                   {'payment_id': str(payment_id), 'razorpay_id': rz_payment_id})

        return Response({
            'detail': 'Payment verified successfully',
            'payment_id': str(pay.id),
            'status': pay.status
        })
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Fulfillment failed for individual payment verification: {e}")
        return Response({'error': 'Verification post-processing failed'}, status=500)


@api_view(['POST'])
@permission_classes([IsAdmin])
def record_payment(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = str(candidate_id)
    serializer = PaymentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    pay = serializer.save(recorded_by=request.user)
    from .models import SubscriptionPlan
    is_sub_plan = pay.payment_type in ('subscription', 'monthly_service')
    if not is_sub_plan:
        is_sub_plan = SubscriptionPlan.objects.filter(name=pay.payment_type).exists()

    if is_sub_plan:
        # Ensure subscription object exists and is synced with this payment
        sub, created = Subscription.objects.get_or_create(
            candidate_id=candidate_id,
            defaults={
                'amount': pay.amount,
                'currency': pay.currency,
                'status': 'pending_payment' if pay.status == 'pending' else 'active',
                'plan_name': pay.payment_type if pay.payment_type != 'subscription' else 'Marketing Service Fee',
                'assigned_by': request.user,
            }
        )
        
        # Sync existing subscription if this is a newer/relevant payment
        if not created:
            if pay.status == 'completed':
                sub.amount = pay.amount
                sub.currency = pay.currency
                if pay.payment_type != 'subscription':
                    sub.plan_name = pay.payment_type
            elif pay.status == 'pending':
                # If a new pending payment is recorded, make sure the subscription reflects it
                sub.status = 'pending_payment'
                sub.amount = pay.amount
                sub.currency = pay.currency
                if pay.payment_type != 'subscription':
                    sub.plan_name = pay.payment_type
                sub.save(update_fields=['status', 'amount', 'currency', 'plan_name'])
        
        # LINK THE PAYMENT TO THE SUBSCRIPTION FOR CASCADE/SYNC
        pay.subscription = sub
        pay.save(update_fields=['subscription'])
        
        # Helper call to activate/sync candidate & subscription if payment is completed
        if pay.status == 'completed':
            _update_candidate_and_subscription_status(pay.candidate, sub)
            
        # Clean up any lingering pending payments of the same type to avoid duplicates
        # We do this regardless of whether the new payment is completed or pending,
        # ensuring there is only ever one pending payment per type at a time.
        Payment.objects.filter(
            candidate_id=candidate_id,
            status='pending',
            payment_type=pay.payment_type
        ).exclude(id=pay.id).delete()
    
    # Auto-link manual addon payment and complete assignment if status is paid
    ADDON_TYPES = ('addon', 'mock_practice', 'interview_support', 'operations_support', 'manual')
    if pay.status in ('completed', 'complete', 'paid') and pay.payment_type in ADDON_TYPES:
        if not getattr(pay, 'addon_assignment', None):
            pending_assignment = SubscriptionAddonAssignment.objects.filter(
                candidate=pay.candidate,
                status='pending'
            ).order_by('added_at').first()
            if pending_assignment:
                pay.addon_assignment = pending_assignment
                pay.save(update_fields=['addon_assignment'])
        
        if pay.addon_assignment:
            # Clean up the original pending payment associated with this assignment to avoid duplicates
            Payment.objects.filter(
                addon_assignment=pay.addon_assignment,
                status='pending'
            ).exclude(id=pay.id).delete()
            AddonService.complete_addon_payment(pay.addon_assignment, payment_reference=f"ADMIN-{pay.id}")

    log_action(request.user, 'payment_recorded', str(candidate_id), 'payment', data)

    # ── Create Invoice + send email with PDF receipt (if success) ──────────────
    if pay.status in ('completed', 'complete', 'paid'):
        try:
            from dateutil.relativedelta import relativedelta
            period_start = pay.payment_date or timezone.now().date()
            period_end   = period_start + relativedelta(months=1)
            description  = pay.payment_type.replace('_', ' ').title()
            if pay.payment_type in ('subscription', 'monthly_service'):
                description = 'Marketing Service Fee'

            invoice = Invoice.objects.create(
                subscription=getattr(pay, 'subscription', None),
                candidate=pay.candidate,
                amount=pay.amount,
                currency=pay.currency,
                period_start=period_start,
                period_end=period_end,
                status='paid',
                paid_at=timezone.now(),
                payment_reference=f"ADMIN-{pay.id}",
                description=description,
                tax_amount=Decimal('0.00'),
                tax_rate=Decimal('0.00'),
            )

            # Record in Purchase History if manual addon payment recorded successfully
            ADDON_TYPES = ('addon', 'mock_practice', 'interview_support', 'operations_support', 'manual')
            if pay.payment_type in ADDON_TYPES:
                purchased_by_val = f"Admin ({_user_name(request.user)})"
                PurchaseHistoryService.record_purchase(
                    candidate=pay.candidate,
                    service_name=pay.addon_assignment.addon.name if pay.addon_assignment else 'Service Add-on',
                    amount=pay.amount,
                    currency=pay.currency,
                    addon_assignment=pay.addon_assignment,
                    payment=pay,
                    invoice=invoice,
                    purchased_by=purchased_by_val
                )

            pdf_bytes = generate_invoice_pdf(invoice)
            attachments = [{
                "filename": f"hyrind_invoice_{str(invoice.id).split('-')[0]}.pdf",
                "content": list(pdf_bytes),
            }]

            # Remove reference details from description for the email subject
            clean_desc = description
            if " | Razorpay" in clean_desc:
                clean_desc = clean_desc.split(" | Razorpay")[0]
            if " | ADMIN-" in clean_desc:
                clean_desc = clean_desc.split(" | ADMIN-")[0]

            send_email(
                pay.candidate.user.email,
                f'Payment Recorded — {clean_desc} — Hyrind',
                get_styled_email_html(
                    _user_name(pay.candidate.user),
                    f'<p>A payment of <strong>{pay.currency} {pay.amount}</strong> '
                    f'for <strong>{clean_desc}</strong> has been recorded and confirmed for your account. '
                    f'Please find your receipt attached.</p>',
                    action_label='View Invoices', action_url='/candidate-dashboard/billing',
                ),
                attachments=attachments,
            )
        except Exception as e:
            logger.error("Invoice/email after admin record failed: %s", str(e))

    return Response(PaymentSerializer(pay).data, status=status.HTTP_201_CREATED)


#  Invoices 
@api_view(['GET'])
@permission_classes([IsApproved])
def invoices(request, candidate_id):
    invs = Invoice.objects.filter(candidate_id=candidate_id)
    return Response(InvoiceSerializer(invs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_invoice(request, invoice_id):
    try:
        inv = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    inv_status = request.data.get('status')
    if inv_status:
        inv.status = inv_status
        if inv_status == 'paid':
            inv.paid_at = timezone.now()
            
            # Sync corresponding payments and addon assignments on manual offline paid status
            try:
                for ph in inv.purchase_histories.all():
                    if ph.payment and ph.payment.status != 'completed':
                        ph.payment.status = 'completed'
                        ph.payment.payment_date = timezone.now().date()
                        ph.payment.save(update_fields=['status', 'payment_date'])
                    
                    if ph.addon_assignment and ph.addon_assignment.status != 'completed':
                        AddonService.complete_addon_payment(ph.addon_assignment, payment_reference=inv.payment_reference or f"ADMIN-{inv.id}")
                
                # Also search for any general pending Payment records of type addon for this candidate
                ADDON_TYPES = ['addon', 'mock_practice', 'interview_support', 'operations_support', 'manual']
                pending_pays = Payment.objects.filter(
                    candidate=inv.candidate,
                    status='pending',
                    amount=inv.amount,
                    payment_type__in=ADDON_TYPES
                )
                for p in pending_pays:
                    p.status = 'completed'
                    p.payment_date = timezone.now().date()
                    p.save(update_fields=['status', 'payment_date'])
                    
                    if p.addon_assignment and p.addon_assignment.status != 'completed':
                        AddonService.complete_addon_payment(p.addon_assignment, payment_reference=inv.payment_reference or f"ADMIN-{inv.id}")
            except Exception as e:
                logger.error("Failed to sync manual invoice payment: %s", str(e))

        if inv_status == 'failed':
            inv.failure_reason = request.data.get('failure_reason', '')
    if request.data.get('payment_reference'):
        inv.payment_reference = request.data['payment_reference']
    inv.save()
    return Response(InvoiceSerializer(inv).data)


#  Billing Alerts 
@api_view(['GET'])
@permission_classes([IsAdmin])
def billing_alerts(request):
    count = Subscription.objects.filter(status__in=['past_due', 'grace_period', 'pending_payment']).count()
    pending = list(Subscription.objects.filter(status='pending_payment').values(
        'candidate__user__email', 'plan_name', 'amount', 'payment_initiated_at',
    ))
    return Response({'count': count, 'pending_payment': pending})


#  All subscriptions overview 
@api_view(['GET'])
@permission_classes([IsAdmin])
def all_subscriptions(request):
    subs = Subscription.objects.select_related('plan', 'candidate__user').prefetch_related(
        'addon_assignments__addon'
    ).all()
    s = request.query_params.get('status')
    if s:
        subs = subs.filter(status=s)
    return Response(SubscriptionSerializer(subs, many=True).data)

@api_view(['GET'])
@permission_classes([IsAdmin])
def all_payments(request):
    # 1. Fetch all Payment records
    pays = Payment.objects.select_related('candidate__user', 'subscription').all()
    s = request.query_params.get('status')
    if s:
        pays = pays.filter(status=s)
    
    serialized_pays = PaymentSerializer(pays, many=True).data
    
    # 2. Fetch all RazorpayOrder records that are NOT linked to any Payment
    linked_order_ids = Payment.objects.filter(razorpay_order__isnull=False).values_list('razorpay_order_id', flat=True)
    orders = RazorpayOrder.objects.select_related('candidate__user', 'subscription').exclude(id__in=linked_order_ids)
    
    serialized_orders = []
    for order in orders:
        # Map RazorpayOrder status to human-readable Payment status
        order_status = 'completed' if order.status == 'paid' else ('failed' if order.status == 'failed' else 'pending')
        
        # Filter by status if requested
        if s and order_status != s:
            continue
            
        candidate_name = order.candidate.user.profile.full_name if hasattr(order.candidate.user, 'profile') and order.candidate.user.profile.full_name else order.candidate.user.email
        
        # Try to resolve addon assignment if it exists in notes
        addon_assignment_id = None
        if isinstance(order.notes, dict):
            billing_payment_id = order.notes.get('billing_payment_id')
            if billing_payment_id:
                try:
                    approx_pay = Payment.objects.get(id=billing_payment_id)
                    if approx_pay.addon_assignment:
                        addon_assignment_id = str(approx_pay.addon_assignment.id)
                except Exception:
                    pass
        
        serialized_orders.append({
            'id': str(order.id),
            'candidate': str(order.candidate.id),
            'candidate_name': candidate_name,
            'candidate_display_id': order.candidate.display_id,
            'display_id': f"PAY{str(order.id)[:8].upper()}",
            'subscription': str(order.subscription.id) if order.subscription else None,
            'addon_assignment': addon_assignment_id,
            'razorpay_order': str(order.id),
            'amount': str(order.amount),
            'currency': order.currency,
            'payment_type': 'monthly_service' if order.payment_type == 'subscription' else order.payment_type,
            'status': order_status,
            'payment_date': order.verified_at.date().isoformat() if order.verified_at else order.created_at.date().isoformat(),
            'notes': f"Razorpay Order {order.razorpay_order_id} | Status: {order.status}",
            'recorded_by': None,
            'created_at': order.created_at.isoformat()
        })
        
    # 3. Combine both transaction lists and sort by created_at descending
    combined = serialized_pays + serialized_orders
    combined.sort(key=lambda x: x['created_at'], reverse=True)
    
    return Response(combined)


# ─── Manual subscription create (legacy admin billing tab) ────────
@api_view(['POST'])
@permission_classes([IsAdmin])
def create_subscription_manual(request, candidate_id):
    """
    Admin manually enters amount/plan_name without using the SubscriptionPlan catalogue.
    Used by AdminBillingTab when no plan catalogue is selected.
    """
    data = request.data.copy()
    data['candidate'] = str(candidate_id)
    if 'status' not in data:
        data['status'] = 'active'
    serializer = SubscriptionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    sub = serializer.save(assigned_by=request.user)
    log_action(request.user, 'subscription_created', str(candidate_id), 'subscription', request.data)
    return Response(SubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def billing_analytics(request):
    """Revenue by month and subscription status breakdown for charts."""
    from django.db.models import Count, Sum
    from django.db.models.functions import TruncMonth
    from django.utils import timezone
    from datetime import timedelta

    six_months_ago = timezone.now() - timedelta(days=180)

    # Revenue per month
    rev_qs = (
        Payment.objects.filter(status='completed', created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('month')
    )
    revenue_by_month = [
        {'month': r['month'].strftime('%b %Y'), 'revenue': float(r['total'] or 0), 'count': r['count']}
        for r in rev_qs
    ]

    # Subscription status breakdown
    sub_status = list(Subscription.objects.values('status').annotate(count=Count('id')))

    # Total collected
    total_revenue = Payment.objects.filter(status='completed').aggregate(t=Sum('amount'))['t'] or 0

    # Calculate current month's revenue
    now = timezone.now()
    monthly_revenue = Payment.objects.filter(
        status='completed',
        created_at__year=now.year,
        created_at__month=now.month
    ).aggregate(t=Sum('amount'))['t'] or 0

    # Calculate active and past due subscription counts
    active_subscriptions = Subscription.objects.filter(status__in=['active', 'expiring_soon']).count()
    past_due_subscriptions = Subscription.objects.filter(status__in=['past_due', 'grace_period', 'pending_payment', 'expired']).count()

    return Response({
        'revenue_by_month': revenue_by_month,
        'subscription_status': sub_status,
        'total_revenue': float(total_revenue),
        'monthly_revenue': float(monthly_revenue),
        'active_subscriptions': active_subscriptions,
        'past_due_subscriptions': past_due_subscriptions,
        'total_payments': Payment.objects.filter(status='completed').count(),
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def manage_payment(request, payment_id):
    """Update or delete a single payment record."""
    payment = get_object_or_404(Payment, pk=payment_id)
    
    if request.method == 'DELETE':
        candidate_id = payment.candidate.id
        sub = payment.subscription
        payment.delete()
        
        # If we just deleted a subscription payment, check if we need to revert the status
        if sub and sub.status == 'active':
            # Check if there are any other completed payments for this subscription
            has_other_paid = Payment.objects.filter(subscription=sub, status='completed').exists()
            if not has_other_paid:
                sub.status = 'pending_payment'
                sub.save(update_fields=['status'])
                # Also revert candidate status if necessary
                cand = sub.candidate
                if cand.status in ('payment_completed', 'credentials_submitted', 'active_marketing'):
                    cand.status = 'pending_payment'
                    cand.save(update_fields=['status'])

        log_action(request.user, 'payment_deleted', str(candidate_id), 'payment', {'payment_id': str(payment_id)})
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    elif request.method == 'PATCH':
        serializer = PaymentSerializer(payment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(request.user, 'payment_updated', str(payment.candidate.id), 'payment', request.data)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_overview(request, candidate_id):
    """Aggregate Subscription, stand-alone Addons, Invoices, and Payments for candidate dashboard."""
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)
        
    try:
        sub = Subscription.objects.select_related('plan').get(candidate_id=candidate_id)
        # Dynamically verify status using check_status
        sub.check_status()
        sub_data = SubscriptionSerializer(sub).data
    except Subscription.DoesNotExist:
        sub_data = None
        
    # Stand-alone Addon Assignments
    addons = SubscriptionAddonAssignment.objects.filter(candidate=candidate).order_by('-added_at')
    addons_data = SubscriptionAddonAssignmentSerializer(addons, many=True).data

    # Purchase History
    purchase_history = PurchaseHistory.objects.filter(candidate=candidate).order_by('-created_at')
    purchase_history_data = PurchaseHistorySerializer(purchase_history, many=True).data

    invoices = Invoice.objects.filter(candidate_id=candidate_id).order_by('-period_start')
    payments = Payment.objects.filter(candidate_id=candidate_id).order_by('-created_at')
    
    return Response({
        'subscription': sub_data,
        'addons': addons_data,
        'purchase_history': purchase_history_data,
        'invoices': InvoiceSerializer(invoices, many=True).data,
        'payments': PaymentSerializer(payments, many=True).data,
    })

@api_view(['GET'])
@permission_classes([IsApproved])
def download_invoice(request, invoice_id):
    """Download PDF for a specific invoice."""
    try:
        invoice = Invoice.objects.select_related('subscription', 'candidate__user__profile').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
        
    pdf_bytes = generate_invoice_pdf(invoice)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="hyrind_invoice_{str(invoice.id).split("-")[0]}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_ledger_report(request):
    """Export summary of subscriptions and payments for admin dashboard."""
    from django.db.models import Sum
    
    subs = Subscription.objects.select_related('candidate__user__profile').prefetch_related('addon_assignments__addon').all()
    
    report_data = []
    for s in subs:
        # Trigger dynamic checks to update status if expired
        s.check_status()
        
        # Get total paid by this candidate
        total_paid = Payment.objects.filter(candidate=s.candidate, status='completed').aggregate(total=Sum('amount'))['total'] or 0
        
        # Get addons list
        addons = ", ".join([a.addon.name for a in s.addon_assignments.all()])

        
        report_data.append({
            'candidate_name': s.candidate.user.profile.full_name if hasattr(s.candidate.user, 'profile') and s.candidate.user.profile.full_name else s.candidate.user.email,
            'email': s.candidate.user.email,
            'plan_name': s.plan_name,
            'addons': addons,
            'status': s.status,
            'billing_cycle': s.billing_cycle,
            'total_amount_paid': float(total_paid),
            'last_payment_at': s.last_payment_at.strftime('%Y-%m-%d %H:%M') if s.last_payment_at else "",
            'next_billing_at': s.next_billing_at.strftime('%Y-%m-%d') if s.next_billing_at else "",
        })
        
    return Response(report_data)

