from rest_framework import serializers
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry, RecruiterBankDetails
from users.serializers import ProfileSerializer
from files.models import UploadedFile


class RecruiterProfileSerializer(serializers.ModelSerializer):
    highest_degree_certificate_file = serializers.SerializerMethodField()
    government_id_card_file = serializers.SerializerMethodField()
    pan_card_file = serializers.SerializerMethodField()
    bank_passbook_file = serializers.SerializerMethodField()
    
    class Meta:
        model = RecruiterProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_highest_degree_certificate_file(self, obj):
        if obj.highest_degree_certificate_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.highest_degree_certificate_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_government_id_card_file(self, obj):
        if obj.government_id_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.government_id_card_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_pan_card_file(self, obj):
        if obj.pan_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.pan_card_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_bank_passbook_file(self, obj):
        if obj.bank_passbook_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.bank_passbook_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None


class AdminRecruiterFullSerializer(serializers.ModelSerializer):
    """Serializer for Admins to manage ALL recruiter data (Identity, Education, Staff)."""
    full_name = serializers.CharField(source='user.profile.full_name', required=False)
    phone = serializers.CharField(source='user.profile.phone', required=False)
    email = serializers.EmailField(source='user.email', read_only=True)
    highest_degree_certificate_file = serializers.SerializerMethodField()
    government_id_card_file = serializers.SerializerMethodField()
    pan_card_file = serializers.SerializerMethodField()
    bank_passbook_file = serializers.SerializerMethodField()
    
    class Meta:
        model = RecruiterProfile
        fields = [
            'id', 'email', 'full_name', 'phone',
            'city', 'state', 'country',
            'university', 'degree', 'major', 'graduation_date', 
            'linkedin_url', 'social_profile_url',
            'company_name', 'employee_id', 'date_of_joining', 
            'department', 'specialization', 'max_clients',
            'prior_recruitment_experience', 'work_type_preference',
            'highest_degree_certificate_id', 'government_id_card_id', 
            'pan_card_id', 'bank_passbook_id',
            'highest_degree_certificate_file', 'government_id_card_file',
            'pan_card_file', 'bank_passbook_file'
        ]

    def get_highest_degree_certificate_file(self, obj):
        if obj.highest_degree_certificate_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.highest_degree_certificate_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_government_id_card_file(self, obj):
        if obj.government_id_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.government_id_card_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_pan_card_file(self, obj):
        if obj.pan_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.pan_card_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_bank_passbook_file(self, obj):
        if obj.bank_passbook_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.bank_passbook_id)
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None

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
    candidate_display_id = serializers.SerializerMethodField()
    assigned_candidate_count = serializers.SerializerMethodField()

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

    def get_candidate_display_id(self, obj):
        try:
            return obj.candidate.user.display_id
        except Exception:
            return None

    def get_assigned_candidate_count(self, obj):
        if hasattr(obj, 'recruiter_active_count'):
            return obj.recruiter_active_count
        # Fallback
        from .models import RecruiterAssignment
        return RecruiterAssignment.objects.filter(recruiter=obj.recruiter, is_active=True).count()


class MyAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for a recruiter viewing their own assignments – rich candidate data."""
    candidate_id = serializers.UUIDField(source='candidate.id', read_only=True)
    candidate_display_id = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = RecruiterAssignment
        fields = [
            'id', 'candidate_id', 'candidate_display_id', 'candidate_name', 'candidate_email',
            'role_type', 'is_active', 'assigned_at', 'unassigned_at', 'status',
        ]
        read_only_fields = fields

    def get_candidate_display_id(self, obj):
        try:
            return obj.candidate.user.display_id
        except Exception:
            return None

    def get_candidate_name(self, obj):
        try:
            return obj.candidate.user.profile.full_name
        except Exception:
            return obj.candidate.user.email

    def get_candidate_email(self, obj):
        try:
            return obj.candidate.user.profile.email or obj.candidate.user.email
        except Exception:
            return obj.candidate.user.email

    def get_status(self, obj):
        return obj.candidate.status


class JobLinkEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JobLinkEntry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyJournalSerializer(serializers.ModelSerializer):
    total_applications_submitted_today = serializers.IntegerField(source='applications_count')
    
    class Meta:
        model = DailySubmissionLog
        fields = ['id', 'log_date', 'total_applications_submitted_today', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class DailySubmissionLogSerializer(serializers.ModelSerializer):
    job_entries = JobLinkEntrySerializer(many=True, read_only=True)

    class Meta:
        model = DailySubmissionLog
        fields = '__all__'
        read_only_fields = ['id', 'recruiter', 'created_at', 'updated_at']
