# HYRIND Django Backend

## Quick Start

```bash
cd django_backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env
# Edit .env with your MySQL, MinIO, and Resend credentials

# Create MySQL database
mysql -u root -e "CREATE DATABASE hyrind_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
python manage.py makemigrations users candidates recruiters billing audit notifications files
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Run server
python manage.py runserver
```

## Docker

```bash
docker build -t hyrind-backend .
docker run -p 8000:8000 --env-file .env hyrind-backend
```

## API Endpoints

### Auth
- `POST /api/auth/register/` — Register candidate/recruiter
- `POST /api/auth/login/` — Login (returns JWT)
- `POST /api/auth/logout/` — Logout
- `POST /api/auth/refresh/` — Refresh token
- `GET /api/auth/me/` — Current user
- `PATCH /api/auth/profile/` — Update profile
- `GET /api/auth/pending-approvals/` — Admin: pending users
- `POST /api/auth/approve-user/` — Admin: approve/reject

### Candidates
- `GET /api/candidates/` — List candidates
- `GET /api/candidates/{id}/` — Detail
- `POST /api/candidates/{id}/status/` — Update status
- `GET|POST /api/candidates/{id}/intake/` — Intake form
- `GET /api/candidates/{id}/roles/` — Role suggestions
- `POST /api/candidates/{id}/roles/add/` — Add role
- `POST /api/candidates/{id}/roles/confirm/` — Confirm roles
- `GET /api/candidates/{id}/credentials/` — Credential versions
- `POST /api/candidates/{id}/credentials/upsert/` — Save credential
- `GET|POST /api/candidates/{id}/referrals/` — Referrals
- `GET|POST /api/candidates/{id}/interviews/` — Interviews
- `GET|POST /api/candidates/{id}/placement/` — Placement closure

### Recruiters
- `GET /api/recruiters/my-candidates/` — Assigned candidates
- `POST /api/recruiters/assign/` — Assign recruiter
- `POST /api/recruiters/unassign/{id}/` — Unassign
- `GET /api/recruiters/{candidateId}/assignments/` — Assignments
- `GET|POST /api/recruiters/{candidateId}/daily-logs/` — Daily logs
- `POST /api/recruiters/jobs/{jobId}/status/` — Update job status

### Billing
- `GET /api/billing/{candidateId}/subscription/` — Subscription
- `POST /api/billing/{candidateId}/subscription/create/` — Create
- `PATCH /api/billing/{candidateId}/subscription/update/` — Update
- `GET /api/billing/{candidateId}/payments/` — Payments
- `POST /api/billing/{candidateId}/payments/record/` — Record payment
- `GET /api/billing/{candidateId}/invoices/` — Invoices

### Audit
- `GET /api/audit/` — Global audit logs
- `GET /api/audit/{candidateId}/` — Candidate audit logs

### Notifications
- `GET /api/notifications/` — My notifications
- `POST /api/notifications/{id}/read/` — Mark read

### Files
- `POST /api/files/upload/` — Upload file
- `GET /api/files/{fileId}/download/` — Get download URL

## Frontend Configuration

Set `VITE_API_URL` in your frontend `.env`:
```
VITE_API_URL=http://localhost:8000/api
```

For production:
```
VITE_API_URL=https://your-backend-domain.com/api
```

testing  