from rest_framework import serializers
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry, RecruiterBankDetails
from users.serializers import ProfileSerializer


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class AdminRecruiterFullSerializer(serializers.ModelSerializer):
    """Serializer for Admins to manage ALL recruiter data (Identity, Education, Staff)."""
    full_name = serializers.CharField(source='user.profile.full_name', required=False)
    phone = serializers.CharField(source='user.profile.phone', required=False)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = RecruiterProfile
        fields = [
            'id', 'email', 'full_name', 'phone',
            'city', 'state', 'country',
            'university', 'major', 'graduation_date', 
            'linkedin_url', 'social_profile_url',
            'company_name', 'employee_id', 'date_of_joining', 
            'department', 'specialization', 'max_clients',
            'prior_recruitment_experience', 'work_type_preference'
        ]

    def update(self, instance, validated_data):
        # Handle Profile updates (full_name, phone)
        user_data = validated_data.pop('user', {})
        profile_data = user_data.pop('profile', {})
        
        if profile_data:
            profile = instance.user.profile
            profile.full_name = profile_data.get('full_name', profile.full_name)
            profile.phone = profile_data.get('phone', profile.phone)
            profile.save()
            
        # Handle RecruiterProfile updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance




class RecruiterBankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterBankDetails
        fields = ['bank_name', 'account_number_last4', 'routing_number_last4']
        read_only_fields = ['account_number_last4', 'routing_number_last4']


class RecruiterAssignmentSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()
    recruiter_email = serializers.SerializerMethodField()
    recruiter_phone = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()

    class Meta:
        model = RecruiterAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at']

    def get_recruiter_name(self, obj):
        return obj.recruiter.profile.full_name if hasattr(obj.recruiter, 'profile') else ''

    def get_recruiter_email(self, obj):
        return obj.recruiter.email if obj.recruiter else ''

    def get_recruiter_phone(self, obj):
        return obj.recruiter.profile.phone if hasattr(obj.recruiter, 'profile') else ''

    def get_candidate_name(self, obj):
        return obj.candidate.user.profile.full_name if hasattr(obj.candidate.user, 'profile') else ''


class JobLinkEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JobLinkEntry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailySubmissionLogSerializer(serializers.ModelSerializer):
    job_entries = JobLinkEntrySerializer(many=True, read_only=True)

    class Meta:
        model = DailySubmissionLog
        fields = '__all__'
        read_only_fields = ['id', 'recruiter', 'created_at', 'updated_at']
