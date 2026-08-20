from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    candidate_display_id = serializers.SerializerMethodField()
    candidate_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'candidate', 'rating', 'review_text', 'job_title', 
            'image_url', 'is_approved', 'created_at', 'updated_at',
            'candidate_name', 'candidate_email', 'candidate_display_id', 'candidate_avatar',
            'status'
        ]
        read_only_fields = ['id', 'candidate', 'is_approved', 'created_at', 'updated_at', 'status']

    def get_candidate_name(self, obj):
        profile = getattr(obj.candidate.user, 'profile', None)
        if profile and profile.full_name:
            return profile.full_name
        return obj.candidate.user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def get_candidate_avatar(self, obj):
        profile = getattr(obj.candidate.user, 'profile', None)
        return getattr(profile, 'avatar_url', '') or ''
