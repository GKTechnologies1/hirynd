from rest_framework import serializers
from .models import ChatRoom, ChatRoomParticipant, ChatMessage


class ChatParticipantSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.profile.full_name', read_only=True)
    user_role = serializers.CharField(source='role', read_only=True)

    class Meta:
        model = ChatRoomParticipant
        fields = ['id', 'user_id', 'full_name', 'user_role', 'joined_at']


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'candidate_id', 'room_name', 'created_at', 'participants']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.profile.full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'room_id', 'sender_id', 'sender_name', 'sender_role',
                  'message_text', 'attachment_url', 'is_system_message',
                  'sent_at', 'edited_at']
