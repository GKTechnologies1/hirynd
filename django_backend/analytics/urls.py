from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.track_page_view, name='track_page_view'),
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
]
