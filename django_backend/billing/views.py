from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum

from users.permissions import IsAdmin, IsApproved
from audit.utils import log_action
from .models import Subscription, SubscriptionPlan, Payment, Invoice
from .serializers import (
    SubscriptionSerializer, SubscriptionPlanSerializer, PaymentSerializer, InvoiceSerializer,
)


# ─── Subscription Plans (Admin CRUD) ───

@api_view(['GET'])
@permission_classes([IsApproved])
def plan_list(request):
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('amount')
    return Response(SubscriptionPlanSerializer(plans, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def plan_create(request):
    serializer = SubscriptionPlanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(request.user, 'plan_created', str(serializer.instance.id), 'subscription_plan', request.data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def plan_update(request, plan_id):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def plan_delete(request, plan_id):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    plan.is_active = False
    plan.save()
    return Response({'message': 'Plan deactivated'})


# ─── Subscriptions ───

@api_view(['GET'])
@permission_classes([IsApproved])
def subscription_detail(request, candidate_id):
    try:
        sub = Subscription.objects.get(candidate_id=candidate_id)
        return Response(SubscriptionSerializer(sub).data)
    except Subscription.DoesNotExist:
        return Response({})


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_subscription(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = candidate_id
    serializer = SubscriptionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(request.user, 'subscription_created', str(candidate_id), 'subscription', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


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


# ─── Payments ───

@api_view(['GET'])
@permission_classes([IsApproved])
def payments(request, candidate_id):
    pays = Payment.objects.filter(candidate_id=candidate_id)
    return Response(PaymentSerializer(pays, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def record_payment(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = candidate_id
    serializer = PaymentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(request.user, 'payment_recorded', str(candidate_id), 'payment', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsApproved])
def invoices(request, candidate_id):
    invs = Invoice.objects.filter(candidate_id=candidate_id)
    return Response(InvoiceSerializer(invs, many=True).data)


# ─── Admin All Payments View ───

@api_view(['GET'])
@permission_classes([IsAdmin])
def all_payments(request):
    """List all payments across all candidates with filters."""
    qs = Payment.objects.select_related('candidate__user__profile').order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    payment_type = request.query_params.get('payment_type')
    if payment_type:
        qs = qs.filter(payment_type=payment_type)
    return Response(PaymentSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def all_subscriptions(request):
    """List all subscriptions across all candidates."""
    qs = Subscription.objects.select_related('candidate__user__profile').order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(SubscriptionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def payment_summary(request):
    """Revenue summary for admin dashboard."""
    total = Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0
    pending = Payment.objects.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0
    failed = Payment.objects.filter(status='failed').aggregate(total=Sum('amount'))['total'] or 0

    from django.utils import timezone
    from datetime import timedelta
    month_ago = timezone.now() - timedelta(days=30)
    monthly = Payment.objects.filter(status='completed', created_at__gte=month_ago).aggregate(total=Sum('amount'))['total'] or 0

    return Response({
        'total_revenue': float(total),
        'pending_amount': float(pending),
        'failed_amount': float(failed),
        'monthly_revenue': float(monthly),
        'total_payments': Payment.objects.count(),
        'active_subscriptions': Subscription.objects.filter(status='active').count(),
        'past_due_subscriptions': Subscription.objects.filter(status__in=['past_due', 'grace_period']).count(),
    })
