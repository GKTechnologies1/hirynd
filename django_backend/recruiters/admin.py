from django.contrib import admin
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry
admin.site.register(RecruiterProfile)
admin.site.register(RecruiterAssignment)
admin.site.register(DailySubmissionLog)
admin.site.register(JobLinkEntry)
