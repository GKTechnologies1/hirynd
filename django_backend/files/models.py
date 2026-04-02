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
