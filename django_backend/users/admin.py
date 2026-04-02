from django.contrib import admin
from .models import User, Profile

from django.contrib import admin
from .models import User, Profile

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'get_full_name', 'role', 'approval_status', 'is_staff', 'created_at')
    list_filter = ('role', 'approval_status', 'is_staff', 'is_active')
    search_fields = ('email', 'profile__full_name', 'profile__phone')
    ordering = ('-created_at',)
    inlines = (ProfileInline,)
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password')
        }),
        ('Permissions & Status', {
            'fields': ('role', 'approval_status', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'created_at'),
        }),
    )
    readonly_fields = ('created_at', 'last_login')

    def get_full_name(self, obj):
        return obj.profile.full_name if hasattr(obj, 'profile') else ""
    get_full_name.short_description = 'Full Name'

    def save_model(self, request, obj, form, change):
        if obj.password and not obj.password.startswith(('pbkdf2_', 'bcrypt', 'argon2')):
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user_email', 'phone', 'created_at')
    search_fields = ('full_name', 'user__email', 'phone')
    list_select_related = ('user',)
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'

