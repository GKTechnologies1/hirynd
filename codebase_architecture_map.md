# Hyrind Codebase Architecture & Dependency Map

This document provides a structural overview of the Hyrind application, documenting the interdependencies between the frontend UI layers, the API integration services, and the backend Django modules. This map serves as a guide for future development, refactoring, and maintaining architectural consistency across the application.

## 1. System High-Level Architecture

The platform operates on a decoupled architecture where the React frontend communicates via a centralized API service (`api.ts`) to the Django REST framework backend.

```mermaid
flowchart TB
    %% High Level Architecture
    subgraph Frontend [Frontend (React + Vite + Tailwind)]
        UI[User Interface Components]
        Pages[Page Routing Layer]
        APIClient[API Service `api.ts`]
        
        UI --> Pages
        Pages --> APIClient
    end

    subgraph Backend [Backend (Django + DRF)]
        Router[URL Routers]
        Views[Views / ViewSets]
        Models[Django Models]
        DB[(SQLite Database)]
        
        Router --> Views
        Views --> Models
        Models --> DB
    end
    
    APIClient <-->|REST / JSON| Router
```

## 2. Frontend Application Flow

The React frontend is divided into three primary functional domains (Admin, Recruiter, and Candidate) with shared UI and layout components. Navigation is handled primarily at the root, directing to domain-specific dashboards.

```mermaid
flowchart TD
    %% Frontend Entry
    Root[App.tsx / main.tsx]
    
    %% Layouts & Auth
    Root --> Auth[Authentication Pages]
    Root --> AppLayout[Application Layouts]
    
    subgraph AuthPages [Auth & Public]
        Login(AdminLogin, RecruiterLogin, CandidateLogin)
        PassReset(ForgotPassword, ResetPassword)
        PublicPages(Index, About, Services)
    end
    
    Auth --> AuthPages
    
    %% Core Dashboards
    AppLayout --> DashAdmin[Admin Dashboard]
    AppLayout --> DashRecruiter[Recruiter Dashboard]
    AppLayout --> DashCandidate[Candidate Dashboard]
    
    subgraph AdminModule [Admin Module `src/pages/admin`]
        AdminPages[Activity, Candidates, Recruiters, Jobs, Billing, Approvals]
        AdminComponents[Assignments, Audit, QAChecklist, GlobalAudit]
        AdminPages --- AdminComponents
    end
    
    subgraph RecruiterModule [Recruiter Module `src/pages/recruiter`]
        RecruiterPages[Profile, AssignedTo, CandidateDetail, DailyLog]
        RecruiterComponents[InterviewsTab, ChatTab]
        RecruiterPages --- RecruiterComponents
    end
    
    subgraph CandidateModule [Candidate Module `src/pages/candidate`]
        CandidatePages[Intake, Applications, Interviews, Credentials, Billing]
    end
    
    DashAdmin --> AdminModule
    DashRecruiter --> RecruiterModule
    DashCandidate --> CandidateModule
    
    %% Shared Resources
    SharedUI[Shared UI Components `src/components/ui`]
    AdminModule -.-> SharedUI
    RecruiterModule -.-> SharedUI
    CandidateModule -.-> SharedUI
```

## 3. Backend Django App Interdependencies

The Django backend is modularized into feature-specific apps. The `users` app serves as the core foundation, extending Django's built-in User model and providing authentication for candidates, recruiters, and admins.

```mermaid
flowchart TD
    %% Backend Modules
    Core[users]
    
    subgraph Domain [Domain Models]
        Cands[candidates]
        Recs[recruiters]
        Jobs[jobs]
    end
    
    subgraph Features [Feature Modules]
        Bill[billing]
        Notif[notifications]
        Chat[chat]
        Audit[audit]
    end
    
    %% Dependencies
    Core --> Domain
    
    Cands --> Jobs
    Recs --> Jobs
    
    Domain --> Features
    Core --> Features
    
    %% Detailed Relationships
    Cands -.->|Tracks pipeline| Recs
    Recs -.->|Submits daily logs| Audit
    Jobs -.->|Application records| Audit
    Bill -.->|Invoices / Payments| Cands
```

## 4. Feature Vertical Slice (Example: Data Table Pagination & Tracking)

When a user interacts with a feature (like viewing a candidate's details or paginated data), the execution path flows predictably through the layers.

```mermaid
sequenceDiagram
    autonumber
    actor User
    
    box Frontend
    participant Page as React Page (e.g. RecruiterCandidateDetail)
    participant Component as Shared UI (DataTable)
    participant API as api.ts
    end
    
    box Backend
    participant View as Django ViewSet (e.g. Candidates API)
    participant DB as Database
    end
    
    User->>Page: Navigates to Table
    Page->>API: Calls fetch method (page, limit)
    API->>View: GET /api/.../?page=1&limit=5
    View->>DB: Query with offset/limit
    DB-->>View: Returns QuerySet
    View-->>API: Returns JSON (results, count)
    API-->>Page: Resolves Promise
    Page->>Component: Passes state (data, totalPages)
    Component-->>User: Renders Data Rows
```

## Summary of Architectural Patterns

1. **Centralized API Management:** All API requests on the frontend are routed through `src/services/api.ts`. This file handles token injection, error handling, and endpoint resolution.
2. **Domain-Driven Directory Structure:** The frontend pages are strictly segregated by role (`admin/`, `recruiter/`, `candidate/`) which maps cleanly to the expected user experience and permissions model.
3. **Reusable Data Components:** UI components (like tables, paginations, modals) are abstracted into `src/components/ui` to be consumed by the specific page modules, maintaining consistent aesthetics and behavior (e.g., standard page size of 5 for DataTables).
4. **Backend Modularity:** Distinct Django apps (`audit`, `billing`, `chat`, etc.) keep database models and business logic isolated, allowing for targeted updates without system-wide regressions.
