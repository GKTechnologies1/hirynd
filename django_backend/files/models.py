import uuid
from django.db import models
from users.models import User


class UploadedFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files')
    file_type = models.CharField(max_length=50)
    bucket_path = models.CharField(max_length=500)
    original_name = models.CharField(max_length=255)
    size_bytes = models.BigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'uploaded_files'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_name} ({self.user.email})"

    def get_download_url(self, request=None):
        """
        Returns an absolute URL to fetch the file via the /media/ proxy.
        The proxy (serve_media view) transparently fetches from MinIO or local disk.
        No S3 credentials are exposed to the frontend.
        """
        relative = f"/media/{self.bucket_path}"
        if request:
            return request.build_absolute_uri(relative)
        return relative
