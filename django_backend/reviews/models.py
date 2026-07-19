import uuid
from django.db import models
from candidates.models import Candidate

class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='review')
    rating = models.FloatField()  # supports float values e.g. 0.5 to 5.0
    review_text = models.TextField(blank=True, null=True)
    job_title = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.candidate.user.email} - {self.rating} stars"
