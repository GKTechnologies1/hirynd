from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.permissions import IsAdmin, IsApproved
from .models import AuditLog
from .serializers import AuditLogSerializer


@api_view(['GET'])
@permission_classes([IsAdmin])
def global_audit_logs(request):
    qs = AuditLog.objects.select_related('actor__profile').all()[:200]
    action_filter = request.query_params.get('action')
    if action_filter:
        qs = AuditLog.objects.filter(action__icontains=action_filter).select_related('actor__profile')[:200]
    return Response(AuditLogSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_audit_logs(request, candidate_id):
    # Security: Admin can see all. Recruiters/TLs can only see assigned. Candidates can only see their own.
    user = request.user
    if user.role != 'admin':
        from recruiters.models import RecruiterAssignment
        is_assigned = RecruiterAssignment.objects.filter(candidate_id=candidate_id, recruiter=user, is_active=True).exists()
        
        # Also check if user IS the candidate
        from candidates.models import Candidate
        is_self = Candidate.objects.filter(id=candidate_id, user=user).exists()
        
        if not (is_assigned or is_self or user.role in ('team_lead', 'team_manager')):
            return Response({'error': 'Forbidden'}, status=403)

    qs = AuditLog.objects.filter(target_id=str(candidate_id)).select_related('actor__profile').order_by('-created_at')[:100]
    return Response(AuditLogSerializer(qs, many=True).data)
