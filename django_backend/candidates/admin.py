from django.contrib import admin
from .models import Candidate, ClientIntake, RoleSuggestion, CredentialVersion, Referral, InterviewLog, PlacementClosure

admin.site.register(Candidate)
admin.site.register(ClientIntake)
admin.site.register(RoleSuggestion)
admin.site.register(CredentialVersion)
admin.site.register(Referral)
admin.site.register(InterviewLog)
admin.site.register(PlacementClosure)
