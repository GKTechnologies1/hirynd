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
)
from .serializers import (
    InvoiceSerializer, PaymentSerializer, RazorpayOrderSerializer,
    SubscriptionAddonSerializer, SubscriptionPlanSerializer, SubscriptionSerializer,
)

from .utils import generate_invoice_pdf
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse

logger = logging.getLogger(__name__)


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
        return Response({})


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_plan(request, candidate_id):
    """Admin assigns a SubscriptionPlan to a candidate."""
    try:
        candidate = Candidate.objects.select_related('user').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    plan_id = request.data.get('plan_id')
    addon_ids = request.data.get('addons', [])
    if not plan_id:
        return Response({'error': 'plan_id is required'}, status=400)
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Plan not found or inactive'}, status=404)

    sub_amount = request.data.get('amount', plan.amount)
    sub, created = Subscription.objects.get_or_create(
        candidate=candidate,
        defaults={
            'plan': plan, 'plan_name': plan.name, 'amount': sub_amount,
            'currency': plan.currency, 'billing_cycle': plan.billing_cycle,
            'status': 'pending_payment', 'assigned_by': request.user,
            'payment_initiated_at': timezone.now(),
        },
    )
    if not created:
        sub.plan = plan
        sub.plan_name = plan.name
        sub.amount = sub_amount
        sub.currency = plan.currency
        sub.billing_cycle = plan.billing_cycle
        sub.status = 'pending_payment'
        sub.assigned_by = request.user
        sub.payment_initiated_at = timezone.now()
        sub.save()
        sub.addon_assignments.all().delete()

    for addon_id in addon_ids:
        try:
            addon = SubscriptionAddon.objects.get(id=addon_id, is_active=True)
            # Default to addon amount if not specified
            amt = request.data.get('addon_amounts', {}).get(str(addon_id), addon.amount)
            SubscriptionAddonAssignment.objects.get_or_create(
                subscription=sub, addon=addon, 
                defaults={'added_by': request.user, 'amount': amt},
            )
        except SubscriptionAddon.DoesNotExist:
            pass

    log_action(request.user, 'plan_assigned', str(candidate_id), 'subscription', {'plan': plan.name})
    create_notification(
        candidate.user, 'Payment Required',
        f'Your plan "{plan.name}" has been assigned. Please complete payment to continue.',
        link='/candidate-dashboard/payments',
    )
    send_email(
        candidate.user.email, 'Action Required: Complete Your Payment',
        get_styled_email_html(
            _user_name(candidate.user),
            f'<p>Your Hyrind plan <strong>{plan.name}</strong> ({plan.currency} {plan.amount}) has been assigned. '
            f'Please log in and complete the payment to proceed.</p>',
            action_label="Pay Now",
            action_url="/candidate-dashboard/payments"
        )
    )
    return Response(SubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdmin])
def add_addon_to_subscription(request, candidate_id):
    try:
        sub = Subscription.objects.get(candidate_id=candidate_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=404)
    addon_id = request.data.get('addon_id')
    if not addon_id:
        return Response({'error': 'addon_id required'}, status=400)
    try:
        addon = SubscriptionAddon.objects.get(id=addon_id, is_active=True)
    except SubscriptionAddon.DoesNotExist:
        return Response({'error': 'Addon not found'}, status=404)
    assignment, created = SubscriptionAddonAssignment.objects.get_or_create(
        subscription=sub, addon=addon, 
        defaults={
            'added_by': request.user,
            'amount': request.data.get('amount', addon.amount)
        },
    )
    if not created and 'amount' in request.data:
        assignment.amount = request.data['amount']
        assignment.save(update_fields=['amount'])
    log_action(request.user, 'addon_added', str(candidate_id), 'subscription_addon', {'addon': addon.name, 'amount': float(assignment.amount)})
    return Response({'detail': 'Addon added', 'created': created, 'amount': float(assignment.amount)})


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
        sub = Subscription.objects.prefetch_related('addon_assignments__addon').get(candidate=candidate)
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription assigned. Contact your advisor.'}, status=400)

    if sub.status == 'active':
        return Response({'error': 'Subscription already active'}, status=400)

    addons_total = sum(a.amount for a in sub.addon_assignments.all())
    total_amount = float(sub.amount) + float(addons_total)
    total_paise = int(total_amount * 100)

    razorpay_client, key_id = _get_razorpay_client()

    # Use mock mode ONLY if keys are explicitly set to mock markers or if client failed to init and we are in debug
    is_mock_key = key_id and str(key_id).startswith('rzp_test_mock')
    
    if razorpay_client is None or is_mock_key:
        if not getattr(settings, 'DEBUG', False) and not is_mock_key:
             return Response({'error': 'Payment gateway not configured'}, status=500)
             
        # Generate a truly unique mock ID using timestamp to avoid UNIQUE constraint conflicts
        import time
        mock_order_id = f"order_mock_{str(candidate_id)[:8]}_{int(time.time())}"
        
        RazorpayOrder.objects.filter(candidate=candidate, status='created').update(status='failed')
        rp_order = RazorpayOrder.objects.create(
            candidate=candidate, subscription=sub,
            razorpay_order_id=mock_order_id,
            amount=total_amount, currency=sub.currency,
            payment_type='subscription', notes={'plan': sub.plan_name, 'mode': 'mock'},
        )
        return Response({
            'mode': 'mock', 'order_id': mock_order_id,
            'amount': total_paise, 'currency': sub.currency,
            'key_id': 'rzp_test_mock',
            'subscription_id': str(sub.id), 'internal_order_id': str(rp_order.id),
            'description': f'Hyrind | {sub.plan_name}',
            'prefill': {'name': _user_name(candidate.user), 'email': candidate.user.email},
        })

    try:
        rz_order = razorpay_client.order.create({
            'amount': total_paise, 'currency': sub.currency,
            'receipt': f'hyrind_{str(candidate_id)[:8]}',
            'notes': {'plan': sub.plan_name, 'candidate': str(candidate_id)},
        })
    except Exception as e:
        logger.error("Razorpay order creation failed: %s", str(e))
        return Response({'error': f'Failed to create Razorpay order: {str(e)}'}, status=500)

    RazorpayOrder.objects.filter(candidate=candidate, status='created').update(status='failed')
    rp_order = RazorpayOrder.objects.create(
        candidate=candidate, subscription=sub,
        razorpay_order_id=rz_order['id'],
        amount=total_amount, currency=sub.currency,
        payment_type='subscription', notes={'plan': sub.plan_name},
    )
    return Response({
        'order_id': rz_order['id'], 'amount': total_paise, 'currency': sub.currency,
        'key_id': key_id,
        'subscription_id': str(sub.id), 'internal_order_id': str(rp_order.id),
        'description': f'Hyrind | {sub.plan_name}',
        'prefill': {
            'name': _user_name(candidate.user), 'email': candidate.user.email,
            'contact': getattr(candidate.user.profile, 'phone', '') if hasattr(candidate.user, 'profile') else '',
        },
    })


#  Razorpay  Verify Payment 
@api_view(['POST'])
@permission_classes([IsApproved])
def verify_razorpay_payment(request, candidate_id):
    rz_order_id = request.data.get('razorpay_order_id')
    rz_payment_id = request.data.get('razorpay_payment_id')
    rz_signature = request.data.get('razorpay_signature', '')
    is_mock = request.data.get('mode') == 'mock'

    try:
        rp_order = RazorpayOrder.objects.select_related('candidate', 'subscription').get(
            razorpay_order_id=rz_order_id,
        )
    except RazorpayOrder.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

    if str(rp_order.candidate_id) != str(candidate_id):
        return Response({'error': 'Order does not belong to this candidate'}, status=403)

    if not is_mock:
        client, _ = _get_razorpay_client()
        if client:
            params_dict = {
                'razorpay_order_id': rz_order_id,
                'razorpay_payment_id': rz_payment_id,
                'razorpay_signature': rz_signature
            }
            try:
                client.utility.verify_payment_signature(params_dict)
            except Exception as e:
                logger.warning("Razorpay signature verification failed: %s", str(e))
                return Response({'error': 'Payment verification failed'}, status=400)
        else:
            return Response({'error': 'Payment gateway not configured'}, status=500)

    rp_order.razorpay_payment_id = rz_payment_id
    rp_order.razorpay_signature = rz_signature
    rp_order.status = 'paid'
    rp_order.verified_at = timezone.now()
    rp_order.save()

    sub = rp_order.subscription
    if sub:
        sub.status = 'active'
        sub.last_payment_at = timezone.now()
        sub.start_date = timezone.now().date()
        
        if sub.billing_cycle == 'monthly':
            sub.next_billing_at = timezone.now().date() + relativedelta(months=1)
        elif sub.billing_cycle == 'quarterly':
            sub.next_billing_at = timezone.now().date() + relativedelta(months=3)
        elif sub.billing_cycle == 'annual':
            sub.next_billing_at = timezone.now().date() + relativedelta(years=1)
        else:
            sub.next_billing_at = timezone.now().date() + relativedelta(months=1)
            
        sub.save(update_fields=['status', 'last_payment_at', 'start_date', 'next_billing_at'])

    payment = Payment.objects.create(
        candidate_id=candidate_id, subscription=sub, razorpay_order=rp_order,
        amount=rp_order.amount, currency=rp_order.currency,
        payment_type='subscription', status='completed',
        payment_date=timezone.now().date(),
        notes=f'Razorpay payment {rz_payment_id}',
    )

    candidate = rp_order.candidate
    if candidate.status in ('roles_confirmed', 'pending_payment', 'intake_submitted'):
        if candidate.credentials.exists():
            candidate.status = 'credentials_submitted'
        else:
            candidate.status = 'payment_completed'
        candidate.save(update_fields=['status'])

    # Fulfillment: Create Invoice and PDF (Non-critical to the payment itself)
    try:
        invoice = Invoice.objects.create(
            subscription=sub, candidate=candidate,
            amount=rp_order.amount, currency=rp_order.currency,
            period_start=timezone.now().date(),
            period_end=sub.next_billing_at if sub else (timezone.now().date() + relativedelta(months=1)),
            status='paid', paid_at=timezone.now(),
            payment_reference=rz_payment_id
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
    except Exception as e:
        logger.error("Non-critical fulfillment failed after successful payment: %s", str(e))
        # We don't return 500 here because the payment was actually successful

    return Response({
        'detail': 'Payment verified successfully',
        'payment_id': str(payment.id),
        'candidate_status': candidate.status,
        'subscription_status': sub.status if sub else None,
    })


#  Manual / Admin Payments 
@api_view(['GET'])
@permission_classes([IsApproved])
def payments(request, candidate_id):
    pays = Payment.objects.filter(candidate_id=candidate_id).select_related('subscription', 'razorpay_order')
    return Response(PaymentSerializer(pays, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def record_payment(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = str(candidate_id)
    serializer = PaymentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    pay = serializer.save(recorded_by=request.user)
    if pay.payment_type in ('subscription', 'monthly_service'):
        # Ensure subscription object exists and is synced with this payment
        sub, created = Subscription.objects.get_or_create(
            candidate_id=candidate_id,
            defaults={
                'amount': pay.amount,
                'currency': pay.currency,
                'status': 'pending_payment' if pay.status == 'pending' else 'active',
                'plan_name': 'Monthly Service Fee',
                'assigned_by': request.user,
            }
        )
        if not created and pay.status == 'completed':
            sub.status = 'active'
            sub.last_payment_at = pay.created_at
            sub.save()
            
            # Simple fulfillment logic: move to payment_completed
            candidate = sub.candidate
            if candidate.status in ('roles_confirmed', 'payment_pending'):
                candidate.status = 'payment_completed'
                candidate.save()
        if not created:
            # Sync existing subscription if this is a newer/relevant payment
            if pay.status == 'completed':
                sub.status = 'active'
                sub.last_payment_at = timezone.now()
                sub.amount = pay.amount
                sub.currency = pay.currency
                sub.save(update_fields=['status', 'last_payment_at', 'amount', 'currency'])
            elif pay.status == 'pending':
                # If a new pending payment is recorded, make sure the subscription reflects it
                sub.status = 'pending_payment'
                sub.amount = pay.amount
                sub.currency = pay.currency
                sub.save(update_fields=['status', 'amount', 'currency'])
        
        # LINK THE PAYMENT TO THE SUBSCRIPTION FOR CASCADE/SYNC
        pay.subscription = sub
        pay.save(update_fields=['subscription'])
        
        # Update candidate status if payment is completed
        if pay.status == 'completed':
            try:
                cand = Candidate.objects.get(id=candidate_id)
                if cand.status in ('roles_confirmed', 'pending_payment', 'past_due', 'intake_submitted'):
                    if cand.credentials.exists():
                        cand.status = 'credentials_submitted'
                    else:
                        cand.status = 'payment_completed'
                    cand.save(update_fields=['status'])
            except Candidate.DoesNotExist:
                pass
    log_action(request.user, 'payment_recorded', str(candidate_id), 'payment', data)
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
    pays = Payment.objects.select_related('candidate__user', 'subscription').all()
    s = request.query_params.get('status')
    if s:
        pays = pays.filter(status=s)
    return Response(PaymentSerializer(pays, many=True).data)


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

    return Response({
        'revenue_by_month': revenue_by_month,
        'subscription_status': sub_status,
        'total_revenue': float(total_revenue),
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
                if cand.status == 'payment_completed' or cand.status == 'credentials_submitted':
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
    """Aggregate Subscription, Invoices, and Payments for candidate dashboard."""
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)
        
    try:
        sub = Subscription.objects.select_related('plan').get(candidate_id=candidate_id)
        sub_data = SubscriptionSerializer(sub).data
    except Subscription.DoesNotExist:
        sub_data = None
        
    invoices = Invoice.objects.filter(candidate_id=candidate_id).order_by('-period_start')
    payments = Payment.objects.filter(candidate_id=candidate_id).order_by('-created_at')
    
    return Response({
        'subscription': sub_data,
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

