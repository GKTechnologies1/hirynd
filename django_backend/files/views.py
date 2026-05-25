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


def _ensure_bucket_exists(s3_client, bucket_name):
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except Exception as e:
        error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', '')
        if error_code in ('404', 'NoSuchBucket', '403'): # 403 might be returned on check if permissions are restricted but usually 404 for missing
            try:
                s3_client.create_bucket(Bucket=bucket_name)
            except Exception:
                # If we cannot create it (e.g. read-only user), raise original error
                raise e
        else:
            raise e


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
            _ensure_bucket_exists(s3, settings.AWS_STORAGE_BUCKET_NAME)
            s3.upload_fileobj(
                file,
                settings.AWS_STORAGE_BUCKET_NAME,
                bucket_path,
                ExtraArgs={'ContentType': getattr(file, 'content_type', 'application/octet-stream')}
            )
            saved_path = bucket_path
        except Exception as e:
            return Response({'error': f"MinIO storage error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    record = UploadedFile.objects.create(
        user=request.user,
        file_type=file_type,
        bucket_path=saved_path,
        original_name=file.name,
        size_bytes=file.size,
    )

    # Generate download URL to return immediately
    url = record.get_download_url(request)

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
        # Check permissions: if request.user is admin/staff/recruiter/team_lead, bypass user filter.
        # Otherwise, restrict to user=request.user
        if request.user.role in ('admin', 'finance_admin', 'team_lead', 'team_manager', 'recruiter'):
            record = UploadedFile.objects.get(id=file_id)
        else:
            record = UploadedFile.objects.get(id=file_id, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


    url = record.get_download_url(request)
    return Response({'url': url, 'original_name': record.original_name})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_files(request):
    """
    List all files uploaded by the current user.
    Admins/staff can optionally filter by user_id via ?user_id=<uuid>.
    """
    if request.user.role in ('admin', 'finance_admin', 'team_lead', 'team_manager', 'recruiter'):
        user_id = request.query_params.get('user_id')
        if user_id:
            qs = UploadedFile.objects.filter(user_id=user_id)
        else:
            qs = UploadedFile.objects.filter(user=request.user)
    else:
        qs = UploadedFile.objects.filter(user=request.user)

    file_type = request.query_params.get('file_type')
    if file_type:
        qs = qs.filter(file_type=file_type)

    results = [
        {
            'id': str(f.id),
            'file_type': f.file_type,
            'original_name': f.original_name,
            'size_bytes': f.size_bytes,
            'uploaded_at': f.uploaded_at,
            'url': f.get_download_url(request),
        }
        for f in qs
    ]
    return Response(results)
