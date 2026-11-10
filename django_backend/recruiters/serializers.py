from rest_framework import serializers
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry, RecruiterBankDetails
from job_discovery.models import DiscoveredJob
from users.serializers import ProfileSerializer
from files.models import UploadedFile
from users.models import User


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
    log_date = serializers.SerializerMethodField()

    class Meta:
        model = JobLinkEntry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_log_date(self, obj):
        return obj.submission_log.log_date if obj.submission_log else None


class PublicDiscoveredJobAlertSerializer(serializers.ModelSerializer):
    """
    Public-facing serializer for unauthenticated Job Board.
    Strictly omits all visa intelligence, internal scraping metadata, and work authorization.
    """
    role_title = serializers.CharField(source='title', read_only=True)
    job_description = serializers.CharField(read_only=True)
    display_id = serializers.SerializerMethodField()
    work_mode = serializers.SerializerMethodField()
    experience_required = serializers.SerializerMethodField()
    salary = serializers.SerializerMethodField()
    salary_range = serializers.SerializerMethodField()
    salary_type = serializers.CharField(source='salary_period', read_only=True)
    application_status = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    log_date = serializers.SerializerMethodField()
    is_public = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = DiscoveredJob
        fields = [
            'id', 'job_id', 'display_id', 'title', 'role_title', 'company_name',
            'target_role', 'job_url', 'job_description',
            'location_raw', 'city', 'state', 'state_code', 'country',
            'is_remote', 'is_hybrid', 'work_mode',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'salary_type', 'salary_raw',
            'salary', 'salary_range',
            'employment_type', 'experience_level', 'experience_required',
            'date_posted', 'log_date',
            'review_status', 'application_status', 'status',
            'is_active', 'is_public',
            'created_at', 'updated_at',
        ]

    def get_display_id(self, obj):
        if obj.job_id:
            return obj.job_id
        return f"HYRJOB{str(obj.id)[:6].upper()}"

    def get_work_mode(self, obj):
        if obj.is_remote:
            return 'Remote'
        if obj.is_hybrid:
            return 'Hybrid'
        return 'Onsite'

    def get_experience_required(self, obj):
        return obj.experience_level or 'Not Specified'

    def get_salary(self, obj):
        if obj.salary_raw:
            return obj.salary_raw
        if obj.salary_min and obj.salary_max:
            return f"${int(obj.salary_min):,} - ${int(obj.salary_max):,}"
        if obj.salary_min:
            return f"${int(obj.salary_min):,}+"
        return "Not Disclosed"

    def get_salary_range(self, obj):
        return self.get_salary(obj)

    def get_application_status(self, obj):
        if obj.review_status == 'REJECTED':
            return 'rejected'
        if not obj.is_active:
            return 'expired'
        return 'applied'

    def get_status(self, obj):
        return self.get_application_status(obj)

    def get_log_date(self, obj):
        if obj.date_posted:
            return obj.date_posted.date()
        if obj.created_at:
            return obj.created_at.date()
        return None


class DiscoveredJobAlertSerializer(serializers.ModelSerializer):
    role_title = serializers.CharField(source='title', read_only=True)
    job_description = serializers.CharField(read_only=True)
    display_id = serializers.SerializerMethodField()
    work_mode = serializers.SerializerMethodField()
    experience_required = serializers.SerializerMethodField()
    salary = serializers.SerializerMethodField()
    salary_range = serializers.SerializerMethodField()
    salary_type = serializers.CharField(source='salary_period', read_only=True)
    visa_eligibility = serializers.SerializerMethodField()
    application_status = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    log_date = serializers.SerializerMethodField()
    is_public = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = DiscoveredJob
        fields = [
            'id', 'job_id', 'display_id', 'title', 'role_title', 'company_name',
            'company_name_norm', 'target_role', 'job_url', 'job_description',
            'location_raw', 'city', 'state', 'state_code', 'country',
            'is_remote', 'is_hybrid', 'work_mode',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'salary_type', 'salary_raw',
            'salary', 'salary_range',
            'employment_type', 'experience_level', 'experience_required',
            'source_portal', 'date_posted', 'log_date',
            'review_status', 'application_status', 'status',
            'is_duplicate', 'is_active', 'is_public',
            'visa_matched', 'h1b_sponsor', 'h1b_filings_recent', 'h1b_approvals',
            'green_card_sponsor', 'everify_enrolled', 'visa_grade', 'visa_friendly_score',
            'visa_eligibility',
            'created_at', 'updated_at',
        ]

    def get_display_id(self, obj):
        if obj.job_id:
            return obj.job_id
        return f"HYRJOB{str(obj.id)[:6].upper()}"

    def get_work_mode(self, obj):
        if obj.is_remote:
            return 'Remote'
        if obj.is_hybrid:
            return 'Hybrid'
        return 'Onsite'

    def get_experience_required(self, obj):
        return obj.experience_level or 'Not Specified'

    def get_salary(self, obj):
        if obj.salary_raw:
            return obj.salary_raw
        if obj.salary_min and obj.salary_max:
            return f"${int(obj.salary_min):,} - ${int(obj.salary_max):,}"
        if obj.salary_min:
            return f"${int(obj.salary_min):,}+"
        return "Not Disclosed"

    def get_salary_range(self, obj):
        return self.get_salary(obj)

    def get_visa_eligibility(self, obj):
        if obj.visa_grade:
            return f"Grade {obj.visa_grade}"
        if obj.h1b_sponsor:
            return "H1B Sponsor"
        return "All Work Authorization"

    def get_application_status(self, obj):
        if obj.review_status == 'REJECTED':
            return 'rejected'
        if not obj.is_active:
            return 'expired'
        return 'applied'

    def get_status(self, obj):
        return self.get_application_status(obj)

    def get_log_date(self, obj):
        if obj.date_posted:
            return obj.date_posted.date()
        if obj.created_at:
            return obj.created_at.date()
        return None


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


class TeamMemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    # RecruiterProfile fields
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    state = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    university = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    degree = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    major = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    graduation_date = serializers.DateField(required=False, allow_null=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    social_profile_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    company_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    employee_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialization = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    max_clients = serializers.IntegerField(required=False)
    prior_recruitment_experience = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    work_type_preference = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    referral_source = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    referral_friend_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    bank_details = serializers.SerializerMethodField()
    resume_file = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'display_id', 'email', 'role', 'approval_status', 'is_active', 'account_status', 'created_at',
            'full_name', 'phone',
            'city', 'state', 'country',
            'university', 'degree', 'major', 'graduation_date',
            'linkedin_url', 'social_profile_url',
            'company_name', 'employee_id', 'date_of_joining',
            'department', 'specialization', 'max_clients',
            'prior_recruitment_experience', 'work_type_preference',
            'referral_source', 'referral_friend_name',
            'bank_details', 'resume_file'
        ]

    def get_bank_details(self, instance):
        try:
            bank = instance.bank_details
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

    def get_resume_file(self, instance):
        rec_profile = getattr(instance, 'recruiter_profile', None)
        if not rec_profile or not rec_profile.resume_file:
            return None
        request = self.context.get('request')
        relative = f"/media/{rec_profile.resume_file.name}"
        return request.build_absolute_uri(relative) if request else relative

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        profile = getattr(instance, 'profile', None)
        ret['full_name'] = getattr(profile, 'full_name', '') or ''
        ret['phone'] = getattr(profile, 'phone', '') or ''
        
        rec_profile = getattr(instance, 'recruiter_profile', None)
        for field in [
            'city', 'state', 'country', 'university', 'degree', 'major',
            'linkedin_url', 'social_profile_url', 'company_name', 'employee_id',
            'department', 'specialization', 'prior_recruitment_experience',
            'work_type_preference', 'referral_source', 'referral_friend_name'
        ]:
            ret[field] = getattr(rec_profile, field, '') or ''
            
        ret['max_clients'] = getattr(rec_profile, 'max_clients', 3) or 3
        
        grad_date = getattr(rec_profile, 'graduation_date', None)
        ret['graduation_date'] = grad_date.isoformat() if grad_date else None
        
        doj = getattr(rec_profile, 'date_of_joining', None)
        ret['date_of_joining'] = doj.isoformat() if doj else None
        
        return ret

    def update(self, instance, validated_data):
        from users.models import Profile
        from recruiters.models import RecruiterProfile
        
        profile, _ = Profile.objects.get_or_create(user=instance)
        rec_profile, _ = RecruiterProfile.objects.get_or_create(user=instance)
        
        full_name = validated_data.get('full_name')
        if full_name is not None:
            profile.full_name = full_name
        phone = validated_data.get('phone')
        if phone is not None:
            profile.phone = phone
        profile.save()
        
        for field in [
            'city', 'state', 'country', 'university', 'degree', 'major',
            'linkedin_url', 'social_profile_url', 'company_name', 'employee_id',
            'department', 'specialization', 'max_clients', 'prior_recruitment_experience',
            'work_type_preference', 'referral_source', 'referral_friend_name',
            'graduation_date', 'date_of_joining'
        ]:
            if field in validated_data:
                setattr(rec_profile, field, validated_data[field])
        rec_profile.save()

        # Handle Bank Details updates from initial_data
        bank_data = self.initial_data.get('bank_details')
        if bank_data:
            from .models import RecruiterBankDetails
            bank, _ = RecruiterBankDetails.objects.get_or_create(recruiter=instance)
            
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
        
        return instance
