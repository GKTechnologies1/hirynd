import os
import django
import sys
from dotenv import load_dotenv

load_dotenv()

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hyrind.settings')
django.setup()

from django.conf import settings
from files.views import _get_s3_client, _ensure_bucket_exists

print("--- MinIO/S3 Client Verification Script ---")
print(f"USE_LOCAL_STORAGE: {settings.USE_LOCAL_STORAGE}")
print(f"AWS_S3_ENDPOINT_URL: {settings.AWS_S3_ENDPOINT_URL}")
print(f"AWS_STORAGE_BUCKET_NAME: {settings.AWS_STORAGE_BUCKET_NAME}")

if settings.USE_LOCAL_STORAGE:
    print("Error: USE_LOCAL_STORAGE is still set to True. Please make sure USE_LOCAL_STORAGE=false in .env.")
    sys.exit(1)

try:
    print("\n1. Initializing S3/MinIO client...")
    s3 = _get_s3_client()
    print("S3 client initialized successfully!")
    
    print(f"\n2. Verifying/creating bucket '{settings.AWS_STORAGE_BUCKET_NAME}'...")
    _ensure_bucket_exists(s3, settings.AWS_STORAGE_BUCKET_NAME)
    print(f"Bucket '{settings.AWS_STORAGE_BUCKET_NAME}' verified/created successfully!")
    
    print("\n3. Testing dummy file upload...")
    test_key = "test_verification_file.txt"
    test_content = b"Hyrind MinIO Storage System Verification successful!"
    
    s3.put_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=test_key,
        Body=test_content,
        ContentType='text/plain'
    )
    print(f"Uploaded dummy file to key '{test_key}'!")
    
    print("\n4. Generating pre-signed download URL...")
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': test_key},
        ExpiresIn=3600
    )
    print("Successfully generated pre-signed URL:")
    print(url)
    
    print("\n5. Cleaning up dummy file...")
    s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=test_key)
    print("Dummy file deleted successfully!")
    
    print("\n✨ ALL TESTS PASSED! MinIO is fully configured, connected, and working perfectly on your machine! ✨")
    
except Exception as e:
    print("\n❌ Connection or Upload Test Failed:")
    import traceback
    traceback.print_exc()
    print("\nSuggestions:")
    print("1. Make sure your MinIO server is running on port 9000.")
    print("2. Verify that MINIO_ROOT_USER and MINIO_ROOT_PASSWORD match your .env MINIO_ACCESS_KEY and MINIO_SECRET_KEY.")
