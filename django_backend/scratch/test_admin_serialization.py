import os
import sys
import django

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hyrind.settings')
django.setup()

from users.models import User
from users.serializers import UserSerializer

def test_login_serialization():
    try:
        admin = User.objects.filter(role='admin').first()
        if not admin:
            print("No admin user found")
            return
        
        print(f"Testing serialization for user: {admin.email}")
        data = UserSerializer(admin).data
        print("Serialization successful:")
        print(data)
    except Exception as e:
        import traceback
        print("Serialization failed:")
        traceback.print_exc()

if __name__ == "__main__":
    test_login_serialization()
