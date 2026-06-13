from django.utils import timezone
from datetime import timedelta

class UpdateLastActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # After view execution, check if request.user is authenticated
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            now = timezone.now()
            # Only update database at most once per minute to avoid overloading the DB
            last_activity = getattr(user, 'last_activity', None)
            if not last_activity or now - last_activity > timedelta(minutes=1):
                user.last_activity = now
                # Use update_fields to minimize DB write overhead
                user.save(update_fields=['last_activity'])
                
        return response
