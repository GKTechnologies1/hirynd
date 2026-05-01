import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('approval_status', 'approved')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


# Per-role prefix for Hyrind branded display IDs
# Candidate: HYRCDT000001, Recruiter: HYRREC000001, Lead/Interest: HYRLD0001
ROLE_PREFIX_MAP = {
    'candidate':     'HYRCDT',
    'recruiter':     'HYRREC',
    'team_lead':     'HYRTLD',
    'team_manager':  'HYRTMG',
    'admin':         'HYRADM',
    'finance_admin': 'HYRFIN',
}

ROLE_PADDING_MAP = {
    'candidate':     6,
    'recruiter':     6,
    'team_lead':     6,
    'team_manager':  6,
    'admin':         6,
    'finance_admin': 6,
}


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('candidate', 'Candidate'),
        ('recruiter', 'Recruiter'),
        ('team_lead', 'Team Lead'),
        ('team_manager', 'Team Manager'),
        ('admin', 'Admin'),
        ('finance_admin', 'Finance Admin'),
    ]
    APPROVAL_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='candidate')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='pending')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    seq_number = models.PositiveIntegerField(
        null=True, blank=True, editable=False,
        help_text="Auto-assigned per-role sequential number for display ID"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['role', 'seq_number'], name='user_role_seq_idx'),
            models.Index(
                fields=['seq_number'],
                name='user_seq_number_idx',
                condition=models.Q(seq_number__isnull=False),
            ),
        ]

    @property
    def display_id(self):
        """Branded display ID: HYRCDT000001 (candidates), HYRREC000001 (recruiters), etc."""
        if self.seq_number is None:
            return str(self.id)[:8].upper()
        prefix = ROLE_PREFIX_MAP.get(self.role, 'HYRUSR')
        padding = ROLE_PADDING_MAP.get(self.role, 6)
        return f"{prefix}{str(self.seq_number).zfill(padding)}"

    def save(self, *args, **kwargs):
        if not self.seq_number and self.role:
            # Per-role sequential: each role gets its own 1, 2, 3... counter
            from django.db.models import Max
            max_seq = User.objects.filter(role=self.role).aggregate(Max('seq_number'))['seq_number__max']
            self.seq_number = (max_seq or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.display_id} - {self.email}"


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    university = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    major = models.CharField(max_length=255, blank=True, null=True)
    graduation_date = models.DateField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    social_profile_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profiles'

    def __str__(self):
        return f"Profile of {self.user.email}"
