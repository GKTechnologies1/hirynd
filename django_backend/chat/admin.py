from django.contrib import admin
from .models import ChatRoom, ChatRoomParticipant, ChatMessage

admin.site.register(ChatRoom)
admin.site.register(ChatRoomParticipant)
admin.site.register(ChatMessage)
