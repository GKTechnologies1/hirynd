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
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'resume_file']
    
    def get_highest_degree_certificate_file(self, obj):
        if obj.highest_degree_certificate_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.highest_degree_certificate_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_government_id_card_file(self, obj):
        if obj.government_id_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.government_id_card_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_pan_card_file(self, obj):
        if obj.pan_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.pan_card_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_bank_passbook_file(self, obj):
        if obj.bank_passbook_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.bank_passbook_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
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
    resume_file = serializers.SerializerMethodField()
    highest_degree_certificate_file = serializers.SerializerMethodField()
    government_id_card_file = serializers.SerializerMethodField()
    pan_card_file = serializers.SerializerMethodField()
    bank_passbook_file = serializers.SerializerMethodField()
    bank_details = serializers.SerializerMethodField()
    
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
            'referral_source', 'referral_friend_name', 'resume_file',
            'highest_degree_certificate_id', 'government_id_card_id', 
            'pan_card_id', 'bank_passbook_id',
            'highest_degree_certificate_file', 'government_id_card_file',
            'pan_card_file', 'bank_passbook_file', 'bank_details'
        ]

    def get_resume_file(self, obj):
        if not obj.resume_file:
            return None
        request = self.context.get('request')
        relative = f"/media/{obj.resume_file.name}"
        return request.build_absolute_uri(relative) if request else relative

    def get_highest_degree_certificate_file(self, obj):
        if obj.highest_degree_certificate_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.highest_degree_certificate_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_government_id_card_file(self, obj):
        if obj.government_id_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.government_id_card_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_pan_card_file(self, obj):
        if obj.pan_card_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.pan_card_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None
    
    def get_bank_passbook_file(self, obj):
        if obj.bank_passbook_id:
            try:
                file_obj = UploadedFile.objects.get(id=obj.bank_passbook_id)
                request = self.context.get('request')
                return {
                    'id': str(file_obj.id),
                    'name': file_obj.original_name,
                    'url': file_obj.get_download_url(request),
                    'uploaded_at': file_obj.uploaded_at
                }
            except UploadedFile.DoesNotExist:
                return None
        return None

    def get_bank_details(self, obj):
        try:
            bank = obj.user.bank_details
            return {
                'bank_name': bank.bank_name or "",
                'account_number_last4': bank.account_number_last4 or "",
                'routing_number_last4': bank.routing_number_last4 or "",
                'account_number': bank.account_number_encrypted or "",
                'ifsc_code': bank.routing_number_encrypted or "",
                'routing_number': bank.routing_number_encrypted or "",
            }
        except Exception:
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
            
        # Handle Bank Details updates from initial_data
        bank_data = self.initial_data.get('bank_details')
        if bank_data:
            from .models import RecruiterBankDetails
            bank, _ = RecruiterBankDetails.objects.get_or_create(recruiter=instance.user)
            
            bank_name = bank_data.get('bank_name')
            if bank_name is not None:
                bank.bank_name = bank_name
                
            acc = bank_data.get('account_number', '')
            rtn = bank_data.get('routing_number', '') or bank_data.get('ifsc_code', '')
            
            if acc and not acc.startswith('****'):
                bank.account_number_last4 = acc[-4:]
                bank.account_number_encrypted = acc
            if rtn and not rtn.startswith('****'):
                bank.routing_number_last4 = rtn[-4:]
                bank.routing_number_encrypted = rtn
            bank.save()
            
        # Handle RecruiterProfile updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance




class RecruiterBankDetailsSerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(source='account_number_encrypted', required=False, allow_null=True, allow_blank=True)
    ifsc_code = serializers.CharField(source='routing_number_encrypted', required=False, allow_null=True, allow_blank=True)
    routing_number = serializers.CharField(source='routing_number_encrypted', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = RecruiterBankDetails
        fields = ['bank_name', 'account_number_last4', 'routing_number_last4', 'account_number', 'ifsc_code', 'routing_number']
        read_only_fields = ['account_number_last4', 'routing_number_last4']


class RecruiterAssignmentSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()
    recruiter_email = serializers.SerializerMethodField()
    recruiter_phone = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    candidate_display_id = serializers.SerializerMethodField()
    assigned_candidate_count = serializers.SerializerMethodField()
    max_clients = serializers.SerializerMethodField()

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

    def get_max_clients(self, obj):
        if not obj.recruiter:
            return 3
        profile = getattr(obj.recruiter, 'recruiter_profile', None)
        return getattr(profile, 'max_clients', 3) if profile else 3


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
