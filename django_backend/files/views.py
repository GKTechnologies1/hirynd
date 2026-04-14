import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UploadedFile


def _get_s3_client():
    import boto3
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_file(request):
    file = request.FILES.get('file')
    file_type = request.data.get('file_type', 'document')

    if not file:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    ext = file.name.split('.')[-1] if '.' in file.name else 'bin'
    bucket_path = f'{request.user.id}/{file_type}/{uuid.uuid4()}.{ext}'

    use_local = getattr(settings, 'USE_LOCAL_STORAGE', True)
    if use_local:
        saved_path = default_storage.save(bucket_path, ContentFile(file.read()))
    else:
        try:
            s3 = _get_s3_client()
            s3.upload_fileobj(file, settings.AWS_STORAGE_BUCKET_NAME, bucket_path)
            saved_path = bucket_path
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    record = UploadedFile.objects.create(
        user=request.user,
        file_type=file_type,
        bucket_path=saved_path,
        original_name=file.name,
        size_bytes=file.size,
    )

    # Generate download URL to return immediately
    use_local = getattr(settings, 'USE_LOCAL_STORAGE', True)
    if use_local:
        from django.http import HttpRequest
        # We need a dummy request or building it manually
        # Simple approach for local:
        url = request.build_absolute_uri(default_storage.url(saved_path))
    else:
        try:
            s3 = _get_s3_client()
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': saved_path},
                ExpiresIn=3600 * 24 * 7, # 7 days
            )
        except:
            url = saved_path

    return Response({
        'id': str(record.id),
        'url': url,
        'bucket_path': saved_path,
        'original_name': file.name,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_download_url(request, file_id):
    try:
        record = UploadedFile.objects.get(id=file_id, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    use_local = getattr(settings, 'USE_LOCAL_STORAGE', True)
    if use_local:
        url = request.build_absolute_uri(default_storage.url(record.bucket_path))
    else:
        try:
            s3 = _get_s3_client()
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': record.bucket_path},
                ExpiresIn=3600,
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'url': url, 'original_name': record.original_name})

