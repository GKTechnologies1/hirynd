# Fix Candidate & Recruiter UID Display on Dashboard

We have successfully resolved the issue where candidate, lead, and recruiter UIDs were displayed as raw UUID strings in the admin dashboard page title and breadcrumbs.

---

## 🔍 Root Cause Analysis

In the **Admin Dashboard** (`src/pages/AdminDashboard.tsx`), the page header/title was generated statically from the URL sub-path structure:
```tsx
title={subPath === "" ? "Admin Operations" : subPath.charAt(0).toUpperCase() + subPath.slice(1).replace(/-/g, " ")}
```

Because detail routes for candidates, interested candidates, and recruiters include the database UID in their path (e.g. `/admin-dashboard/candidates/ae5880cc-1282-4a0e-9e13-110881be8c9d`), the dashboard page header directly printed the raw UID string (`Candidates/ae5880cc 1282 4a0e 9e13 110881be8c9d`).

---

## 🛠️ Implemented Solution

We established a dynamic, event-driven title bubbling system that dynamically queries and updates the dashboard page title and breadcrumbs with actual human-readable names or emails once the API details have loaded.

### 1. Added dynamic callback interfaces to sub-page components
We modified the three detail pages to support an optional `onLoaded` callback that fires as soon as the respective API loads the details:
- **`AdminCandidateDetail`** (`src/pages/admin/AdminCandidateDetail.tsx`):
  Invokes `onLoaded` with candidate's `full_name`, `profile.full_name`, or `email`.
- **`AdminInterestedCandidateDetail`** (`src/pages/admin/AdminInterestedCandidateDetail.tsx`):
  Invokes `onLoaded` with lead's `name` or `email`.
- **`AdminRecruiterDetail`** (`src/pages/admin/AdminRecruiterDetail.tsx`):
  Invokes `onLoaded` with recruiter's `full_name`, `profile.full_name`, or `email`.

### 2. Implemented active state tracking in `AdminDashboard`
We added a `customTitles` state tracker in `AdminDashboard.tsx` that catches these loaded details and dynamically overrides the static path fallback:
```tsx
const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
```

The dynamic layout title rendering is now resolved elegantly:
```tsx
title={customTitles[subPath] || (subPath === "" ? "Admin Operations" : subPath.charAt(0).toUpperCase() + subPath.slice(1).replace(/-/g, " "))}
```

---

## 🔬 Compilation and Validation
We compiled the code and ran a full type-checking pass to ensure perfect code parity:
```powershell
npx tsc --noEmit
```
* **Status:** Clean pass with **zero errors**.
