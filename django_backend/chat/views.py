from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone

from users.permissions import IsApproved
from audit.utils import log_action
from .models import ChatRoom, ChatRoomParticipant, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer


@api_view(['GET'])
@permission_classes([IsApproved])
def my_chat_rooms(request):
    """List chat rooms the user participates in."""
    room_ids = ChatRoomParticipant.objects.filter(
        user=request.user, removed_at__isnull=True
    ).values_list('room_id', flat=True)
    rooms = ChatRoom.objects.filter(id__in=room_ids).prefetch_related('participants__user__profile')
    return Response(ChatRoomSerializer(rooms, many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def room_messages(request, room_id):
    """Get messages for a specific chat room."""
    # Verify user is a participant
    if not ChatRoomParticipant.objects.filter(
        room_id=room_id, user=request.user, removed_at__isnull=True
    ).exists() and request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    messages = ChatMessage.objects.filter(
        room_id=room_id, deleted_at__isnull=True
    ).select_related('sender__profile').order_by('sent_at')[:200]
    return Response(ChatMessageSerializer(messages, many=True).data)


@api_view(['POST'])
@permission_classes([IsApproved])
def send_message(request, room_id):
    """Send a message in a chat room."""
    if not ChatRoomParticipant.objects.filter(
        room_id=room_id, user=request.user, removed_at__isnull=True
    ).exists() and request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    message = ChatMessage.objects.create(
        room_id=room_id,
        sender=request.user,
        sender_role=request.user.role,
        message_text=request.data.get('message_text', ''),
        attachment_url=request.data.get('attachment_url'),
    )
    return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
