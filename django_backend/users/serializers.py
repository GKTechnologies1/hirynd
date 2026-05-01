from rest_framework import serializers
from .models import User, Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'full_name', 'phone', 'avatar_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    display_id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'display_id', 'email', 'role', 'approval_status', 'created_at', 'profile']
        read_only_fields = ['id', 'display_id', 'role', 'approval_status', 'created_at']


class RegisterSerializer(serializers.Serializer):
    # Identity fields
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    phone = serializers.CharField(max_length=20)
    role = serializers.ChoiceField(choices=['candidate', 'recruiter'], default='candidate')

    # Education fields
    university_name = serializers.CharField(max_length=120)
    degree = serializers.CharField(max_length=120, required=False, allow_blank=True)
    major = serializers.CharField(max_length=120, required=False, allow_blank=True)
    graduation_date = serializers.DateField()
    opt_end_date = serializers.DateField(required=False, allow_null=True)

    # Source fields
    how_did_you_hear = serializers.ChoiceField(
        choices=['LinkedIn', 'Google', 'University', 'Friend', 'Social Media', 'Other'],
        required=True,
    )
    friend_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    social_profile = serializers.URLField(required=False, allow_blank=True)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)
    github_url = serializers.URLField(required=False, allow_blank=True)
    visa_status = serializers.ChoiceField(
        choices=['H1B', 'OPT', 'CPT', 'Green Card', 'US Citizen', 'EAD', 'TN', 'Other', 'Other (Visa Status)'],
        required=False,
        allow_blank=True,
    )
    current_location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # Candidate specific
    resume_file = serializers.FileField(required=False)
    additional_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    consent_to_terms = serializers.BooleanField(required=True)

    # Recruiter-specific fields (Handled by Admin later)
    prior_recruitment_experience = serializers.CharField(max_length=500, required=False, allow_blank=True)
    work_type_preference = serializers.ChoiceField(
        choices=['Full-time', 'Part-time', 'Contract', 'Remote'],
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Email already registered.')
        return value.lower()

    def validate(self, data):
        if not data.get('consent_to_terms'):
            raise serializers.ValidationError({'consent_to_terms': 'You must agree to the Terms and Conditions.'})
            
        if data.get('how_did_you_hear') == 'Friend' and not data.get('friend_name'):
            raise serializers.ValidationError({'friend_name': 'Friend name is required when source is Friend.'})
        
        # Recruiter must provide LinkedIn URL as per spec Section B
        if data.get('role') == 'recruiter':
            if not data.get('linkedin_url') and not data.get('social_profile'):
                raise serializers.ValidationError({
                    'linkedin_url': 'LinkedIn Profile URL or Social Profile is required for recruiter registration.'
                })
        return data

    def create(self, validated_data):
        consent_to_terms = validated_data.pop('consent_to_terms', False)
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        phone = validated_data.pop('phone', '')
        role = validated_data.pop('role', 'candidate')
        
        # Candidate specific fields
        opt_end_date = validated_data.pop('opt_end_date', None)
        github_url = validated_data.pop('github_url', '')
        resume_file = validated_data.pop('resume_file', None)
        additional_notes = validated_data.pop('additional_notes', '')

        # Recruiter specific fields (Internal metadata removed from registration)

        # Common profile fields
        university_name = validated_data.pop('university_name', '')
        degree = validated_data.pop('degree', '')
        major = validated_data.pop('major', '')
        graduation_date = validated_data.pop('graduation_date', None)
        how_did_you_hear = validated_data.pop('how_did_you_hear', '')
        friend_name = validated_data.pop('friend_name', '')
        linkedin_url = validated_data.pop('linkedin_url', '')
        social_profile = validated_data.pop('social_profile', '')
        portfolio_url = validated_data.pop('portfolio_url', '')
        visa_status = validated_data.pop('visa_status', '')
        current_location = validated_data.pop('current_location', '')
        city = validated_data.pop('city', '')
        state = validated_data.pop('state', '')
        country = validated_data.pop('country', '')
        prior_recruitment_experience = validated_data.pop('prior_recruitment_experience', '')
        work_type_preference = validated_data.pop('work_type_preference', '')

        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role=role,
            approval_status='pending',
        )
        Profile.objects.create(
            user=user,
            full_name=f"{first_name} {last_name}",
            phone=phone,
        )

        # Create candidate record
        if role == 'candidate':
            from candidates.models import Candidate
            Candidate.objects.create(
                user=user,
                status='pending_approval',
                university=university_name,
                degree=degree,
                major=major,
                graduation_year=str(graduation_date.year) if graduation_date else "",
                graduation_date=graduation_date,
                opt_end_date=opt_end_date,
                visa_status=visa_status,
                referral_source=how_did_you_hear,
                referral_friend_name=friend_name,
                linkedin_url=linkedin_url,
                portfolio_url=portfolio_url,
                github_url=github_url,
                current_location=current_location,
                resume_file=resume_file,
                notes=additional_notes
            )
        elif role == 'recruiter':
            from recruiters.models import RecruiterProfile
            RecruiterProfile.objects.create(
                user=user,
                city=city or current_location,
                state=state,
                country=country,
                university=university_name,
                degree=degree,
                major=major,
                graduation_date=graduation_date,
                linkedin_url=linkedin_url,
                social_profile_url=social_profile,
                prior_recruitment_experience=prior_recruitment_experience,
                work_type_preference=work_type_preference,
            )

        return user


class ApproveUserSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['approved', 'rejected'])


class UserListSerializer(serializers.ModelSerializer):
    """Flat serialiser — frontend gets full_name/phone directly without nested profile access."""
    profile = ProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    university = serializers.SerializerMethodField()
    degree = serializers.SerializerMethodField()
    major = serializers.SerializerMethodField()
    graduation_date = serializers.SerializerMethodField()
    linkedin_url = serializers.SerializerMethodField()
    social_profile_url = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    # Candidate specific
    candidate_id = serializers.SerializerMethodField()
    opt_end_date = serializers.SerializerMethodField()
    github_url = serializers.SerializerMethodField()
    visa_status = serializers.SerializerMethodField()
    referral_source = serializers.SerializerMethodField()
    referral_friend_name = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    # Recruiter specific
    recruiter_id = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    date_of_joining = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    max_clients = serializers.SerializerMethodField()
    prior_recruitment_experience = serializers.SerializerMethodField()
    work_type_preference = serializers.SerializerMethodField()
    assigned_candidate_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'display_id', 'email', 'role', 'approval_status', 'is_active', 'created_at',
            'full_name', 'phone', 'profile',
            'university', 'degree', 'major', 'graduation_date',
            'linkedin_url', 'social_profile_url',
            'city', 'state', 'country',
            'candidate_id', 'opt_end_date', 'github_url', 'visa_status', 'referral_source', 'referral_friend_name', 'notes',
            'recruiter_id', 'company_name', 'employee_id', 'date_of_joining', 'department', 'specialization', 'max_clients',
            'prior_recruitment_experience', 'work_type_preference', 'assigned_candidate_count'
        ]

    def get_full_name(self, obj):
        return getattr(getattr(obj, 'profile', None), 'full_name', '') or ''

    def get_phone(self, obj):
        return getattr(getattr(obj, 'profile', None), 'phone', '') or ''

    def _get_target_profile(self, obj):
        if obj.role == 'candidate':
            return getattr(obj, 'candidate', None)
        elif obj.role == 'recruiter':
            return getattr(obj, 'recruiter_profile', None)
        return None

    def get_university(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'university', '') or ''

    def get_major(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'major', '') or ''

    def get_degree(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'degree', '') or ''

    def get_graduation_date(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return None
        date = getattr(p, 'graduation_date', None)
        return date.isoformat() if date else None

    def get_linkedin_url(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'linkedin_url', '') or ''

    def get_social_profile_url(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        if obj.role == 'candidate':
            return getattr(p, 'portfolio_url', '') or ''
        return getattr(p, 'social_profile_url', '') or ''

    def get_city(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        if obj.role == 'candidate':
            return getattr(p, 'current_location', '') or ''
        return getattr(p, 'city', '') or ''

    def get_state(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'state', '') or ''

    def get_country(self, obj):
        p = self._get_target_profile(obj)
        if p is None: return ''
        return getattr(p, 'country', '') or ''

    # Candidate especific
    def get_opt_end_date(self, obj):
        if obj.role != 'candidate': return None
        p = getattr(obj, 'candidate', None)
        date = getattr(p, 'opt_end_date', None)
        return date.isoformat() if date else None

    def get_github_url(self, obj):
        if obj.role != 'candidate': return ''
        p = getattr(obj, 'candidate', None)
        return getattr(p, 'github_url', '') or ''

    def get_visa_status(self, obj):
        if obj.role != 'candidate': return ''
        p = getattr(obj, 'candidate', None)
        return getattr(p, 'visa_status', '') or ''

    def get_referral_source(self, obj):
        if obj.role != 'candidate': return ''
        p = getattr(obj, 'candidate', None)
        return getattr(p, 'referral_source', '') or ''

    def get_referral_friend_name(self, obj):
        if obj.role != 'candidate': return ''
        p = getattr(obj, 'candidate', None)
        return getattr(p, 'referral_friend_name', '') or ''

    def get_notes(self, obj):
        if obj.role != 'candidate': return ''
        p = getattr(obj, 'candidate', None)
        return getattr(p, 'notes', '') or ''

    def get_candidate_id(self, obj):
        if obj.role != 'candidate': return None
        p = getattr(obj, 'candidate', None)
        return str(p.id) if p else None

    # Recruiter especific
    def get_recruiter_id(self, obj):
        if obj.role != 'recruiter': return None
        p = getattr(obj, 'recruiter_profile', None)
        return str(p.id) if p else None
    def get_company_name(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'company_name', '') or ''

    def get_employee_id(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'employee_id', '') or ''

    def get_date_of_joining(self, obj):
        if obj.role != 'recruiter': return None
        p = getattr(obj, 'recruiter_profile', None)
        date = getattr(p, 'date_of_joining', None)
        return date.isoformat() if date else None

    def get_department(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'department', '') or ''

    def get_specialization(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'specialization', '') or ''

    def get_max_clients(self, obj):
        if obj.role != 'recruiter': return None
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'max_clients', 0)

    def get_prior_recruitment_experience(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'prior_recruitment_experience', '') or ''

    def get_work_type_preference(self, obj):
        if obj.role != 'recruiter': return ''
        p = getattr(obj, 'recruiter_profile', None)
        return getattr(p, 'work_type_preference', '') or ''

    def get_assigned_candidate_count(self, obj):
        if obj.role not in ['recruiter', 'team_lead', 'team_manager']:
            return None
        # Check if already annotated for performance
        if hasattr(obj, 'assigned_candidate_count'):
            return obj.assigned_candidate_count
        return getattr(obj, 'recruiter_assignments', getattr(obj, 'assignments', None)) and obj.recruiter_assignments.filter(is_active=True).count() or 0


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(min_length=8, required=True)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})
        return data


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    university = serializers.CharField(max_length=120, required=False, allow_blank=True)
    degree = serializers.CharField(max_length=120, required=False, allow_blank=True)
    major = serializers.CharField(max_length=120, required=False, allow_blank=True)
    graduation_year = serializers.CharField(max_length=10, required=False, allow_blank=True)
    visa_status = serializers.CharField(max_length=50, required=False, allow_blank=True)
    referral_source = serializers.CharField(max_length=100, required=False, allow_blank=True)
    referral_friend = serializers.CharField(max_length=255, required=False, allow_blank=True)
    current_location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    mode = serializers.ChoiceField(choices=['interest', 'general'])
    message = serializers.CharField(required=False, allow_blank=True)
    resume = serializers.FileField(required=False, allow_null=True)

    def validate_email(self, value):
        # We don't block general inquiries if email exists, 
        # but for interest form (leads) we should probably link to existing user if possible,
        # but to keep it simple and consistent with registration, we block duplicates for now.
        return value.lower()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_new_password = serializers.CharField()

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})
        return data
