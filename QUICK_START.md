# Quick Start Guide - Enhanced Client Intake

## For Developers: What You Need to Know

### 🎯 The Big Picture
The Candidate Intake Form is now a comprehensive professional intake sheet. It collects 40+ fields across 10 organized sections instead of the previous ~25 fields.

**Key addition:** Support for arrays (multiple work experiences, multiple certifications)

---

## 🔥 Quick Reference

### New Stuff You Should Know

**1. WorkExperience Model** - Stores individual job records
```python
from candidates.models import WorkExperience

# Get all experiences for a candidate
WorkExperience.objects.filter(candidate=candidate)

# Create one
WorkExperience.objects.create(
    candidate=candidate,
    job_title="Engineer",
    company_name="ACME",
    start_date="2023-01-15",
    end_date=None  # None = currently employed
)
```

**2. Certification Model** - Stores individual certifications
```python
from candidates.models import Certification

# Get all certifications
Certification.objects.filter(candidate=candidate)

# Create one
Certification.objects.create(
    candidate=candidate,
    name="AWS Architect",
    organization="AWS",
    issued_date="2022-06-15",
    expires_date="2025-06-15"  # Can be None
)
```

**3. ClientIntake.data JSON** - Still stores everything
```python
intake = ClientIntake.objects.get(candidate=candidate)

# Access anything from the form
print(intake.data['first_name'])
print(intake.data['primary_skills'])
print(intake.data['experiences'])  # Array
print(intake.data['certifications'])  # Array
```

**4. Enhanced Validation**
```python
from candidates.views import validate_intake_data

errors = validate_intake_data(form_data)
if errors:
    return Response({'validation_errors': errors}, status=400)
```

---

## 🚀 Deployment Quick Guide

### Step 1: Database
```bash
cd django_backend
python manage.py migrate candidates
```

### Step 2: Verify
```bash
python manage.py dbshell
SELECT * FROM work_experiences LIMIT 1;  # Should work
SELECT * FROM certifications LIMIT 1;     # Should work
```

### Step 3: Test Submission
```bash
# POST to /candidates/{id}/intake/ with all required fields
# Should get validation_errors if fields missing
# Should create WorkExperience + Certification records if successful
```

### Step 4: Monitor
```bash
# Check admin panel for new records
# Check logs for 500 errors
# Test form lock/reopen
```

---

## 📋 Required Fields (18)

```python
REQUIRED_FIELDS = [
    'first_name',
    'last_name', 
    'date_of_birth',
    'phone_number',
    'current_address', 'city', 'state', 'country', 'zip_code',
    'highest_degree',
    'highest_field_of_study',
    'highest_university',
    'highest_graduation_date',
    'primary_skills',
    'visa_type',
    'work_authorization_status',
    'years_of_experience',
    'linkedin_url',
    'resume_url',
    'desired_experience',
    'industry_preference',
    'shift_preference'
]
```

---

## 🔍 Common Operations

### Get intake data
```python
intake_data = ClientIntakeSerializer(intake).data
# Returns: data + experiences[] + certifications[]
```

### Query experiences
```python
recent_jobs = candidate.experiences.filter(
    start_date__gte='2020-01-01'
).order_by('-start_date')
```

### Query certifications
```python
active_certs = candidate.certifications_data.filter(
    expires_date__gte=date.today()
)
```

### Admin reopen form
```python
intake = ClientIntake.objects.get(candidate=candidate)
intake.is_locked = False
intake.save()
```

---

## 📱 Frontend Changes

### Form has 10 sections now:
1. Personal Details
2. Education
3. Skills (5 separate fields)
4. Work Experience (array)
5. Certifications (array)
6. Work Authorization
7. Professional Background
8. Job Preferences
9. Documents (4 file uploads)
10. Additional Info

### Key UI features:
- Add/Remove buttons for arrays
- Drag-and-drop file upload
- Visual section headers
- Form locking display
- Inline error messages

---

## 🧪 Testing Examples

### Test form submission
```bash
curl -X POST http://localhost:8000/candidates/{id}/intake/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "01-15-1990",
    "phone_number": "4155551234",
    "email": "john@example.com",
    "current_address": "123 Main St",
    "city": "SF",
    "state": "CA",
    "country": "USA",
    "zip_code": "94105",
    "highest_degree": "Bachelors",
    "highest_field_of_study": "CS",
    "highest_university": "UC Berkeley",
    "highest_graduation_date": "05-15-2015",
    "primary_skills": "Python, JS",
    "visa_type": "H1B",
    "work_authorization_status": "Authorized",
    "years_of_experience": "5",
    "linkedin_url": "https://linkedin.com/in/john",
    "resume_url": "https://example.com/resume.pdf",
    "desired_experience": "Senior role",
    "industry_preference": "Tech",
    "shift_preference": "Morning",
    "experiences": [
      {
        "job_title": "Engineer",
        "company_name": "ACME",
        "start_date": "2020-01-15",
        "end_date": null,
        "job_type": "full_time",
        "responsibilities": "Development"
      }
    ],
    "certifications": []
  }'
```

---

## 🐞 Debug Tips

### Check if form submitted correctly
```python
intake = ClientIntake.objects.get(candidate=candidate)
print(f"Locked: {intake.is_locked}")
print(f"Experiences: {intake.candidate.experiences.count()}")
print(f"Certifications: {intake.candidate.certifications_data.count()}")
```

### Check validation errors
```python
# Look at API response when POST fails
errors = response.json()['validation_errors']
for field, msg in errors.items():
    print(f"{field}: {msg}")
```

### Check file uploads
```python
# Verify document URLs are valid
if intake.data.get('resume_url'):
    print(f"Resume: {intake.data['resume_url']}")
```

---

## 📊 Database Queries

### Get all candidates with experiences
```python
from django.db.models import Count

candidates_with_exp = Candidate.objects.annotate(
    exp_count=Count('experiences')
).filter(exp_count__gt=0)
```

### Get candidates by years of experience
```python
completed = ClientIntake.objects.filter(
    is_locked=True
).select_related('candidate')
```

### Export to CSV
```python
import csv

with open('export.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['Name', 'Skills', 'Experience Count'])
    for intake in ClientIntake.objects.filter(is_locked=True):
        exp_count = intake.candidate.experiences.count()
        writer.writerow([
            intake.data.get('first_name'),
            intake.data.get('primary_skills'),
            exp_count
        ])
```

---

## 🎯 Most Important Changes

1. **Two new database tables** - work_experiences, certifications
2. **Validation function** - validate_intake_data() checks 18 required fields
3. **Array processing** - Automatically creates records from JSON arrays
4. **Enhanced serializer** - Returns related objects in response
5. **Better error messages** - Validation errors list all problems

---

## ⚡ Performance Tips

- Use `select_related('candidate__user')` for intake queries
- Use `prefetch_related('experiences')` for batch operations
- Index on `candidate_id` and date fields (auto-created by migration)
- Cache intake data if needed, expire on reopen
- Consider pagination if many experiences/certifications

---

## 🔐 Security Notes

- Validate all file uploads (size, type)
- Sanitize URLs before storing
- Validate dates (no future dates for past roles)
- Log all reopen operations (admin)
- Verify user owns the intake before submission

---

## 📞 Quick Links

- Full Guide: ENHANCED_INTAKE_GUIDE.md
- API Reference: API_REFERENCE.md  
- Complete Summary: UPGRADE_COMPLETE.md

---

**Get Started:**
1. Read this file (2 min)
2. Run migration (1 min)
3. Test form submission (5 min)
4. Check database (2 min)
5. Deploy (5 min)

**Total: ~15 minutes to understand and deploy**

---

Version: 2.0  
Status: Production Ready  
Last Updated: January 2024
