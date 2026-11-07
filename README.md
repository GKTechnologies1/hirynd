# Hyrind – Intelligent Recruitment, Job Scraping & Visa Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0.3-green.svg)](https://www.djangoproject.com/)
[![FastAPI/DRF](https://img.shields.io/badge/API-Django_REST_Framework-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/Frontend-React_18_TypeScript-cyan.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS_Shadcn-purple.svg)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL_8.0-orange.svg)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/Tests-18_Passing-brightgreen.svg)]()

Hyrind is an enterprise recruitment and talent placement platform designed for high-velocity candidate marketing, automated job discovery, government visa intelligence verification, and recruiter workflow acceleration.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Core Platform Modules](#2-core-platform-modules)
3. [Intelligent Job Discovery & Scraping Engine](#3-intelligent-job-discovery--scraping-engine)
4. [Government Visa Intelligence & Ingestion](#4-government-visa-intelligence--ingestion)
5. [5-Factor Visa Scoring Model & Multi-Pass Matcher](#5-5-factor-visa-scoring-model--multi-pass-matcher)
6. [Dual Job Discovery Dashboards (Global vs Recruiter)](#6-dual-job-discovery-dashboards)
7. [Admin Scraper Control Panel (Mode A vs Mode B)](#7-admin-scraper-control-panel)
8. [Automated Daily Scheduler](#8-automated-daily-scheduler)
9. [CLI & Management Commands](#9-cli--management-commands)
10. [REST API Reference](#10-rest-api-reference)
11. [Environment & Configuration Guide](#11-environment--configuration-guide)
12. [Testing, QA & Validation](#12-testing-qa--validation)
13. [Production Operations & Runbook](#13-production-operations--runbook)

---

## 1. Architecture Overview

Hyrind uses a decoupled modern architecture combining a high-performance Python/Django backend with a reactive TypeScript/React frontend:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HYRIND ARCHITECTURE                             │
│                                                                             │
│  ┌───────────────────────────────┐     ┌─────────────────────────────────┐  │
│  │   Frontend (React + Vite)     │     │    Backend (Django + DRF)       │  │
│  │   • Admin Control Panel       │◄───►│    • Auth & Role Guard          │  │
│  │   • Dashboard A (Global)      │ REST│    • Candidate & Recruiter Core │  │
│  │   • Dashboard B (Recruiter)   │ JSON│    • Job Discovery Engine       │  │
│  │   • Candidate Portal          │     │    • Visa Intelligence Matcher  │  │
│  └───────────────────────────────┘     └────────────────┬────────────────┘  │
│                                                         │                   │
│                                        ┌────────────────┴────────────────┐  │
│                                        ▼                                 │  │
│                           ┌──────────────────────────┐                   │  │
│                           │      MySQL Database      │                   │  │
│                           │  • discovered_jobs       │                   │  │
│                           │  • company_visa_history  │                   │  │
│                           │  • company_aliases       │                   │  │
│                           │  • scraper_executions    │                   │  │
│                           │  • candidates/recruiters │                   │  │
│                           └──────────────────────────┘                   │  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Backend Runtime:** Python 3.12, Django 5.0, Django REST Framework, SimpleJWT.
- **Frontend Runtime:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI / Shadcn primitives.
- **Database:** MySQL 8.0 (`hyrind-stag` on Staging port 6001, `hyrind-prod` on Production port 6000).
- **Web Server:** Nginx reverse proxy serving built assets from `/var/www/hy_staging/` (Staging) or `/var/www/hy_prod/` (Production).

---

## 2. Core Platform Modules

| Module | Description | Primary Models / Endpoints |
| :--- | :--- | :--- |
| **Authentication & RBAC** | Secure JWT authentication with strict roles: `admin`, `recruiter`, `candidate`, `manager`. | `users.User`, `/api/auth/` |
| **Candidate Placement** | Intake pipeline, marketing status tracking, resume storage, rate management, placement tracking. | `candidates.Candidate`, `/api/candidates/` |
| **Recruiter Management** | Recruiter onboarding, active candidate assignment, sub-team hierarchy, daily logs, activity audits. | `recruiters.RecruiterAssignment`, `/api/recruiters/` |
| **Job Openings & Alerts** | Canonical internal job requisitions, candidate submissions, status transitions. | `jobs.JobOpening`, `/api/jobs/` |
| **Job Discovery** | Automated web scraping, multi-source deduplication, company visa tagging, dual-tier dashboards. | `job_discovery.DiscoveredJob`, `/api/admin/job-discovery/` |
| **Visa Intelligence** | Federal immigration filing data repository, company alias resolution, 5-factor scoring engine. | `job_discovery.CompanyVisaHistory`, `/api/admin/job-scraper/companies/` |

---

## 3. Intelligent Job Discovery & Scraping Engine

The Job Discovery module automates the retrieval and persistence of fresh vacancies across major recruitment portals:
- **Supported Portals:** LinkedIn, Indeed, Glassdoor, Dice (via Apify actors).
- **Deduplication:** Computes an MD5/SHA-256 `content_hash` combining normalized company, title, and location. Duplicate listings across boards are flagged (`is_duplicate=True`) and linked to the canonical entry (`canonical_job_id`).
- **Post-Scraping Hook:** Once listings are inserted or updated, the engine **immediately and automatically** triggers the multi-pass Visa Matcher. No manual scoring trigger is ever required.

---

## 4. Government Visa Intelligence & Ingestion

### Quarterly Ingestion Workflow
Visa intelligence is ingested **quarterly** and persisted in the relational database. Daily job scraping reuses this persisted data without re-reading source files.

Source files reside under `data/`:
```
data/
├── uscis-hub/   # USCIS H-1B Employer Data Hub export (.xlsx)
├── lca/         # Department of Labor LCA disclosure files (.xlsx)
├── perm/        # Department of Labor PERM Green Card disclosures (.xlsx)
└── everify/     # Federal E-Verify employer lists (.xlsx / .csv)
```

Running the quarterly refresh:
```bash
python manage.py visa_refresh
```
This command:
1. Ingests all records into `company_visa_history` using fast batch upserts (`INSERT ... ON DUPLICATE KEY UPDATE` in chunks of 2,000).
2. Updates and registers curated aliases in `company_aliases`.
3. Verifies top corporate sponsor credentials (E-Verify, PERM).
4. Automatically rematches and rescores all previously collected jobs.

---

## 5. 5-Factor Visa Scoring Model & Multi-Pass Matcher

### The Scoring Formula
Every company receives a transparent score between 0 and 100 and a letter grade (A–F):

$$\text{Visa Friendly Score} = \min(100, S_{\text{vol}} + S_{\text{rate}} + S_{\text{rec}} + S_{\text{perm}} + S_{\text{everify}})$$

| Component | Condition & Points | Maximum |
| :--- | :--- | :---: |
| **1. Filing Volume ($S_{\text{vol}}$)** | $\ge 100 \implies 40\text{ pts}$; $\ge 25 \implies 30\text{ pts}$; $\ge 5 \implies 20\text{ pts}$; $\ge 1 \implies 10\text{ pts}$ | **40 pts** |
| **2. Approval Rate ($S_{\text{rate}}$)** | $\text{Approvals} / (\text{Approvals} + \text{Denials}) \times 25\text{ pts}$ | **25 pts** |
| **3. Recency ($S_{\text{rec}}$)** | Last FY or Current FY $\implies 15\text{ pts}$; Last 3 FYs $\implies 8\text{ pts}$ | **15 pts** |
| **4. Green Card ($S_{\text{perm}}$)** | Filed PERM Green Card applications $\implies 10\text{ pts}$ | **10 pts** |
| **5. E-Verify ($S_{\text{everify}}$)** | Confirmed enrolled in federal E-Verify $\implies 10\text{ pts}$ | **10 pts** |

- **Grade A ($\ge 85$ pts):** Verified premier sponsors (Google, Apple, Microsoft, Meta, Oracle, TCS, etc.).
- **Grade B ($70 - 84$ pts):** High-volume, high-approval employers.
- **Grade C ($50 - 69$ pts):** Moderate volume sponsors.
- **Grade D ($30 - 49$ pts):** Low filing counts or lower approval ratios.
- **Grade E/F ($< 30$ pts):** Unfavorable denial ratios or inactive filings.

### 4-Pass Precision Company Matcher
Implemented in `job_discovery/matcher/match_jobs_to_visa.py`:
1. **Pass 1 (Curated Aliases):** Resolves posting brand names to legal petitioner entities (e.g., `"Amazon"` $\to$ `"amazoncomservices"`).
2. **Pass 2 (Exact Normalized Name):** Exact match after removing legal suffixes (`Inc`, `LLC`, `Corp`), symbols, and whitespace.
3. **Pass 3 (Fuzzy Match):** Bigram Dice coefficient ($\ge 0.90$) verified with Levenshtein ratio ($\ge 0.85$).
4. **Pass 4 (Multi-Word Prefix Match):** Matches distinctive multi-word brands (e.g., `"Capital One"` $\to$ `"Capital One Services LLC"`).

---

## 6. Dual Job Discovery Dashboards

### Dashboard A: Global View (Admin)
- **URL / Route:** Admin Dashboard $\to$ "Job Discovery" tab (`AdminJobDiscoveryPage.tsx`).
- **Scope:** Displays **ALL** scraped jobs across the entire database.
- **Filters:** Job Role, Company Name, Visa Grade (A/B/C/D/E/F), Minimum Visa Score slider, H1B Sponsor toggle, Location, Source Portal, Date Scraped.
- **Job Details Modal:** Visual breakdown of all 5 scoring factors and direct, safe link to the external application (`target="_blank" rel="noopener noreferrer"`).

### Dashboard B: Recruiter Personalized View (Recruiter)
- **URL / Route:** Recruiter Dashboard $\to$ "Job Discovery" navigation item (`RecruiterJobDiscoveryPage.tsx`).
- **Scope:** **Strictly isolated** at the backend SQL query level to confirmed job roles of candidates actively assigned to the authenticated recruiter.
- **Security:** Accessing an unassigned job ID returns `403 Forbidden` (anti-IDOR guard).
- **Candidate Badges:** Displays matching candidate chips on each job row showing which candidate(s) match that opportunity.

---

## 7. Admin Scraper Control Panel

Accessible via Admin Dashboard $\to$ "Jobs Scraper" tab (`AdminJobScraperPage.tsx`). Supports two explicit execution modes:

```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       MODE A: STANDARD SCRAPING      │  │     MODE B: VISA-FILTERED SCRAPING   │
│                                      │  │                                      │
│ • Unrestricted broad crawl           │  │ • Pre-filters searches to employers │
│ • All companies on job boards        │  │   selected from company_visa_history │
│ • Automatically scored post-scrape   │  │ • Sets Minimum Qualification Score   │
│ • Preserves all collected records    │  │ • Distinguishes qualified vacancies │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

1. **Step 1:** Select target job roles from candidate database or input custom roles with per-role limits.
2. **Step 2:** Select execution mode. In Mode B, search and pick target employers from the Visa Refresh database and set the minimum qualification score threshold (e.g., $\ge 70$).
3. **Step 3:** Select target portals (LinkedIn, Indeed, Glassdoor, Dice) and trigger the crawl.

---

## 8. Automated Daily Scheduler

A resilient background scheduler executes daily:
- **Default Schedule:** Daily at **6:00 PM IST (Asia/Kolkata)** [12:30 PM UTC].
- **Concurrency Protection:** Checks for existing running executions; recovers stale runs older than 3 hours; skips duplicate runs within the same 6-hour window.
- **Role Provider:** Dynamically fetches confirmed roles from active marketing candidates in the database.

### Setting up Cron (Linux VM)
```bash
# Open root crontab
crontab -e

# Add scheduled daily run at 6:00 PM IST (12:30 UTC):
30 12 * * * cd /root/hyrind_backend/hyrind-staging/hirynd/django_backend && DJANGO_SETTINGS_MODULE=hyrind.settings venv/bin/python3 manage.py run_scheduled_job_scraper >> /root/hyrind_backend/hyrind-staging/hirynd/django_backend/logs/daily_scraper.log 2>&1
```

---

## 9. CLI & Management Commands

All commands are executed inside `django_backend/` with the virtual environment activated:

```bash
cd /root/hyrind_backend/hyrind-staging/hirynd/django_backend
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=hyrind.settings
```

### 1. Refresh Visa Intelligence
```bash
python manage.py visa_refresh
```
*Parses files in `data/uscis-hub`, updates aliases, enriches top employers, and rematches discovered jobs.*

### 2. Run Visa Matcher
```bash
# Match only newly scraped jobs
python manage.py run_match

# Rematch every job in the database
python manage.py run_match --rematch-all
```

### 3. Add Verified Company Alias
```bash
python manage.py add_alias "Kforce Staffing" "Kforce" "brand alias confirmed on myvisajobs.com"
```

### 4. Trigger Daily Scraper Run Manually
```bash
# Normal scheduled workflow
python manage.py run_scheduled_job_scraper

# Force execution bypassing recency checks
python manage.py run_scheduled_job_scraper --force --jobs-per-role 20 --max-roles 15
```

### 5. Trigger Manual Role Scrape via CLI
```bash
python manage.py run_manual_job_scraper "Python Developer" "Data Engineer" --limit 10 --sources linkedin,dice
```

### 6. Run Test Suite
```bash
python manage.py test job_discovery
```

---

## 10. REST API Reference

All endpoints require JWT Bearer authentication: `Authorization: Bearer <access_token>`.

### Admin Job Scraper Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/job-scraper/roles/` | Returns distinct confirmed candidate roles. |
| `GET` | `/api/admin/job-scraper/companies/` | Search companies in `company_visa_history` with filings, grades, scores. |
| `GET` | `/api/admin/job-scraper/companies/<id>/visa-details/` | Detailed visa record with 5-factor breakdown. |
| `POST` | `/api/admin/job-scraper/run/` | Initiates asynchronous scraping run (Mode A or Mode B). |
| `GET` | `/api/admin/job-scraper/executions/` | Paginated history of scraper runs. |
| `GET` | `/api/admin/job-scraper/executions/<id>/` | Real-time progress and status of a scraping run. |

### Global Job Discovery Endpoints (Dashboard A)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/job-discovery/jobs/` | Complete paginated catalog of all scraped jobs with filtering. |
| `GET` | `/api/admin/job-discovery/jobs/<id>/` | Detailed job record with score factor explanation. |
| `GET` | `/api/admin/job-discovery/statistics/` | Aggregated metrics by role, portal source, review status, and Visa Grade. |
| `GET` | `/api/admin/job-discovery/filters/` | Distinct filter options (roles, companies, locations, sources, grades). |

### Recruiter Job Discovery Endpoints (Dashboard B)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/recruiter/job-discovery/jobs/` | Personalized vacancies matching assigned candidates' confirmed roles. |
| `GET` | `/api/recruiter/job-discovery/jobs/<id>/` | Job details (strictly protected by recruiter scope; returns 403 if out of scope). |
| `GET` | `/api/recruiter/job-discovery/filters/` | Filter options restricted to recruiter's assigned candidate pool. |
| `GET` | `/api/recruiter/job-discovery/statistics/` | Scoped metrics for the recruiter's candidate pool. |

---

## 11. Environment & Configuration Guide

Environment variables are managed in `django_backend/.env`:

```ini
# Application & Environment
DEBUG=False
SECRET_KEY=your-production-secret-key
ENVIRONMENT=Staging
ALLOWED_HOSTS=*

# MySQL Database
DATABASE_NAME=hyrind-stag
DATABASE_USER=hyrind_user
DATABASE_PASSWORD=your-db-password
DATABASE_HOST=localhost
DATABASE_PORT=3306

# Apify Web Scraping Tokens & Actors
APIFY_API_TOKEN=apify_api_...
APIFY_MULTI_JOBBOARD_ACTOR=flash_scraper/multi-jobboard-scraper
APIFY_DICE_ACTOR=solidcode/dice-scraper
APIFY_MONSTER_ACTOR=unfenced-group/monster-scraper
APIFY_ZIPRECRUITER_ACTOR=memo23/ziprecruiter-scraper

# Scraper Concurrency & Freshness
SCRAPE_PARALLEL_BOARDS=4
SCRAPE_FRESHNESS_DAYS=7
SCRAPE_SOURCES=linkedin,indeed,glassdoor,dice
```

---

## 12. Testing, QA & Validation

The test suite covers models, serializers, permissions, scraper engine, deduplication, scheduler idempotency, recruiter isolation, visa scoring formula, and management commands:

```bash
cd /root/hyrind_backend/hyrind-staging/hirynd/django_backend
DJANGO_SETTINGS_MODULE=hyrind.settings venv/bin/python3 manage.py test job_discovery
```

Expected Output:
```
Found 18 test(s).
Creating test database for alias 'default'...
..................
----------------------------------------------------------------------
Ran 18 tests in 10.843s

OK
Destroying test database for alias 'default'...
```

---

## 13. Production Operations & Runbook

### Service Management (Linux systemd)
```bash
# Check staging service status
systemctl status hyrind-staging.service

# Restart staging backend
systemctl restart hyrind-staging.service

# View live service logs
journalctl -u hyrind-staging.service -f -n 100

# Health Check
curl -s http://127.0.0.1:6001/api/health/
```

### Frontend Build & Deployment
```bash
cd /root/hyrind_frontend/hyrind-staging/hirynd
npm run build
cp -r dist/* /var/www/hy_staging/
```

### Git Branching & Promotion
- Development and Staging branch: `release-version-2`.
- Production branch: `main`.
- **Note:** Never modify production (`hyrind-prod` on port 6000) directly. Test and validate all changes on Staging (`hyrind-staging` on port 6001) first.
