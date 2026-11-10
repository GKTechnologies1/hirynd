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
6. [Job Restriction & Citizenship Detection Engine](#6-job-restriction--citizenship-detection-engine)
7. [Dual Job Discovery Dashboards (Global vs Recruiter)](#7-dual-job-discovery-dashboards)
8. [Recruiter Workflow & Candidate Deduplication](#8-recruiter-workflow--candidate-deduplication)
9. [Scraping Session Reports & Cost Analytics](#9-scraping-session-reports--cost-analytics)
10. [Employer Intelligence & Placement Discovery](#10-employer-intelligence--placement-discovery)
11. [Admin Scraper Control Panel (Mode A vs Mode B)](#11-admin-scraper-control-panel)
12. [Automated Daily Scheduler](#12-automated-daily-scheduler)
13. [CLI & Management Commands](#13-cli--management-commands)
14. [REST API Reference](#14-rest-api-reference)
15. [Environment & Configuration Guide](#15-environment--configuration-guide)
16. [Testing, QA & Validation](#16-testing-qa--validation)
17. [Production Operations & Runbook](#17-production-operations--runbook)

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

### Unrated vs Verified Zero Filings
- **Verified Zero Filings ("No H1B Filings"):** The company is positively identified in government records with zero approved H1B filings or zero LCAs.
- **Unrated ("No H1B Filings / Unrated"):** The employer name has not yet been matched to a federal filing record. Explicitly tagged so recruiters know to verify independently rather than assuming zero eligibility.

---

## 6. Job Restriction & Citizenship Detection Engine

An automated natural language classification engine runs during job ingestion (`job_discovery/services/restriction_detector.py`) and on-demand via CLI (`classify_job_restrictions`). It scans job descriptions with precision regular expressions to detect candidate eligibility blockers:

| Restriction Code | Badge Label | Triggers & Keywords Detected |
| :--- | :--- | :--- |
| `US_CITIZENSHIP_REQUIRED` | **US Citizen Only** | `US Citizen required`, `Must be a US Citizen`, `Only US Citizens and Green Card holders`, `ITAR compliance`, `No C2C` |
| `NO_TEMPORARY_VISA` | **No Visa Sponsorship** | `No sponsorship provided`, `Unable to sponsor visas`, `No OPT/CPT/H1B`, `Will not sponsor now or in future` |
| `SECRET_CLEARANCE` | **Security Clearance Required** | `Active Secret Clearance`, `Top Secret / SCI required`, `DoD clearance required`, `Public Trust` |

- **Sentence Evidence Extraction:** Extracts the exact contextual sentence where the restriction was stated and stores it in `discovered_jobs.detected_restrictions` JSON field.
- **UI Tooltip Presentation:** Renders compact amber/rose warning badges with hover tooltips displaying the exact matching sentence.

---

## 7. Dual Job Discovery Dashboards

### Dashboard A: Global View (Admin)
- **URL / Route:** Admin Dashboard $\to$ "Job Discovery" tab (`AdminJobDiscoveryPage.tsx`).
- **Scope:** Displays **ALL** scraped jobs across the entire database.
- **Filters:** Job Role, Company Name, Visa Grade (A/B/C/D/E/F), Minimum Visa Score slider, H1B Sponsor toggle, Location, Source Portal, Date Scraped.
- **Job Details Modal:** Visual breakdown of all 5 scoring factors, detected job restrictions, and safe external link (`target="_blank" rel="noopener noreferrer"`).
- **Provenance Transparency:** Displays Date Scraped (`created_at`) on every job card/row. Internal provenance metadata is retained without exposing raw scraper labels to end users.

### Dashboard B: Recruiter Personalized View (Recruiter)
- **URL / Route:** Recruiter Dashboard $\to$ "Job Discovery" navigation item (`RecruiterJobDiscoveryPage.tsx`).
- **Scope:** **Strictly isolated** at the backend SQL query level to confirmed job roles of candidates actively assigned to the authenticated recruiter.
- **Security:** Accessing an unassigned job ID returns `403 Forbidden` (anti-IDOR guard).
- **Candidate Badges:** Displays matching candidate chips on each job row showing which candidate(s) match that opportunity.

---

## 8. Recruiter Workflow & Multi-Tier Deduplication

Hyrind implements a two-tier deduplication engine to eliminate redundancy both at the web ingestion level and during recruiter submission workflows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TIER DEDUPLICATION                          │
│                                                                             │
│  [ TIER 1: CROSS-PORTAL SCRAPING DEDUPLICATION ]                            │
│  Job Ingestion (LinkedIn / Indeed / Glassdoor / Dice)                       │
│    │                                                                        │
│    ▼                                                                        │
│  Normalize: lowercase(title) | lowercase(company) | city | state            │
│    │                                                                        │
│    ▼                                                                        │
│  Generate SHA-256 content_hash                                              │
│    │                                                                        │
│    ├──► Match Found? ──► Set is_duplicate = True & canonical_job_id        │
│    └──► New Record?  ──► Set is_duplicate = False (Primary listing)        │
│                                                                             │
│  [ TIER 2: CANDIDATE-SPECIFIC APPLICATION DEDUPLICATION ]                  │
│  Recruiter Action: "Mark as Applied" for Candidate A                        │
│    │                                                                        │
│    ▼                                                                        │
│  Creates JobLinkEntry linked to recruiter DailySubmissionLog                │
│    │                                                                        │
│    ├──► Scoping for Candidate A: Job excluded by URL and Company + Title   │
│    └──► Scoping for Candidate B: Job remains VISIBLE & ACTIONABLE           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Cross-Portal Ingestion Deduplication
1. **Deterministic Content Hash:** For every incoming job listing, the parser calculates a SHA-256 `content_hash` combining normalized fields:
   $$\text{content\_hash} = \text{SHA256}(\text{trim}(\text{title}_{\text{lower}}) \parallel \text{trim}(\text{company}_{\text{lower}}) \parallel \text{city} \parallel \text{state\_code})$$
2. **Identification:** When the identical position is published across multiple job boards (e.g. both LinkedIn and Indeed), both records produce an identical hash.
3. **Database Tagging:** During upsert (`upsert_scraped_job`):
   - The first scraped job is stored as canonical (`is_duplicate=False`).
   - Subsequent matches are saved with `is_duplicate=True` and `canonical_job_id` referencing the primary job.
4. **Dashboard Filtering:** Both Dashboard A and Dashboard B filter `is_duplicate=False` by default, ensuring recruiters never review duplicate listings.

### Tier 2: Candidate-Specific Application Deduplication
1. **"Mark as Applied" Action:** When a recruiter submits an application for a candidate:
   - The recruiter clicks **"Mark Applied"** and adds optional notes.
   - The backend checks for an existing `JobLinkEntry` matching that candidate and job URL / company name.
   - If not already applied, it creates a `JobLinkEntry` (`recruiters.models`) linked to the recruiter's active `DailySubmissionLog`.
2. **Exclusion from Candidate A's Feed:** When viewing Dashboard B filtered for Candidate A:
   - The query (`build_recruiter_jobs_queryset`) excludes all job postings matching Candidate A's applied URLs as well as exact `(company_name, role_title)` pairs.
   - Candidate A will never see or be double-applied to that opening again.
3. **Multi-Candidate Preservation:** The job is **not removed** for other candidates. If Candidate B also qualifies for the role, the job remains visible and actionable for Candidate B until Candidate B is also applied.

---

## 9. Scraping Session Reports & Cost Analytics

### How Session Cost is Calculated

Hyrind tracks the exact financial expenditure of every scraping execution down to individual API calls, compute units, and provider charges:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SESSION COST CALCULATION ENGINE                       │
│                                                                             │
│  Apify Actor Execution (per source & role)                                  │
│    │                                                                        │
│    ├── 1. Compute Usage: usageTotalUsd (CPU / RAM seconds consumed)         │
│    └── 2. Actor Charges: _charged_cost (pricingModel)                       │
│             ├── PRICE_PER_DATASET_ITEM: items_count × unit_price            │
│             └── PAY_PER_EVENT: Σ (event_count × event_price)                │
│    │                                                                        │
│    ▼                                                                        │
│  Run Cost = max(usageTotalUsd, chargedCost)  [Fallback: $0.0050 Estimated]  │
│    │                                                                        │
│    ▼                                                                        │
│  Persist ScraperCostRecord(execution, role, source, cost_usd, api_calls)   │
│    │                                                                        │
│    ▼                                                                        │
│  Accumulate into ScraperExecution.total_cost_usd                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Telemetry Retrieval:** Immediately after an Apify actor run finishes, `run_actor_detailed` queries the run metadata from the Apify client.
2. **Cost Formula:**
   $$\text{Run Cost (USD)} = \max(\text{usageTotalUsd}, \text{chargedCost})$$
   - **`usageTotalUsd`:** Direct platform compute cost based on memory allocated and run duration (compute unit seconds).
   - **`chargedCost`:** Actor-specific pricing model:
     - `PRICE_PER_DATASET_ITEM`: $\text{row\_count} \times \text{price\_per\_unit\_usd}$ (e.g. \$0.001 per scraped row).
     - `PAY_PER_EVENT`: $\sum (\text{charged\_events} \times \text{event\_price\_usd})$.
   - **Fallback Safeguard:** If Apify has not yet finalized usage totals at the moment of completion, an audited baseline estimate (\$0.0050) is assigned with `cost_type='ESTIMATED'`.
3. **Audited Cost Ledger (`ScraperCostRecord`):**
   - Each actor call records: `execution_id`, `role_name`, `source_portal`, `api_calls`, `cost_usd`, `cost_type` (ACTUAL vs ESTIMATED), `provider`, `run_id`, `items_count`, and `initiated_by`.
   - The session aggregate is updated:
     $$\text{execution.total\_cost\_usd} = \sum \text{ScraperCostRecord.cost\_usd}$$
     $$\text{execution.api\_calls\_count} = \sum \text{ScraperCostRecord.api\_calls}$$
4. **Admin Cost Analytics:**
   - Accessible via Admin Scraper History $\to$ **"Cost Analytics"** modal (`ScrapingCostAnalyticsModal.tsx`).
   - Powered by `GET /api/admin/job-scraper/cost-reports/` providing real-time financial rollups:
     - **By Portal:** Spend on LinkedIn vs Indeed vs Glassdoor vs Dice.
     - **By Target Role:** Cost incurred per candidate job role.
     - **By User Profile:** Automated daily cron vs individual admin runs.

### Scraping Session Execution Report
Every scraping session generates an audit report accessible via Admin Scraper History:
- **Metrics Tracked:** Total Requested, Collected, Unique, Duplicate, Failed, Scored, Below-Threshold.
- **Per-Role Breakdown:** Detailed table breakdown showing vacancies collected, duplicates, scored, and failure counts per role (`GET /api/admin/job-scraper/executions/<id>/roles/`).
- **Recruiter Distribution & Assignment:** View which recruiters received jobs from the crawl. Admins can distribute discovered jobs to recruiters directly without duplicate database entries (`RecruiterJobAssignment`).

---

## 10. Employer Intelligence & Placement Discovery

Accessible via Admin Dashboard $\to$ "Employer Intelligence" (`/admin-dashboard/employers`):
- **Central Employer Directory:** Search across 42,000+ employers with federal immigration history, contact details, verification status, and Hyrind placement history.
- **Placement & Offer History:** Integrates with Hyrind's `PlacementClosure` records, showing which employers have successfully hired Hyrind candidates.
- **Contact Management:** Direct HR and recruiting contact information (`contact_name`, `contact_email`, `contact_phone`, `notes`).
- **Verification Management:** Verified vs Unverified employer status toggles.

---

## 11. Admin Scraper Control Panel

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

## 11. Admin Scraper Control Panel

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

## 12. Automated Daily Scheduler

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

## 13. CLI & Management Commands

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

### 3. Classify Job Restrictions
```bash
# Classify newly scraped unclassified jobs
python manage.py classify_job_restrictions

# Re-classify all jobs in the database
python manage.py classify_job_restrictions --force
```

### 4. Add Verified Company Alias
```bash
python manage.py add_alias "Kforce Staffing" "Kforce" "brand alias confirmed on myvisajobs.com"
```

### 5. Trigger Daily Scraper Run Manually
```bash
# Normal scheduled workflow
python manage.py run_scheduled_job_scraper

# Force execution bypassing recency checks
python manage.py run_scheduled_job_scraper --force --jobs-per-role 20 --max-roles 15
```

### 6. Trigger Manual Role Scrape via CLI
```bash
python manage.py run_manual_job_scraper "Python Developer" "Data Engineer" --limit 10 --sources linkedin,dice
```

### 7. Run Test Suite
```bash
python manage.py test job_discovery
```

---

## 14. REST API Reference

All endpoints require JWT Bearer authentication: `Authorization: Bearer <access_token>`.

### Admin Job Scraper & Analytics Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/job-scraper/roles/` | Returns distinct confirmed candidate roles. |
| `GET` | `/api/admin/job-scraper/companies/` | Search companies in `company_visa_history` with filings, grades, scores. |
| `GET` | `/api/admin/job-scraper/companies/<id>/visa-details/` | Detailed visa record with 5-factor breakdown. |
| `POST` | `/api/admin/job-scraper/run/` | Initiates asynchronous scraping run (Mode A or Mode B). |
| `GET` | `/api/admin/job-scraper/executions/` | Paginated history of scraper runs. |
| `GET` | `/api/admin/job-scraper/executions/<id>/` | Real-time progress and status of a scraping run. |
| `GET` | `/api/admin/job-scraper/executions/<id>/report/` | Complete session audit report with collected, unique, duplicate, scored counts. |
| `GET` | `/api/admin/job-scraper/executions/<id>/roles/` | Detailed per-role scraping breakdown table. |
| `GET` | `/api/admin/job-scraper/executions/<id>/distribution/` | Recruiter distribution tracking for a scraping execution. |
| `POST` | `/api/admin/job-scraper/executions/<id>/assign/` | Distribute discovered jobs to selected recruiters. |
| `GET` | `/api/admin/job-scraper/cost-reports/` | Detailed scraping expenditure breakdown by session, portal, role, and profile. |

### Global Job Discovery Endpoints (Dashboard A)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/job-discovery/jobs/` | Complete paginated catalog of all scraped jobs with filtering. |
| `GET` | `/api/admin/job-discovery/jobs/<id>/` | Detailed job record with score factor explanation and restrictions. |
| `GET` | `/api/admin/job-discovery/statistics/` | Aggregated metrics by role, portal source, review status, and Visa Grade. |
| `GET` | `/api/admin/job-discovery/filters/` | Distinct filter options (roles, companies, locations, sources, grades). |

### Recruiter Job Discovery Endpoints (Dashboard B)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/recruiter/job-discovery/jobs/` | Personalized vacancies matching assigned candidates' confirmed roles with deduplication. |
| `GET` | `/api/recruiter/job-discovery/jobs/<id>/` | Job details (strictly protected by recruiter scope; returns 403 if out of scope). |
| `POST` | `/api/recruiter/job-discovery/jobs/<id>/mark-applied/` | Mark discovered job as applied for candidate and create `JobLinkEntry`. |
| `GET` | `/api/recruiter/job-discovery/filters/` | Filter options restricted to recruiter's assigned candidate pool. |
| `GET` | `/api/recruiter/job-discovery/statistics/` | Scoped metrics for the recruiter's candidate pool. |

### Employer Intelligence Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/employers/` | Search and filter 42,000+ employers with visa, contact, and placement data. |
| `GET` | `/api/admin/employers/statistics/` | Summary metrics (total employers, H1B count, placements, verification status). |
| `GET` | `/api/admin/employers/<id>/` | Detailed employer profile with placement records and contact information. |
| `PATCH` | `/api/admin/employers/<id>/` | Update employer contact details, verification status, and notes. |
| `POST` | `/api/admin/employers/create/` | Register a new employer profile. |
| `GET` | `/api/admin/employers/<id>/placements/` | View all historical candidate placements and offers for an employer. |
| `POST` | `/api/admin/employers/<id>/placements/` | Log a candidate placement or job offer for an employer. |

### Public Job Alerts (Sanitized)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/recruiters/public-job-alerts/` | Public job board listing (work authorization & visa data completely scrubbed). |
| `GET` | `/api/recruiters/public-job-alerts/filter-options/` | Public filter options (visa categories omitted for unauthenticated users). |

---

## 15. Environment & Configuration Guide

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

## 16. Testing, QA & Validation

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

## 17. Production Operations & Runbook

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
