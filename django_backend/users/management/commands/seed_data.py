from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from users.models import User, Profile
from candidates.models import Candidate, ClientIntake, CredentialVersion, InterviewLog, Payment, Referral, PlacementClosure, RoleSuggestion, RoleConfirmation
from jobs.models import JobOpening, CandidateSubmission
from recruiters.models import RecruiterProfile, RecruiterAssignment, TeamLeadAssignment, DailySubmissionLog, JobLinkEntry

class Command(BaseCommand):
    help = 'Seeds the database with test data for functionalities checking'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write("Deleting existing standard users to avoid conflicts...")
        User.objects.filter(email__in=[
            "admin@hyrind.com", "candidate@hyrind.com", "recruiter@hyrind.com", "teamlead@hyrind.com"
        ]).delete()

        password = "admin123"

        self.stdout.write("Creating Users & Profiles...")
        admin = User.objects.create_superuser(email="admin@hyrind.com", password=password)
        Profile.objects.create(user=admin, full_name="System Admin")

        cand_user = User.objects.create_user(email="candidate@hyrind.com", password=password, role="candidate", approval_status="approved")
        Profile.objects.create(user=cand_user, full_name="Alice Candidate", phone="1234567890")

        recr_user = User.objects.create_user(email="recruiter@hyrind.com", password=password, role="recruiter", approval_status="approved")
        Profile.objects.create(user=recr_user, full_name="Bob Recruiter", phone="0987654321")

        tl_user = User.objects.create_user(email="teamlead@hyrind.com", password=password, role="team_lead", approval_status="approved")
        Profile.objects.create(user=tl_user, full_name="Charlie TeamLead", phone="1112223333")

        self.stdout.write("Creating Candidate records...")
        candidate = Candidate.objects.create(
            user=cand_user, status='active_marketing', visa_status='H1B',
            university='Stanford Tech', graduation_year='2021', major='Computer Science'
        )
        ClientIntake.objects.create(candidate=candidate, data={"preferences": "Remote only", "desired_salary": "150k"})
        CredentialVersion.objects.create(candidate=candidate, source_role='candidate', data={"resume": "Resume_v1.pdf"})

        self.stdout.write("Creating Recruiter records...")
        RecruiterProfile.objects.create(user=recr_user, city="New York", company_name="Hyrind Agencies", prior_recruitment_experience="5 years in Tech Staffing")
        RecruiterAssignment.objects.create(candidate=candidate, recruiter=recr_user, role_type="Primary Recruiter", assigned_by=admin)
        TeamLeadAssignment.objects.create(candidate=candidate, team_lead=tl_user, assigned_by=admin)

        self.stdout.write("Creating Jobs & Submissions...")
        job = JobOpening.objects.create(title="Senior Full-stack Engineer", company="TechCorp Inc.", remote=True, salary_range="$140k-$160k", posted_by=admin)
        CandidateSubmission.objects.create(job=job, candidate=candidate, submitted_by=recr_user, status='interviewing')

        self.stdout.write("Creating Interview Logs & Activities...")
        InterviewLog.objects.create(
            candidate=candidate, interview_type="technical_interview", company_name="TechCorp Inc.", role_title="Senior Full-stack Engineer",
            interview_date=timezone.now().date() + timedelta(days=2), submitted_by=recr_user
        )

        log = DailySubmissionLog.objects.create(candidate=candidate, recruiter=recr_user, log_date=timezone.now().date(), applications_count=3, interview_count=1)
        JobLinkEntry.objects.create(submission_log=log, candidate=candidate, company_name="TechCorp Inc.", role_title="Senior Full-stack Engineer", job_url="http://example.com/job", application_status="interview")

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
        self.stdout.write(self.style.WARNING('\nNOTE: All passwords are set to `Password123!`'))
