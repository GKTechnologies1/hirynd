from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.candidate_review_me, name='candidate_review_me'),
    path('admin/', views.admin_list_reviews, name='admin_list_reviews'),
    path('admin/<uuid:review_id>/', views.admin_manage_review, name='admin_manage_review'),
    path('public/', views.list_public_reviews, name='list_public_reviews'),
]
