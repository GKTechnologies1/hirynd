from django.urls import path
from . import views

urlpatterns = [
    path('rooms/', views.my_chat_rooms),
    path('rooms/<uuid:room_id>/messages/', views.room_messages),
    path('rooms/<uuid:room_id>/send/', views.send_message),
]
