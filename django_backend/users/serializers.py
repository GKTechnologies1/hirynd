from rest_framework import serializers
from .models import User, Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'full_name', 'phone', 'avatar_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'approval_status', 'created_at', 'profile']
        read_only_fields = ['id', 'role', 'approval_status', 'created_at']


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
    major_degree = serializers.CharField(max_length=120)
    graduation_date = serializers.DateField()

    # Source fields
    how_did_you_hear = serializers.ChoiceField(
        choices=['LinkedIn', 'Google', 'University', 'Friend', 'Social Media', 'Other'],
        required=True,
    )
    friend_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)
    visa_status = serializers.ChoiceField(
        choices=['H1B', 'OPT', 'CPT', 'Green Card', 'US Citizen', 'EAD', 'TN', 'Other'],
        required=False,
        allow_blank=True,
    )
    current_location = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Recruiter-specific optional fields
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
        if data.get('how_did_you_hear') == 'Friend' and not data.get('friend_name'):
            raise serializers.ValidationError({'friend_name': 'Friend name is required when source is Friend.'})
        # Recruiter must provide at least one professional link
        if data.get('role') == 'recruiter' and not data.get('linkedin_url'):
            raise serializers.ValidationError({'linkedin_url': 'LinkedIn URL is required for recruiters.'})
        return data

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        phone = validated_data.pop('phone', '')
        role = validated_data.pop('role', 'candidate')
        university_name = validated_data.pop('university_name', '')
        major_degree = validated_data.pop('major_degree', '')
        graduation_date = validated_data.pop('graduation_date', None)
        how_did_you_hear = validated_data.pop('how_did_you_hear', '')
        friend_name = validated_data.pop('friend_name', '')
        linkedin_url = validated_data.pop('linkedin_url', '')
        portfolio_url = validated_data.pop('portfolio_url', '')
        visa_status = validated_data.pop('visa_status', '')
        current_location = validated_data.pop('current_location', '')
        validated_data.pop('prior_recruitment_experience', '')
        validated_data.pop('work_type_preference', '')

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

        # Create candidate record with registration data
        if role == 'candidate':
            from candidates.models import Candidate
            Candidate.objects.create(
                user=user,
                status='pending_approval',
                university=university_name,
                major=major_degree,
                graduation_date=graduation_date,
                visa_status=visa_status,
                referral_source=how_did_you_hear,
                referral_friend_name=friend_name,
                linkedin_url=linkedin_url,
                portfolio_url=portfolio_url,
                current_location=current_location,
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

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'approval_status', 'is_active', 'created_at', 'full_name', 'phone', 'profile']

    def get_full_name(self, obj):
        return getattr(getattr(obj, 'profile', None), 'full_name', '') or ''

    def get_phone(self, obj):
        return getattr(getattr(obj, 'profile', None), 'phone', '') or ''


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(min_length=8, required=True)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})
        return data
