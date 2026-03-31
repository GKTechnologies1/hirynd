from django.contrib import admin
from .models import User, Profile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'approval_status', 'created_at')
    list_filter = ('role', 'approval_status')
    search_fields = ('email',)

    def save_model(self, request, obj, form, change):
        if obj.password and not obj.password.startswith('pbkdf2_'):
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'phone')
    search_fields = ('full_name',)
