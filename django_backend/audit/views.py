from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.permissions import IsAdmin, IsApproved
from .models import AuditLog
from .serializers import AuditLogSerializer


@api_view(['GET'])
@permission_classes([IsAdmin])
def global_audit_logs(request):
    qs = AuditLog.objects.select_related('actor__profile').all()
    
    action_filter = request.query_params.get('action')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    if action_filter and action_filter != 'all':
        qs = qs.filter(action__icontains=action_filter)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + "T23:59:59")
        
    return Response(AuditLogSerializer(qs[:200], many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_audit_logs(request, candidate_id):
    from candidates.models import Candidate
    from users.models import User
    from django.db.models import Q
    from django.core.exceptions import ValidationError

    candidate_obj = None
    user_obj = None

    # Try to find if candidate_id is a Candidate ID
    try:
        candidate_obj = Candidate.objects.select_related('user').get(id=candidate_id)
        user_obj = candidate_obj.user
    except (Candidate.DoesNotExist, ValueError, ValidationError):
        # Maybe it's a User ID directly
        try:
            user_obj = User.objects.get(id=candidate_id)
            if user_obj.role == 'candidate' and hasattr(user_obj, 'candidate'):
                candidate_obj = user_obj.candidate
        except (User.DoesNotExist, ValueError, ValidationError):
            pass

    # Perform security check if user is not admin
    user = request.user
    if user.role != 'admin':
        if candidate_obj:
            from recruiters.models import RecruiterAssignment
            is_assigned = RecruiterAssignment.objects.filter(candidate=candidate_obj, recruiter=user, is_active=True).exists()
            is_self = (user_obj == user)
            if not (is_assigned or is_self or user.role in ('team_lead', 'team_manager')):
                return Response({'error': 'Forbidden'}, status=403)
        else:
            if user_obj != user and user.role not in ('team_lead', 'team_manager'):
                return Response({'error': 'Forbidden'}, status=403)

    # Build Q filters matching target_id or actor
    q_filter = Q(target_id=str(candidate_id))
    
    if user_obj:
        q_filter |= Q(actor=user_obj)
        q_filter |= Q(target_id=str(user_obj.id))
        
    if candidate_obj:
        q_filter |= Q(target_id=str(candidate_obj.id))

    qs = AuditLog.objects.filter(q_filter).select_related('actor__profile')

    action_filter = request.query_params.get('action')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    if action_filter and action_filter != 'all':
        qs = qs.filter(action__icontains=action_filter)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + "T23:59:59")

    qs = qs.order_by('-created_at')[:100]
    return Response(AuditLogSerializer(qs, many=True).data)
