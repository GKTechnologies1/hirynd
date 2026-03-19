import uuid
from django.db import models
from users.models import User


class ChatRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate_id = models.UUIDField(unique=True)
    room_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_rooms'

    def __str__(self):
        return self.room_name


class ChatRoomParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_participations')
    role = models.CharField(max_length=20)
    joined_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'chat_room_participants'
        unique_together = ['room', 'user']


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    sender_role = models.CharField(max_length=20)
    message_text = models.TextField(max_length=2000)
    attachment_url = models.URLField(blank=True, null=True)
    is_system_message = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(blank=True, null=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['sent_at']
