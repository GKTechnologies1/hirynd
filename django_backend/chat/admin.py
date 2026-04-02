from django.contrib import admin
from .models import ChatRoom, ChatRoomParticipant, ChatMessage

class ParticipantInline(admin.TabularInline):
    model = ChatRoomParticipant
    extra = 0

class MessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    fields = ('sender', 'message_text', 'sent_at')
    readonly_fields = ('sent_at',)

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('room_name', 'candidate_id', 'created_at')
    search_fields = ('room_name', 'candidate_id')
    inlines = [ParticipantInline, MessageInline]

@admin.register(ChatRoomParticipant)
class ChatRoomParticipantAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('user__email', 'room__room_name')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('room', 'sender', 'sender_role', 'sent_at', 'is_system_message')
    list_filter = ('sender_role', 'is_system_message', 'sent_at')
    search_fields = ('sender__email', 'message_text', 'room__room_name')
    readonly_fields = ('sent_at', 'edited_at', 'deleted_at')

