# Hyrind Codebase Master Reference (Skill File)

This file (`skill.md`) is designed to serve as a comprehensive contextual memory for the Hyrind application. It consolidates the high-level architecture, low-level schemas, UI/UX patterns, and directory structures to allow developers or AI assistants to quickly understand the entire system for future development.

## 1. Project Overview & Tech Stack

Hyrind is a recruitment platform connecting Candidates, Recruiters, and Administrators.

**Tech Stack:**
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI (`src/components/ui`)
- **Backend:** Django (Python), Django REST Framework (DRF)
- **Database:** Relational Database (SQLite local / PostgreSQL prod)
- **Communication:** REST APIs returning JSON with Bearer token (JWT) authentication.

---

## 2. Directory Structure map

### `src/` (Frontend React Application)
- **`App.tsx` & `main.tsx`**: Entry points and global routing.
- **`components/`**:
  - `ui/`: Shared Shadcn UI components (DataTable, Buttons, Cards, Inputs).
  - `admin/`, `recruiter/`, `candidate/`: Role-specific subcomponents (e.g., Tabs, Dashboards).
- **`pages/`**: The core routing layer, strictly isolated by user role.
  - `admin/`: `AdminActivityPage`, `AdminCandidateDetail`, `AdminJobsPage`, etc.
  - `recruiter/`: `RecruiterDashboard`, `RecruiterCandidateDetail`, `DailyLogPage`.
  - `candidate/`: `CandidateIntakePage`, `CandidateCredentialsPage`, `CandidateApplicationsPage`.
  - `auth/`: Login, Registration, Password Reset.
- **`services/`**:
  - `api.ts`: Centralized Axios client containing all `api.get` and `api.post` definitions grouped by domain (e.g., `candidatesApi`, `recruitersApi`, `authApi`, `billingApi`).

### `django_backend/` (Backend Django Application)
- **`users/`**: Core authentication, `User` model, role definition, and `Profile`. Manages the branded ID generation (e.g., `HYRCDT00001`, `HYRREC00002`).
- **`candidates/`**: Candidate model, `ClientIntake` (JSON-based dynamic forms), `WorkExperience`, `Certification`, `RoleSuggestion`.
- **`recruiters/`**: Recruiter profiles, assignments, daily logs, and job application tracking.
- **`jobs/`**: `JobOpening` and `CandidateSubmission` tracking.
- **`billing/`**: Subscriptions, addons, invoices, and payments management.
- **`audit/`**: System-wide logging for activities (global and candidate-specific).

---

## 3. Database Schema & Key Models

The schema uses a highly decoupled structure bound together by the central `User` object. All primary keys are `UUIDs`.

- **User**: Contains login logic, roles (`admin`, `candidate`, `recruiter`), and `seq_number` for ID generation.
- **Candidate (OneToOne → User)**: Core candidate state (`status`, `opt_end_date`, `visa_status`).
  - *Key Statuses*: `lead`, `intake_submitted`, `roles_published`, `active_marketing`, `placed_closed`.
- **ClientIntake (OneToOne → Candidate)**: Stores candidate onboarding forms dynamically via `JSONField`. Can be locked/reopened.
- **RoleSuggestion**: Proposed roles pushed to candidates for approval. Candidates can also propose custom roles.
- **CandidateSubmission**: Relates `Candidate` to a `JobOpening`, tracking application pipeline status (`submitted`, `interviewing`, `offered`).

---

## 4. Architectural Patterns & Rules

### 4.1 Frontend Data Fetching (`api.ts` pattern)
- React components do not use raw `fetch` or direct `axios.get`. They call dictionaries exported from `src/services/api.ts` (e.g., `candidatesApi.detail(candidateId)`).
- `api.ts` features robust Axios interceptors that:
  1. Auto-inject the JWT Bearer token.
  2. Handle automatic `refresh_token` cycling on 401s.
  3. Route users to `/404` or `/500` pages dynamically.

### 4.2 UI Design System
- **Aesthetics First:** Hyrind emphasizes premium, modern styling. Use `Card` layouts, `StatusBadge` components, `lucide-react` icons, and `Tailwind` utilities.
- **Data Tables:** Uses a unified `<DataTable>` component (`src/components/ui/DataTable.tsx`). 
  - Standard page size is **5**.
  - Always implement pagination and search.

### 4.3 Backend API Design
- **RESTful ViewSets:** Django serves APIs via DRF `ModelViewSet` and `@api_view` decorators.
- **Permissions:** Endpoint access is strictly enforced by role-based checks.
- **Extensibility via JSON:** Forms that change frequently (Intake, Credentials) utilize `JSONField` in Django to prevent database migrations for every new form field.

---

## 5. Core Workflows to Remember

### 1. The Intake Flow
`Candidate (Lead)` → Admin pushes to `Pending Intake` → Candidate fills `CandidateIntakePage` → Data stored in `ClientIntake` JSON → Status updates to `Intake Submitted` → Form locks. Admin can reopen via `candidatesApi.reopenIntake`.

### 2. The Role Confirmation Workflow
Admin reviews intake → Uses `candidatesApi.addRole` to suggest titles → Admin "Publishes" roles → Candidate logs in and Accepts/Declines/Proposes custom roles → Status updates to `roles_confirmed`.

### 3. Recruiter Pipeline Workflow
Candidate enters `active_marketing` → Admin assigns Recruiter → Recruiter uses `RecruiterDashboard` to track `CandidateSubmission` (Jobs) and `DailyLog` entries.

---

## 6. How to use this file
When starting a new task, refer back to this file to remember:
1. Which directory houses the UI components (`src/pages/<role>`).
2. Where to add new API calls (`src/services/api.ts`).
3. Where the backend logic resides (`django_backend/<app>/models.py` & `views.py`).
