# Enhanced Client Intake Form - Complete Integration Guide

## Overview
The Client Intake Form has been upgraded to a comprehensive professional intake sheet with support for arrays, multiple document uploads, and enhanced validation. This guide covers all changes, API endpoints, and integration details.

---

## 1. NEW FIELDS ADDED

### Personal Details
- `marketing_email` - Email for marketing communications
- `marketing_phone` - Phone for marketing communications  
- `mailing_address` - Separate mailing address
- `first_entry_us` (date) - Date of first entry to US
- `total_years_us` (number) - Total years spent in US

### Skills (Split into separate fields)
- `primary_skills` - Main technical skills
- `currently_learning` - Skills actively being learned
- `experienced_tools` - Tools/software with experience
- `learning_tools` - Tools candidate wants to learn
- `non_technical_skills` - Leadership, communication, etc.

### Work Experience (Array)
- `experiences: [{ job_title, company_name, company_address, start_date, end_date, job_type, responsibilities }]`

### Education (Enhanced)
- `highest_degree` - Primary degree level
- `highest_field_of_study` - Primary field
- `highest_university` - Primary university
- `highest_country` - Primary university country
- `highest_graduation_date` - Primary graduation date
- `bachelors_degree` - Additional bachelors info
- `bachelors_field_of_study` - Additional field
- `bachelors_university` - Additional university
- `bachelors_country` - Additional country
- `bachelors_graduation_date` - Additional graduation date

### Certifications (Array)
- `certifications: [{ name, organization, issued_date, expires_date, credential_url }]`

### Documents (File URLs)
- `passport_url` - Passport document
- `government_id_url` - Government ID document
- `visa_url` - Visa document
- `work_authorization_url` - Work authorization document

### Job Preferences
- `desired_experience` - Desired role/experience level
- `industry_preference` - Preferred industries
- `shift_preference` - Preferred work shift

---

## 2. BACKEND MODELS

### New Django Models Created

#### WorkExperience Model
```python
class WorkExperience(models.Model):
    JOB_TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('freelance', 'Freelance'),
        ('c2c', 'C2C'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='experiences')
    job_title = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    company_address = models.CharField(max_length=511, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)  # null = currently employed
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='full_time')
    responsibilities = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### Certification Model
```python
class Certification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='certifications_data')
    name = models.CharField(max_length=255)
    organization = models.CharField(max_length=255)
    issued_date = models.DateField()
    expires_date = models.DateField(blank=True, null=True)
    credential_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### ClientIntake Model (Enhanced)
The existing `ClientIntake.data` JSONField now stores all intake data including:
- All personal details
- Education information
- Skills (split fields)
- Job preferences
- Document URLs
- Array data (experiences, certifications)

---

## 3. API ENDPOINTS

### Get Intake Form
**Endpoint:** `GET /candidates/{candidate_id}/intake/`  
**Permission:** `IsApproved`  
**Response:** Returns existing ClientIntake or initializes with prefilled data

**Response Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "candidate": "550e8400-e29b-41d4-a716-446655440001",
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "primary_skills": "Python, React, AWS",
    "experiences": [],
    "certifications": []
  },
  "is_locked": false,
  "experiences": [],
  "certifications": [],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Submit Intake Form
**Endpoint:** `POST /candidates/{candidate_id}/intake/`  
**Permission:** `IsApproved`  
**Method:** POST

**Request Payload:**
```json
{
  "data": {
    // All fields from form
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "01-15-1990",
    "phone_number": "+1 4155552671",
    "email": "john@example.com",
    "current_address": "123 Main St",
    "mailing_address": "456 Oak Ave",
    "city": "San Francisco",
    "state": "CA",
    "country": "United States",
    "zip_code": "94105",
    "first_entry_us": "01-01-2020",
    "total_years_us": "4",
    
    // Education
    "highest_degree": "Bachelors",
    "highest_field_of_study": "Computer Science",
    "highest_university": "UC Berkeley",
    "highest_country": "United States",
    "highest_graduation_date": "05-15-2019",
    "bachelors_degree": "Bachelors",
    "bachelors_field_of_study": "Computer Science",
    "bachelors_university": "UC Berkeley",
    "bachelors_country": "United States",
    "bachelors_graduation_date": "05-15-2019",

    // Skills
    "primary_skills": "Python, JavaScript, React, AWS, Docker",
    "currently_learning": "Kubernetes, GraphQL",
    "experienced_tools": "Git, Github, VS Code, Jira, Figma",
    "learning_tools": "Terraform, Jenkins",
    "non_technical_skills": "Leadership, Team Communication, Project Management",

    // Work Experience Array
    "experiences": [
      {
        "job_title": "Senior Software Engineer",
        "company_name": "Tech Company Inc",
        "company_address": "123 Tech Blvd, San Jose, CA",
        "start_date": "01-15-2021",
        "end_date": null,  // null = currently employed
        "job_type": "full_time",
        "responsibilities": "Led backend development team. Architected microservices. Mentored junior developers."
      },
      {
        "job_title": "Software Engineer",
        "company_name": "StartUp Corp",
        "company_address": "456 Innovation Dr, Palo Alto, CA",
        "start_date": "06-01-2019",
        "end_date": "01-10-2021",
        "job_type": "full_time",
        "responsibilities": "Built REST APIs. Implemented database migrations. Wrote unit tests."
      }
    ],

    // Certifications Array
    "certifications": [
      {
        "name": "AWS Certified Solutions Architect",
        "organization": "Amazon Web Services",
        "issued_date": "03-15-2022",
        "expires_date": "03-15-2025",
        "credential_url": "https://aws.amazon.com/verification/..."
      },
      {
        "name": "Certified Kubernetes Administrator",
        "organization": "Linux Foundation",
        "issued_date": "08-20-2022",
        "expires_date": null,
        "credential_url": "https://www.cncf.io/..."
      }
    ],

    // Work Authorization
    "visa_type": "H1B",
    "visa_expiry_date": "10-15-2025",
    "work_authorization_status": "Authorized",
    "sponsorship_required": false,

    // Job Preferences
    "desired_experience": "Looking for a role focused on backend development with team leadership opportunities",
    "industry_preference": "FinTech, Financial Services",
    "shift_preference": "Morning (9 AM - 5 PM)",
    "target_roles": "Senior Software Engineer, Tech Lead",
    "preferred_locations": "San Francisco, Remote",
    "remote_preference": "Hybrid",
    "salary_expectation": "120000",
    "preferred_employment_type": "Full-time",
    "relocation_preference": false,

    // Professional Background
    "years_of_experience": "5",
    "current_job_title": "Senior Software Engineer",
    "recent_employer": "Tech Company Inc",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "github_url": "https://github.com/johndoe",
    "portfolio_url": "https://johndoe.dev",
    "resume_url": "https://cdn.example.com/resumes/john-doe-resume.pdf",

    // Documents
    "passport_url": "https://cdn.example.com/documents/passport.pdf",
    "government_id_url": "https://cdn.example.com/documents/dl.pdf",
    "visa_url": "https://cdn.example.com/documents/visa.pdf",
    "work_authorization_url": "https://cdn.example.com/documents/i765.pdf",

    // Additional
    "ready_to_start_date": "02-01-2024",
    "additional_notes": "Available for interviews starting immediately. Open to relocation for right opportunity."
  }
}
```

### Alternative: Flat Submission Format
You can also submit without the `data` wrapper:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  ...
  "experiences": [...],
  "certifications": [...]
}
```

### Response (Success)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "candidate": "550e8400-e29b-41d4-a716-446655440001",
  "data": { /* all submitted data */ },
  "is_locked": true,
  "submitted_at": "2024-01-20T15:30:00Z",
  "experiences": [ /* WorkExperience objects */ ],
  "certifications": [ /* Certification objects */ ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:30:00Z"
}
```

### Error Response (Validation Failed)
```json
{
  "error": "Validation failed",
  "validation_errors": {
    "first_name": "First Name is required",
    "phone_number": "Invalid phone number format",
    "highest_degree": "Highest Degree is required",
    "visa_type": "Visa Type is required"
  }
}
```

---

## 4. VALIDATION RULES

### Required Fields
- First Name, Last Name
- Date of Birth
- Phone Number
- Current Address, City, State, Country, Zip Code
- Highest Degree, Field of Study, University, Graduation Date
- Work Authorization Status, Visa Type
- Years of Experience
- Primary Skills
- Desired Experience
- LinkedIn URL
- Resume URL

### Format Validations
- **Date Format:** MM-DD-YYYY for all date fields
- **Phone Format:** 10 digits minimum (country code removed)
- **URL Validation:** Valid HTTP/HTTPS URLs for all URL fields
- **File Size:** Max 10MB for document uploads
- **File Types:** PDF, DOCX, JPG, JPEG, PNG for documents

### Business Logic
- Work end_date can be null (indicates currently employed)
- Certification expires_date can be null (no expiration)
- Sponsorship required must be boolean (true/false)
- Relocation preference must be boolean (true/false)
- Arrays (experiences, certifications) are automatically parsed and stored in separate models

---

## 5. FILE UPLOAD HANDLING

### Document Upload Endpoint
**Endpoint:** `POST /candidates/upload/`  
**Permission:** `IsApproved`

The React component uses the existing `filesApi.upload()` which handles:
- File validation (size, type)
- Upload to cloud storage (configured endpoint)
- URL generation for document fields

**Supported Document Types:**
- `resume_url` - PDF, DOCX
- `passport_url` - PDF, DOCX, JPG, PNG
- `government_id_url` - PDF, DOCX, JPG, PNG
- `visa_url` - PDF, DOCX, JPG, PNG
- `work_authorization_url` - PDF, DOCX, JPG, PNG

---

## 6. DATABASE MIGRATION

Run migrations to create new tables:
```bash
python manage.py migrate candidates
```

This creates:
- `work_experiences` table - stores work experience records
- `certifications` table - stores certification records

---

## 7. SERIALIZERS

### WorkExperienceSerializer
```python
class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = ['id', 'job_title', 'company_name', 'company_address', 
                  'start_date', 'end_date', 'job_type', 'responsibilities']
```

### CertificationSerializer
```python
class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'name', 'organization', 'issued_date', 
                  'expires_date', 'credential_url']
```

### Enhanced ClientIntakeSerializer
Returns both the JSON data AND the related WorkExperience and Certification objects:
```python
class ClientIntakeSerializer(serializers.ModelSerializer):
    experiences = serializers.SerializerMethodField()
    certifications = serializers.SerializerMethodField()

    class Meta:
        model = ClientIntake
        fields = '__all__'
        read_only_fields = ['id', 'candidate', 'created_at', 'updated_at']
```

---

## 8. ADMIN INTERFACE

Add the new models to Django admin:

```python
# admin.py
from django.contrib import admin
from .models import WorkExperience, Certification, ClientIntake

@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    list_display = ['job_title', 'company_name', 'start_date', 'end_date', 'candidate']
    list_filter = ['job_type', 'start_date']
    search_fields = ['job_title', 'company_name', 'candidate__user__email']

@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'issued_date', 'expires_date', 'candidate']
    list_filter = ['organization', 'issued_date']
    search_fields = ['name', 'candidate__user__email']

@admin.register(ClientIntake)
class ClientIntakeAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'is_locked', 'submitted_at', 'created_at']
    list_filter = ['is_locked', 'submitted_at']
    search_fields = ['candidate__user__email']
    readonly_fields = ['data', 'experiences', 'certifications']
    
    def experiences(self, obj):
        return obj.candidate.experiences.count()
    
    def certifications(self, obj):
        return obj.candidate.certifications_data.count()
```

---

## 9. FRONTEND INTEGRATION

The React component `CandidateIntakePage.tsx` includes:

### Dynamic Array Management
- Add/remove work experiences with `+` and `-` buttons
- Add/remove certifications with `+` and `-` buttons
- Inline editing for all array fields

### File Upload UI
- Drag-and-drop or click-to-upload for documents
- Visual feedback (green checkmark when uploaded)
- File size validation (10MB max)
- File type validation

### Conditional Rendering
- "Other" field for visa type when selected
- Document upload sections
- Experience/certification items dynamically shown

### Form Locking
- When form is locked (submitted), all fields disabled
- "SUBMITTED & LOCKED" badge shown in header
- Admin can reopen with API call

---

## 10. BACKWARD COMPATIBILITY

**Existing Data:** The upgrade maintains backward compatibility:
- Old `ClientIntake.data` records are preserved
- Existing fields continue to work
- New fields are optional until form is resubmitted
- Migration is non-destructive

**Data Migration (Optional):**
If needed to migrate old data to new models:
```python
# management/commands/migrate_intake_data.py
from django.core.management.base import BaseCommand
from candidates.models import ClientIntake, WorkExperience

class Command(BaseCommand):
    def handle(self, *args, **options):
        for intake in ClientIntake.objects.all():
            if intake.data and intake.data.get('experiences'):
                for exp in intake.data['experiences']:
                    WorkExperience.objects.get_or_create(
                        candidate=intake.candidate,
                        job_title=exp.get('job_title'),
                        defaults={...}
                    )
```

---

## 11. TESTING

### Test Cases

**Unit Tests:**
```python
def test_intake_validation():
    # Test required fields validation
    data = {"first_name": ""}
    errors = validate_intake_data(data)
    assert "first_name" in errors

def test_work_experience_array():
    # Test array processing
    candidate = Candidate.objects.create(...)
    data = {
        "experiences": [
            {"job_title": "Engineer", "company_name": "ACME", ...}
        ]
    }
    # Submit and verify WorkExperience created
```

**Integration Tests:**
```python
def test_intake_submission_flow():
    # Test complete flow: GET -> POST -> Lock
    1. GET /intake - verify initial data
    2. POST /intake - submit with all fields
    3. Verify is_locked=true
    4. Verify WorkExperience records created
    5. Verify Certification records created
```

---

## 12. DEPLOYMENT CHECKLIST

- [ ] Run migrations: `python manage.py migrate`
- [ ] Update admin.py with new models
- [ ] Replace CandidateIntakePage.tsx with new version
- [ ] Clear old cache/sessions if needed
- [ ] Test intake submission end-to-end
- [ ] Verify file uploads work
- [ ] Test array add/remove operations
- [ ] Verify validation errors display correctly
- [ ] Test form locking/unlocking
- [ ] Backup database before deployment

---

## 13. ADMIN OPERATIONS

### Reopen Locked Intake
**Endpoint:** `POST /candidates/{candidate_id}/intake/reopen/`  
**Permission:** `IsAdmin`

The intake form becomes editable again for the candidate to make changes.

### View Intake Details
Access via Django admin or API to see:
- All submitted data (JSON)
- Related WorkExperience records
- Related Certification records
- Lock status and submission timestamp

---

## 14. TROUBLESHOOTING

### Issue: Validation errors on submit
**Solution:** Check all required fields are filled. See "Validation Rules" section.

### Issue: File upload fails
**Solution:** Verify file size < 10MB and type is allowed (PDF, DOCX, images).

### Issue: Array items not saved
**Solution:** Ensure items have at least job_title+company_name (for experiences) or name+organization (for certifications).

### Issue: Locked form can't be edited
**Solution:** Admin must use `/intake/reopen/` endpoint. Then candidate can edit and resubmit.

---

## 15. FUTURE ENHANCEMENTS

- Multi-language support
- Bulk upload of experiences (CSV/Excel)
- Custom field definitions per admin
- Email notifications on submission
- PDF export of completed intake
- Version history/audit trail
- Admin notes/comments on intake records

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| Django Models | Added WorkExperience, Certification | Support arrays, better data structure |
| Serializers | Added WE/Cert serializers | Full API representation |
| Views | Enhanced validation | Catches invalid data early |
| React Form | Complete redesign | 10+ new sections, arrays, file uploads |
| Database | 2 new tables | Normalized work history & certifications |
| API | Same endpoints | Enhanced validation & data |

---

**Version:** 2.0 (Enhanced)  
**Last Updated:** January 2024  
**Status:** Production Ready
