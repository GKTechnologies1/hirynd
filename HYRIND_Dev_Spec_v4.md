**HYRIND PORTAL**   |   Complete Dashboard Development Requirement Spec   |   v4.0   |   March 13, 2026

**HYRIND**

**PORTAL DASHBOARD**

*Complete Development Requirement Specification*

|**Version**|v4.0|
| :- | :- |
|**Date**|March 13, 2026|
|**Scope**|Candidate · Recruiter · Admin · Billing · Chat · Audit|
|**Classification**|CONFIDENTIAL – Dev Team Only|


# **1. SYSTEM ARCHITECTURE OVERVIEW**
HYRIND is an operations-driven recruitment platform. The following principles drive all development decisions:

- Admin-controlled pipeline with strict status-gating
- Multi-recruiter assignment (up to 4 recruiters per candidate)
- Versioned credential system with diff tracking
- Daily recruiter submission logging tied to job link entries
- Interview tracking with outcome management
- Referral tracking with status progression
- Monthly subscription billing with grace period controls
- Placement closure workflow locking the profile on success
- Email + in-app notifications for all major lifecycle events
- Strict role-based access control (RLS enforced at DB level)
- Internal group chat per candidate profile – no personal contact exposure

⚑  *All security must be enforced at the database level via Supabase RLS. No frontend-only gate is acceptable as a security boundary.*


# **2. ROLE SYSTEM**
## **2.1 Defined Roles**

|**#**|**Role**|**Registration Path**|**Portal Access**|
| :- | :- | :- | :- |
|1|Candidate|Self-register via website|Post admin approval only|
|2|Recruiter|Self-register via website|Post admin approval only|
|3|Team Lead|Admin-created account|Immediate upon creation|
|4|Team Manager|Admin-created account|Immediate upon creation|
|5|Admin|System provisioned|Full access always|
|6|Finance Admin|Admin-created (future phase)|Billing module only|

## **2.2 Permission Matrix**

|**Feature**|**Candidate**|**Recruiter**|**Team Lead**|**Team Manager**|**Admin**|
| :- | :- | :- | :- | :- | :- |
|Signup|✅ Self|✅ Self|❌|❌|✅ Creates all|
|Portal Approval|❌|❌|❌|❌|✅ Full control|
|Client Intake Submit|✅ Once|❌|❌|❌|Unlock only|
|Role Suggestion|❌|❌|View only|View only|✅ Full|
|Role Confirmation|✅ Own|❌|View only|View only|✅ Reopen only|
|Credential Edit|✅ Own|✅ Assigned only|View only|View only|✅ Full|
|Daily Logs Create|❌|✅ Assigned|View only|View only|View only|
|Daily Logs View|Own profile|Assigned only|Team profiles|Team profiles|Global|
|Billing/Card View|Own masked|Status badge only|Status only|Status only|Full unmasked|
|Placement Closure|❌|❌|❌|❌|✅ Full|
|Audit Viewer|Own events|Assigned only|Team assigned|Team assigned|Global|
|Recruiter Bank Details|❌|Own only|❌|❌|View only|
|Group Chat|Own profile|Assigned profiles|Team profiles|Team profiles|All profiles|
|Admin Config|❌|❌|❌|❌|✅ Full|


# **3. REGISTRATION & APPROVAL WORKFLOW**
## **3.1 Candidate Registration Form**
### **Section A – Required Identity Fields**

|**Field Name**|**Type**|**Validation Rules**|**Notes**|
| :- | :- | :- | :- |
|first\_name|Text|Required, max 60 chars, no numerics|Trim whitespace|
|last\_name|Text|Required, max 60 chars, no numerics|Trim whitespace|
|email|Email|Required, unique, valid format|Lowercase normalize|
|phone\_number|Tel|Required, E.164 or local format|Allow +, -, (, ), spaces|
|password|Password|Min 8 chars, 1 upper, 1 lower, 1 number, 1 special|Masked with eye toggle|
|confirm\_password|Password|Must match password exactly|Independent eye toggle|
|university\_name|Text|Required, max 120 chars||
|major\_degree|Text|Required, max 120 chars||
|graduation\_date|Date|Required, valid date, future allowed for students|Standardized format|

### **Section B – Source / Discovery Fields**

|**Field Name**|**Type**|**Allowed Values**|**Notes**|
| :- | :- | :- | :- |
|how\_did\_you\_hear\_about\_us|Dropdown|LinkedIn, Google, University, Friend, Social Media, Other|Required|
|friend\_name|Text|Free text, max 120 chars|Conditional – shown only when Friend is selected. Required when shown.|
|linkedin\_url|URL|Valid URL format|Optional at registration|
|portfolio\_url|URL|Valid URL format|Optional at registration|
|visa\_status|Dropdown|H1B, OPT, CPT, Green Card, US Citizen, Other|Optional at registration|
|current\_location|Text|City/State/Country|Optional at registration|

### **Password UI Requirements**
- Both password and confirm\_password must be masked by default (dot characters)
- Eye icon on right side of each field – clicking toggles visible/masked state
- Toggle state for password and confirm\_password must be independent
- Show inline validation in real time or on blur (not only on form submit)

### **Inline Validation Messages**

|**Field**|**Validation Message**|
| :- | :- |
|email|Email is required / Enter a valid email address|
|phone\_number|Phone number is required / Invalid format|
|password|Password must be at least 8 characters / Must contain uppercase, lowercase, number, and special character|
|confirm\_password|Passwords do not match|
|graduation\_date|Graduation date is required / Invalid date|
|friend\_name|Friend name is required when source is Friend|

## **3.2 Recruiter Registration Form**
Recruiter registration follows the same structure as candidate with the following additions:

|**Field Name**|**Required?**|**Notes**|
| :- | :- | :- |
|first\_name, last\_name, email, phone, password|Yes|Same rules as candidate|
|university\_name, major\_degree, graduation\_date|Yes|Same rules as candidate|
|linkedin\_url or social\_profile|Yes (one of)|Must provide at least one professional link|
|source\_selection|Yes|Same dropdown as candidate|
|city, state, country|Optional|Location context|
|prior\_recruitment\_experience|Optional|Free text, max 500 chars|
|work\_type\_preference|Optional|Full-time, Part-time, Contract, Remote|

## **3.3 Registration Submit Flow**
1. Validate all fields (client-side + server-side)
1. Create Supabase auth user
1. Create profile record in profiles table
1. Assign role = candidate or recruiter in user\_roles
1. Set approval\_status = pending\_approval
1. Set portal\_access = false
1. Insert audit\_log event: registration\_created
1. Send Registration Received Email (see Section 6.1)
1. Sign user out immediately after submission
1. On next login, show Pending Approval Screen only

## **3.4 Pending Approval Screen**
After registration and before admin approval, user sees ONLY this screen:

|**Pending Approval Screen – Required Elements**||
| :- | :- |
|**Heading**|Thank you for registering with Hyrind|
|**Subtext**|Your registration has been received and is under review|
|**Timeline text**|Expected review time: 24–48 hours|
|**Instruction**|You will receive an email once your profile is approved|
|**Support link**|Optional – contact support if needed|
|**Logout button**|Visible and functional|
|**Hidden elements**|ALL dashboard tabs, forms, navigation, recruiter info, chat|

## **3.5 Admin Approval Queue**
Admin Dashboard must show an Approvals Queue with:

- Candidate/Recruiter name
- Email address
- Registration date and time
- Source selection (how they heard about Hyrind)
- Approve button → triggers approval email + sets status = approved + portal\_access = true
- Reject button → triggers rejection email + sets status = rejected

⚑  *All approval/rejection actions must be audit logged with admin user ID and timestamp.*


# **4. MASTER STATUS PIPELINE**
## **4.1 Status Definitions & Tab Gating**

|**Status**|**Color**|**Meaning**|**Unlocked Tabs**|**Blocked Tabs**|
| :- | :- | :- | :- | :- |
|pending\_approval|Grey|Awaiting admin review|Overview (limited)|All others|
|approved / intake\_pending|Blue|Portal approved, intake needed|Overview, Intake|Roles, Credentials, Payment, Applications|
|intake\_submitted|Teal|Intake done, awaiting roles|Overview, Intake (RO)|Credentials, Payment|
|roles\_published|Amber|Roles ready for candidate|Overview, Intake, Roles|Credentials, Payment|
|roles\_candidate\_responded|Yellow|Candidate responded to roles with yes or no selections and add other roles option to candidate|Above + Credentials (msg)|Credentials form locked|
|payment\_pending|Orange|Payment required|Above + Payment|Credentials form|
|payment\_completed|Green|Paid – credentials open|Above + Credentials||
|credentials\_submitted|Cyan|Credentials done|All above + Applications, Interviews||
|active\_marketing|Green|Being marketed|All tabs||
|paused|Orange|Temporarily paused|Read-only all|Edit actions disabled|
|on\_hold|Grey|On hold pending review|Read-only all|Edit actions disabled|
|past\_due|Red|Payment failed|All but banner shown|Marketing restricted|
|cancelled|Red|Cancelled|Read-only archive|All mutations|
|placed\_closed|Purple|Placed – case closed|Read-only, success banner|All mutations|

⚑  *Locked tabs must never show a broken/empty screen. Always display a clear message explaining WHY the tab is locked and what action unlocks it.*

# **5. CANDIDATE DASHBOARD**
## **5.1 Dashboard Shell**
Route: /candidate-dashboard

|**Left Sidebar – Required Navigation Items**||
| :- | :- |
|**Branding**|Hyrind logo + 'HYRIND' text at top left|
|**Menu Item 1**|Overview|
|**Menu Item 2**|Intake Sheet|
|**Menu Item 3**|Roles|
|**Menu Item 4**|Credentials|
|**Menu Item 5**|Payments|
|**Menu Item 6**|Billing|
|**Menu Item 7**|Applications|
|**Menu Item 8**|Interviews|
|**Menu Item 9**|Referral|
|**Menu Item 10**|Messages (Group Chat)|
|**Menu Item 11**|Settings|
|**Bottom of sidebar**|Help Desk / Support link|

## **5.2 Overview Page**
Route: /candidate-dashboard/overview

### **Component A – Status Banner**
- Display current status label with color-coded badge
- One-line meaning text (e.g. 'Your intake is pending review')
- Next Action CTA button (e.g. 'Complete Intake Sheet →')

### **Component B – Journey Timeline / Stepper**

|**Step #**|**Label**|**Completion Trigger**|**State Colors**|
| :- | :- | :- | :- |
|1|Registration Submitted|On form submit|Grey → Green on complete|
|2|Profile Approved|Admin approves|Grey → Green on complete|
|3|Intake Submitted|Candidate submits intake|Grey → Green on complete|
|4|Roles Reviewed|Candidate responds to roles|Grey → Green on complete|
|5|Payment Completed|Admin records payment|Grey → Green on complete|
|6|Credentials Submitted|Credential form submitted|Grey → Green on complete|
|7|Active Marketing|Admin starts marketing|Grey → Green on complete|
|8|Placement Closed|Admin logs placement|Grey → Gold/Purple on complete|

- Completed step = check mark + green fill
- Current step = highlighted dot (blue/green)
- Future steps = grey
- Show date alongside step if event date is available

### **Component C – Pending Tasks Widget**
Show dynamically based on current status. Examples:

- Complete Intake Sheet (shown when status = intake\_pending)
- Review Suggested Roles (shown when status = roles\_published)
- Complete Payment (shown when status = payment\_pending)
- Review Upcoming Interview (shown when interview is scheduled within 48 hrs)
- Update Billing Method (shown when billing status = past\_due)

### **Component D – Assigned Team Card**
- Show all assigned team members by role
- Display: first name + last name + role label only
- Do NOT expose phone number, personal email, or external contact details

### **Component E – Scheduling / Training Card**
Show 4 scheduling buttons. Each redirects to admin-configured Cal.com URL:

|**Button Label**|**DB Config Key**|**Tracking Fields**|
| :- | :- | :- |
|Schedule Training Practice|cal\_training\_url|candidate\_id, clicked\_at, schedule\_type|
|Schedule Mock Practice Call|cal\_mock\_practice\_url|candidate\_id, clicked\_at, schedule\_type|
|Schedule Interview Training|cal\_interview\_training\_url|candidate\_id, clicked\_at, schedule\_type|
|Schedule Interview Support|cal\_interview\_support\_url|candidate\_id, clicked\_at, schedule\_type|
|Schedule Operations Call|cal\_operations\_call\_url|candidate\_id, clicked\_at, schedule\_type|

### **Component F – Notifications Panel**
- Show last 10 system notifications for the candidate
- Each notification: icon, message text, timestamp, read/unread state
- Mark as read on click
- Types: registration\_approved, intake\_reviewed, roles\_published, payment\_due, recruiter\_assigned, training\_reminder, placement\_closed


## **5.3 Intake Sheet Page**
Route: /candidate-dashboard/intake

Access rule: Visible after admin approval. Editable until submitted. Read-only after submit. Admin can reopen (audit logged).\
\
**Mentioned sample fields and validation but please make sure we pull all the fields from the client intake sheet form link shared**

### **Section A – Personal Details**

|**Field**|**Type**|**Required?**|**Validation**|
| :- | :- | :- | :- |
|first\_name|Text|Yes|Max 60 chars|
|last\_name|Text|Yes|Max 60 chars|
|date\_of\_birth|Date|Yes|Must be valid past date|
|phone\_number|Tel|Yes|Valid phone format|
|alternate\_phone|Tel|No|Valid phone format if provided|
|email|Email|Yes|Pre-filled from registration|
|current\_address|Text|Yes|Max 200 chars|
|city|Text|Yes|Max 80 chars|
|state|Text|Yes|Max 80 chars|
|country|Dropdown|Yes|Country list|
|zip\_code|Text|Yes|Format varies by country|

### **Section B – Education**

|**Field**|**Type**|**Required?**|**Validation**|
| :- | :- | :- | :- |
|university\_name|Text|Yes|Pre-filled, editable|
|degree|Dropdown|Yes|Bachelor's, Master's, PhD, Associate, Other|
|major|Text|Yes|Max 120 chars|
|graduation\_date|Date|Yes|Valid date|
|additional\_certifications|Text Area|No|Max 500 chars|
|academic\_projects|Text Area|No|Max 1000 chars|

### **Section C – Work Authorization**

|**Field**|**Type**|**Required?**|**Notes**|
| :- | :- | :- | :- |
|visa\_type|Dropdown|Yes|H1B, OPT, CPT, Green Card, US Citizen, EAD, TN, Other|
|visa\_expiry\_date|Date|Conditional|Required if visa\_type is not US Citizen or Green Card|
|work\_authorization\_status|Dropdown|Yes|Authorized, Requires Sponsorship, Pending|
|sponsorship\_required|Boolean|Yes|Yes / No toggle|
|country\_of\_work\_authorization|Dropdown|Yes|Country list|

### **Section D – Job Preferences**

|**Field**|**Type**|**Required?**|**Notes**|
| :- | :- | :- | :- |
|target\_roles|Multi-text|Yes|Can add multiple roles|
|preferred\_locations|Multi-text|Yes|City/State or Remote|
|remote\_preference|Dropdown|Yes|Remote, Hybrid, On-site, Any|
|salary\_expectation|Number|Yes|Annual USD amount|
|relocation\_preference|Boolean|Yes|Willing to relocate: Yes / No|
|industry\_preference|Multi-select|No|Tech, Finance, Healthcare, etc.|
|shift\_preference|Dropdown|No|Day, Night, Any|

### **Section E – Professional Background**

|**Field**|**Type**|**Required?**|**Notes**|
| :- | :- | :- | :- |
|years\_of\_experience|Number|Yes|0–50, integer|
|recent\_employer|Text|No|Max 120 chars|
|current\_job\_title|Text|No|Max 120 chars|
|technologies\_or\_skills|Text Area|Yes|Max 2000 chars|
|linkedin\_url|URL|Yes|Valid URL format|
|github\_url|URL|No|Valid URL format|
|portfolio\_url|URL|No|Valid URL format|
|resume\_upload|File|Yes|PDF or DOCX, max 10 MB|

### **Section F – Marketing Inputs**

|**Field**|**Type**|**Required?**|**Notes**|
| :- | :- | :- | :- |
|ready\_to\_start\_date|Date|Yes|Must be today or future|
|preferred\_employment\_type|Dropdown|Yes|Full-time, Part-time, Contract, C2C|
|job\_search\_priority|Dropdown|No|Active, Passive, Not looking|
|additional\_notes|Text Area|No|Max 1000 chars for candidate to communicate any special context|

### **Intake Submit Logic**
1. Client-side validation of all required fields
1. Server RPC call (SECURITY DEFINER) to save intake
1. Set candidate status = intake\_submitted
1. Create notification to admin: new intake submitted
1. Send email to admin: intake received
1. Send confirmation email to candidate
1. Lock form from candidate editing
1. Show success banner on overview
1. Insert audit\_log: intake\_submitted

### **Intake Reopen Logic (Admin Only)**
- Admin clicks Reopen Intake in admin candidate view
- System sets intake\_locked = false
- Stores: reopened\_by (admin\_id), reopened\_at (timestamp), reopen\_reason (text)
- Sends notification + email to candidate
- Inserts audit\_log: intake\_reopened
- Candidate sees banner: 'Your intake has been reopened by admin for updates'


## **5.4 Roles Page**
Route: /candidate-dashboard/roles

### **Before Admin Publishes Roles**
Show placeholder message:

*"Role suggestions will appear here once your intake has been reviewed. Please allow 24–48 hours after intake submission."*

### **Role Suggestion Card Fields (Admin Published)**

|**Field**|**Source**|**Visible to Candidate?**|**Notes**|
| :- | :- | :- | :- |
|role\_title|Admin input|Yes|e.g. 'Software Engineer'|
|recommended\_by|Auto (admin name)|Yes|Display name + role|
|recommended\_by|Client ( By using Add others option)|Yes|Display name + role|
|created\_at|System|Yes|Format: Month DD, YYYY|
|admin\_note|Admin input|Yes|Optional context from admin|

### **Candidate Response Options Per Role**
- Accept (Yes) – marks the role as accepted
- Decline (No) – marks the role as rejected
- Request Change – shows text input for change\_request\_note (required when selected)

Candidate may also propose a custom role:

- custom\_role\_title (text, max 120 chars)
- custom\_reason (text area, max 500 chars)

### **Role Submit Behavior**
1. Validate all roles have a response (no empty selections allowed)
1. Save all responses via SECURITY DEFINER RPC
1. Set status = roles\_candidate\_responded
1. Send notification + email to admin + confirmation to client
1. Insert audit\_log: roles\_responded
1. Lock form after submission (admin must reopen to allow changes)


## **5.5 Credentials Page**
Route: /candidate-dashboard/credentials

### **Access Gate**

|**Credential Tab Access Rules**||
| :- | :- |
|**Stage 1 – Blocked**|If roles not yet confirmed → show: 'Complete your role confirmation step to unlock credentials'|
|**Stage 2 – Blocked**|If payment required and not completed → show: 'Complete your payment step to access credential onboarding'|
|**Stage 3 – Open**|Both conditions met → credential form is accessible|

**Credential Fields\
\
THESE ARE THE SAMPLE FIELDS BUT PLEASE PROCEED WITH THE FIELDS MENTIONED IN THE CREDENTIAL INTAKE SHEET FORM LINK**
-------------------------------------------------------------------------------------------------------------------
###
|**Field**|**Type**|**Editable By**|**Sensitive?**|
| :- | :- | :- | :- |
|full\_name\_as\_resume|Text|Candidate, Recruiter, Admin|No|
|primary\_resume|File Upload|Candidate, Recruiter, Admin|No|
|alternate\_resume\_versions|Multi-file|Candidate, Recruiter, Admin|No|
|linkedin\_url|URL|Candidate, Recruiter, Admin|No|
|github\_url|URL|Candidate, Recruiter, Admin|No|
|portfolio\_url|URL|Candidate, Recruiter, Admin|No|
|work\_history\_summary|Text Area|Candidate, Recruiter, Admin|No|
|skills\_summary|Text Area|Candidate, Recruiter, Admin|No|
|tools\_and\_technologies|Text Area|Candidate, Recruiter, Admin|No|
|certifications|Text Area|Candidate, Recruiter, Admin|No|
|visa\_details|Text|Candidate, Admin only|YES – mask in diffs|
|relocation\_preference|Dropdown|Candidate, Recruiter, Admin|No|
|references\_if\_needed|Text Area|Candidate, Admin only|YES – mask in diffs|
|recruiter\_notes|Text Area|Recruiter, Admin only|No|
|formatting\_notes|Text Area|Recruiter, Admin only|No|

### **Versioning System**
Every save creates a new version row in credential\_intake\_versions:

|**Column**|**Type**|**Description**|
| :- | :- | :- |
|id|UUID|Primary key|
|candidate\_id|UUID FK|Reference to profiles|
|version\_number|Integer|Auto-increment per candidate|
|updated\_by|UUID FK|User who made the change|
|updated\_at|Timestamp|UTC timestamp of save|
|source\_role|Enum|candidate / recruiter / admin|
|changed\_fields|JSON Array|List of field names changed|
|diff\_summary|JSON|Before/after values – sensitive fields omitted|
|full\_snapshot|JSON|Full credential state at this version|

### **Version History UI**
- Show Version History accordion below the form
- Each entry: version number, updated\_by name + role, timestamp, fields changed
- Sensitive fields shown as '[REDACTED]' in diff view
- Admin can view all versions; recruiter sees own versions only


## **5.6 Payments Page**
Route: /candidate-dashboard/payments

Purpose: Candidate views service charges, mock practice fees, and scheduled payment obligations set by admin.

### **Payment Line Item Fields**

|**Field**|**Type**|**Admin Sets?**|**Candidate Sees?**|
| :- | :- | :- | :- |
|charge\_name|Text|Yes|Yes|
|charge\_type|Dropdown|Yes|Yes – display label|
|amount|Decimal|Yes- adjustable|Yes|
|currency|Dropdown|Yes|Yes (USD default)|
|due\_date|Date|Yes – adjustable|Yes|
|payment\_status|Enum|Auto + Admin|Yes|
|payment\_notes|Text|Yes|Yes if not internal|
|pay\_button|Action|N/A|Yes if integration active|

### **Charge Types**
- Monthly Service Fee - $ 400
- Mock Practice Fee – Dynamic Pricing
- Interview Support Fee – Dynamic Pricing
- Operations Support Fee – Dynamic Pricing

### **Payment Status Values**

|**Status**|**Badge Color**|**Meaning**|
| :- | :- | :- |
|pending|Yellow|Payment not yet due or in progress|
|paid|Green|Payment confirmed|
|overdue|Red|Due date passed without payment|
|waived|Grey|Admin waived this charge|
|partially\_paid|Orange|Partial payment received|
|cancelled|Dark Grey|Charge cancelled by admin|

### **Due Date Change Logic (Admin)**
- Admin can adjust due date by specifying number of days/weeks to move forward or backward
- System stores: previous\_due\_date, new\_due\_date, changed\_by, change\_reason, changed\_at
- Insert audit\_log: payment\_due\_date\_changed
- Notify candidate via in-app + email when due date changes

## **5.7 Billing Page**
Route: /candidate-dashboard/billing

### **Display Fields**

|**Field**|**Display Format**|**Notes**|
| :- | :- | :- |
|plan\_name|Text label|e.g. 'Standard Marketing Plan'|
|recurring\_amount|Currency|e.g. '$599 / month'|
|subscription\_status|Badge|See status table below|
|next\_billing\_date|Date|Format: Month DD, YYYY|
|last\_payment\_date|Date|Format: Month DD, YYYY|
|billing\_method\_summary|Masked card|e.g. 'Visa ending in 4242 – Exp 08/26'|
|invoice\_history|Table|Date, amount, status, download link|
|payment\_history|Table|Date, amount, method, transaction ref|

### **Billing Status Badges**

|**Status**|**Badge Color**|**Candidate Banner**|
| :- | :- | :- |
|Active|Green|No banner – normal state|
|Past Due|Red|"Payment failed. Update your billing method to continue uninterrupted service."|
|Paused|Orange|"Your billing is currently paused. Contact support for more information."|
|Cancelled|Dark Red|"Your subscription has been cancelled. Contact us to reactivate."|
|Trial|Blue|"You are on a trial period until [date]."|
|Grace Period|Yellow|"You are within a grace period. Update billing to avoid interruption."|

### **Billing Actions**
- Update Card → redirect to payment provider portal
- Retry Payment → available only when status = past\_due
- View Invoice → opens invoice detail
- Download Invoice → generates PDF download

⚑  *NEVER display full card number. Only show: card brand, last 4 digits, expiry month/year.*


## **5.8 Applications Page**
Route: /candidate-dashboard/applications

### **Summary Bar**

|**Metric**|**Calculation**|
| :- | :- |
|Total Applications This Week|Sum of applications\_count across daily\_submission\_logs for last 7 days|
|Applications Today|Sum for today's date|
|Screening Stage|Count of job entries with status = Screening|
|Interview Stage|Count of job entries with status = Interview|
|Offer Stage|Count of job entries with status = Offer|

### **Daily Log Table**

|**Column**|**Type**|**Notes**|
| :- | :- | :- |
|Date|Date display|Formatted: Weekday, Month DD, YYYY|
|Recruiter Name|Text|Who submitted the log|
|Applications Count|Integer|Total for that day|
|Screening Count|Integer|Applications in screening|
|Interview Count|Integer|Interviews scheduled|
|Offer Count|Integer|Offers received|
|Expand Button|Action|Opens per-job detail rows below|

### **Expanded Job Entry Fields**

|**Field**|**Type**|**Who Can Edit?**|**Notes**|
| :- | :- | :- | :- |
|company\_name|Text|Recruiter, Admin|Required|
|role\_title|Text|Recruiter, Admin|Required|
|job\_url|URL|Recruiter, Admin|Valid URL, opens in new tab|
|job\_description|Text Area / Fetched|Auto-fetch or manual|If URL fetch fails, allow manual|
|resume\_used|<p>Dropdown/Text</p><p>( Link or file supported)</p>|Recruiter, Admin|Reference known resumes|
|application\_status|Dropdown|Candidate, Recruiter, Team Lead, Admin|Applied, Screening, Interview, Rejected, Offer|
|notes|Text Area|Recruiter, Admin|Internal notes|
|submitted\_by|System|System auto-filled|Actor name + role|
|submitted\_at|System|System auto-filled|UTC timestamp|

### **Job Description Auto-Fetch**
- When job\_url is entered, system attempts to retrieve job title, company, description, location
- If fetch succeeds: pre-fill fields, mark fetch\_status = success
- If fetch fails: do not block form submission, mark fetch\_status = failed, allow manual entry
- Job links should be stored for potential public-facing redirect and JD display (admin config)


## **5.9 Interviews Page**
Route: /candidate-dashboard/interviews

### **Interview Log Fields**

|**Field**|**Type**|**Required?**|**Who Can Set?**|
| :- | :- | :- | :- |
|interview\_type|Dropdown|Yes|All roles|
|stage\_round|Text/Number|Yes|All roles|
|company\_name|Text|Yes|All roles|
|role\_title|Text|Yes|All roles|
|interview\_date|Date|Yes|All roles|
|interview\_time|Time|Yes|All roles|
|time\_zone|Dropdown|Yes|All roles|
|interviewer\_name|Text|No|All roles|
|interview\_mode|Dropdown|Yes|All roles|
|meeting\_link|URL|Conditional|All roles – required if mode = video|
|outcome|Dropdown|Yes|All roles after interview|
|difficult\_questions|Text Area|No|Candidate + Admin|
|feedback\_notes|Text Area|No|All roles|
|support\_needed|Text Area|No|Candidate|
|next\_round\_date|Date|No|All roles|
|created\_by|System|Auto|System|
|updated\_by|System|Auto|System|

### **Interview Types**
- Screening Call
- Technical Interview
- HR Interview
- Client Round
- Final Round
- Mock Interview
- Support Call

### **Outcome Values**

|**Outcome**|**Badge Color**|**Next Action Suggestion**|
| :- | :- | :- |
|Scheduled|Blue|Prepare for interview|
|Completed|Grey|Log feedback|
|Selected / Passed|Green|Await next round or offer|
|Rejected|Red|Review feedback, continue marketing|
|Follow-up Needed|Yellow|Schedule support call|
|Rescheduled|Orange|Update date/time|
|No Show|Dark Red|Investigate and log reason|

## **5.10 Referral Page**
Route: /candidate-dashboard/referral

### **Referral Submission Form**

|**Field**|**Type**|**Required?**|**Validation**|
| :- | :- | :- | :- |
|friend\_name|Text|Yes|Max 120 chars|
|friend\_email|Email|Yes|Valid email format|
|friend\_phone|Tel|No|Valid phone format|
|referred\_for|Dropdown/Text|No|Job search, General membership, etc.|
|note\_from\_candidate|Text Area|No|Max 500 chars|

### **Referral Status Flow**
- Sent → Contacted → Onboarded → Closed
- Or: Sent → Rejected (if admin decides not to move forward)

### **On Submit Triggers**
1. Create referral\_entry record
1. Notify admin via in-app notification
1. Send optional email to referred friend
1. Send email to admin with referral details
1. Insert audit\_log: referral\_submitted
1. Show success confirmation to candidate

### **Candidate Visibility**
- Candidate can see: name of person they referred, current status, date submitted
- Candidate cannot see admin notes on referral


## **5.11 Settings Page**
Route: /candidate-dashboard/settings

### **Change Password**

|**Field**|**Validation**|
| :- | :- |
|current\_password|Required – must match stored password|
|new\_password|Min 8 chars, 1 upper, 1 lower, 1 number, 1 special|
|confirm\_new\_password|Must match new\_password exactly|

All password fields must have eye icon toggles for show/hide.

### **Profile Preferences (Optional Phase 2)**
- Notification preferences (email, in-app, both)
- Timezone selection
- Language preference
- Profile image upload

### **Help Desk**
- FAQ accordion or link
- Support ticket submission form or chatbot
- Must NOT expose direct personal contact information automatically


# **6. INTERNAL GROUP CHAT SYSTEM**
Each candidate profile has exactly one internal group chat room. This enables collaborative communication among all assigned team members without exposing personal contact details.

## **6.1 Chat Room Structure**

|**Chat Room Configuration**||
| :- | :- |
|**Room Identifier**|candidate\_[candidate\_id]\_group\_chat|
|**Participants**|Candidate + all assigned Recruiters + Team Lead + Team Manager + Admin|
|**Auto-assignment**|Participants added/removed automatically when recruiter assignment changes|
|**History on unassign**|Chat history retained for audit – recruiter loses active access but history preserved|

## **6.2 Visibility & Access Rules**

|**Role**|**Can See**|**Cannot See**|
| :- | :- | :- |
|Candidate|Own profile chat only, team member names + role labels|Personal contacts of team, other candidate chats|
|Recruiter|Assigned profile chats only, candidate first name + last name|Non-assigned candidate profiles, leadership personal contacts|
|Team Lead|All assigned team profile chats|Admin personal contact, non-team profiles|
|Team Manager|All assigned team profile chats|Admin personal contact, non-team profiles|
|Admin|All profile group chats, audit/moderation tools|N/A – full access|

## **6.3 Message Schema**

|**Column**|**Type**|**Notes**|
| :- | :- | :- |
|message\_id|UUID PK|Primary key|
|candidate\_profile\_id|UUID FK|Which candidate this chat belongs to|
|sender\_user\_id|UUID FK|Auth user who sent the message|
|sender\_role|Enum|candidate / recruiter / team\_lead / team\_manager / admin|
|message\_text|Text|Max 2000 chars|
|attachment\_url|Text|Optional file attachment URL|
|sent\_at|Timestamp|UTC timestamp of send|
|edited\_at|Timestamp|UTC timestamp of last edit (null if not edited)|
|deleted\_at|Timestamp|Soft delete timestamp (null if not deleted)|
|is\_system\_message|Boolean|True for automated system notices|

## **6.4 System-Generated Messages**
The following events auto-post a system message in the relevant group chat:

- Recruiter [Name] has been assigned to this profile
- Recruiter [Name] has been removed from this profile
- Profile status changed to [New Status]
- Intake submitted by candidate
- Interview scheduled for [Date]
- Placement closed – case successfully completed

## **6.5 UI Placement**
- Dedicated 'Messages' tab in the left sidebar navigation
- Optional: floating right-side drawer accessible from any profile page
- Support/Help chatbot is separate from the profile group chat
- Admin sees a list of all candidate chat rooms and can click into any

## **6.6 Moderation & Audit**
- Admin can search all chat messages by keyword, date, or sender
- Admin can flag/archive messages
- All messages retained per data retention policy
- Chat access changes (add/remove participant) must be audit logged


# **7. RECRUITER DASHBOARD**
## **7.1 Recruiter Home**
If recruiter is assigned to multiple candidates: show filterable candidate list.

If recruiter is assigned to only one candidate: auto-open that candidate profile.

### **Candidate List Filters**
- Status (dropdown multi-select)
- Visa type
- Last updated date range
- Search by name

### **Recruiter Stats Widget**
- Applications logged today
- Applications logged this week
- Interviews scheduled this week
- Offers received this week

## **7.2 Candidate Profile Tabs (Recruiter View)**

|**Tab**|**Access Level**|**Notes**|
| :- | :- | :- |
|Overview|Read only|Same as candidate but no edit CTAs|
|Intake|Read only|Cannot edit intake|
|Roles|Read only|Cannot suggest or edit roles|
|Credentials|Edit allowed|Can update credential fields, must create audit record|
|Applications|Create + Edit|Can submit daily logs, edit application status|
|Interviews|Create + Edit|Can log and update interview rounds ( same as candidates)|
|Messages|Full participant|Can chat in assigned profile group chat|
|Audit|Assigned only|Can see audit events for assigned profiles only|

## **7.3 Daily Submission Log**
This is the core recruiter function. Every working day, recruiters must log application activity.

### **Log Header Fields**

|**Field**|**Type**|**Notes**|
| :- | :- | :- |
|log\_date|Date|Auto-filled to today. Admin can retroactively edit.|
|candidate\_id|FK|Auto-set by context (which profile is open)|
|applications\_count|Integer|Total applications submitted this day|
|recruiter\_id|FK|Auto-set from logged-in recruiter|

### **Per-Job Entry Fields**

|**Field**|**Type**|**Required?**|**Notes**|
| :- | :- | :- | :- |
|company\_name|Text|Yes|Max 120 chars|
|role\_title|Text|Yes|Max 120 chars|
|job\_url|URL|Yes|Valid URL – triggers JD fetch attempt|
|job\_description|Text Area|Auto/Manual|Auto-fetched or manually entered|
|resume\_used|Text/Dropdown( Link or file supported)|Yes|Which resume version was submitted|
|application\_status|Dropdown|Yes|Applied, Screening, Interview, Rejected, Offer|
|notes|Text Area|No|Internal recruiter notes|

## **7.4 Recruiter Profile & Payroll**
### **Recruiter Profile Fields (Editable)**
- First name, Last name
- Email address
- Phone number
- City, State, Country
- LinkedIn URL

### **Bank Details (Sensitive)**
- Stored in separate recruiter\_bank\_details table
- Only recruiter can set/update their own bank details
- Admin can view (read-only) via admin panel
- Masked after save – show only last 4 digits of account number
- Email to admin when bank details are updated
- Insert audit\_log: bank\_details\_updated


# **8. ADMIN DASHBOARD**
## **8.1 Admin Home Widgets**

|**Widget**|**Data Source**|**Action Available**|
| :- | :- | :- |
|Pending Approvals|profiles WHERE approval\_status = pending\_approval|Quick Approve / Reject|
|Intake Submitted|candidates WHERE status = intake\_submitted|View intake|
|Roles Awaiting Confirmation|candidates WHERE status = roles\_published|Remind candidate|
|Awaiting Payment|candidates WHERE status = payment\_pending|Send reminder|
|Credential Completed|candidates WHERE status = credentials\_submitted|Start marketing|
|Active Marketing|candidates WHERE status = active\_marketing|View count|
|Past Due Billing|subscriptions WHERE status = past\_due|Trigger reminder email|
|Interest Form Submissions|New leads / intake form website submissions|Review + assign|
|Training Sessions Scheduled|training\_clicks table aggregated|View detail|
|Placement Ready|candidates flagged as placement\_ready|Initiate closure|

## **8.2 Candidate Management Actions**

|**Action**|**Trigger**|**Effect**|**Audit?**|
| :- | :- | :- | :- |
|Approve Registration|Admin clicks Approve|status = approved, email sent|Yes|
|Reject Registration|Admin clicks Reject|status = rejected, email sent|Yes|
|Suggest Roles|Admin adds roles + publishes|status = roles\_published, notify candidate email sent|Yes|
|Reopen Intake|Admin reopens intake form|Intake unlocked, candidate notified email sent|Yes|
|Reopen Roles|Admin reopens role confirmation|Roles form unlocked, candidate notified email sent|Yes|
|Assign Recruiter|Admin selects from recruiter list|recruiter\_assignments record created email sent|Yes|
|Record Payment|Admin marks payment received|status = payment\_completed email sent|Yes|
|Start Marketing|Admin activates marketing|status = active\_marketing |Yes|
|Pause Marketing|Admin pauses profile|status = paused email sent|Yes|
|Resume Marketing|Admin resumes paused profile|status = active\_marketing|Yes|
|Cancel Profile|Admin cancels|status = cancelled, billing action triggered|Yes|
|Close Placement|Admin submits placement form|status = placed\_closed, locks profile|Yes|

## **8.3 Placement Closure Form**
### **Required Fields**

|**Field**|**Type**|**Required?**|
| :- | :- | :- |
|employer\_name|Text|Yes|
|role\_placed\_into|Text|Yes|
|start\_date|Date|Yes|
|salary|Decimal|Yes|
|currency|Dropdown|Yes – USD default|
|offer\_letter\_upload|File (PDF)|Yes|
|hr\_contact\_email|Email|Yes|
|placement\_notes|Text Area|No|

### **After Placement Submit**
1. Set status = placed\_closed
1. Lock all editing actions on the profile
1. Show success banner across all profile views
1. Notify all assigned team members
1. Send placement congratulations email to candidate
1. Send placement confirmation to admin team
1. Insert audit\_log: placement\_closed


# **9. EMAIL SYSTEM – FULL EVENT MAP**

|**Event**|**Trigger**|**Recipients**|**Subject Line**|
| :- | :- | :- | :- |
|Registration Received|Candidate submits registration|Candidate|Registration Received – Hyrind|
|Registration Approved|Admin approves profile|Candidate|Your Hyrind Profile Has Been Approved|
|Registration Rejected|Admin rejects profile|Candidate|Update on Your Hyrind Registration|
|Intake Submitted|Candidate submits intake|Admin|New Intake Submitted – Action Required|
|Roles Suggested|Admin publishes roles|Candidate|Your Role Suggestions Are Ready for Review|
|Roles Confirmed|Candidate responds to roles|Admin|Candidate Has Responded to Role Suggestions|
|Payment Success|Admin records payment / webhook|Candidate|Payment Confirmed – Hyrind|
|Payment Failed|Billing webhook failure|Candidate + Admin|Action Required: Payment Could Not Be Processed|
|Recruiter Assigned|Admin assigns recruiter|Candidate + Recruiter|Your Recruiter Has Been Assigned|
|Referral Submitted|Candidate submits referral|Admin + Friend (optional)|New Referral Received|
|Placement Closed|Admin closes placement|Candidate + Admin team|Congratulations – Your Placement Has Been Confirmed|
|Subscription Renewal Reminder|7 days before billing date|Candidate|Upcoming Billing Reminder – Hyrind|
|Subscription Failed|Billing webhook failure|Candidate|Action Required: Subscription Payment Failed|
|Bank Details Updated|Recruiter updates bank info|Admin|Recruiter Bank Details Updated – Hyrind|
|Intake Reopened|Admin reopens intake|Candidate|Your Intake Form Has Been Reopened|
|Roles Reopened|Admin reopens roles|Candidate|Your Role Selection Has Been Reopened|

⚑  *All emails must be logged in email\_logs table with: event\_type, recipient\_user\_id, sent\_at, status (sent/failed), resend\_message\_id.*


# **10. DATABASE TABLES & RELATIONSHIPS**

|**Table**|**Primary Key**|**Key Foreign Keys**|**Purpose**|
| :- | :- | :- | :- |
|profiles|id (UUID)|auth.users.id|Core user record for all roles|
|user\_roles|id|user\_id → profiles|Role assignments per user|
|candidate\_intake|id|candidate\_id → profiles|Onboarding intake form data|
|credential\_intake\_versions|id|candidate\_id, updated\_by → profiles|Versioned credential records|
|role\_suggestions|id|candidate\_id, created\_by → profiles|Admin-suggested roles per candidate|
|role\_confirmations|id|candidate\_id, suggestion\_id|Candidate responses to role suggestions|
|recruiter\_assignments|id|candidate\_id, recruiter\_id → profiles|Recruiter-to-candidate assignment records|
|team\_lead\_assignments|id|candidate\_id, team\_lead\_id → profiles|Team lead assignment records|
|daily\_submission\_logs|id|candidate\_id, recruiter\_id|Daily log header per recruiter per day|
|job\_link\_entries|id|log\_id → daily\_submission\_logs|Individual job entries within a daily log|
|interview\_logs|id|candidate\_id, created\_by → profiles|Individual interview events|
|referral\_entries|id|referred\_by → profiles|Friend referrals submitted by candidates|
|payments|id|candidate\_id → profiles|Payment line items set by admin|
|subscriptions|id|candidate\_id → profiles|Recurring subscription record|
|invoices|id|subscription\_id, candidate\_id|Individual invoice records|
|placement\_closures|id|candidate\_id, closed\_by → profiles|Final placement records|
|audit\_logs|id|actor\_user\_id, target\_record\_id|Immutable audit trail for all mutations|
|notifications|id|user\_id → profiles|In-app notification records|
|email\_logs|id|recipient\_user\_id → profiles|Outbound email records|
|admin\_config|id|—|Admin-configurable platform settings|
|recruiter\_bank\_details|id|recruiter\_id → profiles|Sensitive bank data – isolated table|
|chat\_rooms|id|candidate\_id → profiles|One room per candidate profile|
|chat\_room\_participants|id|room\_id, user\_id → profiles|Participants per chat room|
|chat\_messages|id|room\_id, sender\_user\_id|Individual chat messages|
|training\_schedule\_clicks|id|candidate\_id, clicked\_by|Tracking for Cal.com button clicks|


# **11. SECURITY REQUIREMENTS**

|**Requirement**|**Implementation Detail**|
| :- | :- |
|RLS on all tables|Every table must have Supabase Row Level Security policies. No table should be globally accessible.|
|SECURITY DEFINER RPCs|All mutations (inserts, updates, deletes) must go through named database functions with SECURITY DEFINER. No direct client-side table writes allowed.|
|Bank data isolation|recruiter\_bank\_details must have separate, restricted RLS. Only recruiter (own record) and admin can SELECT.|
|admin\_config protection|admin\_config must only be readable/writable by users with admin role. No recruiter or candidate access.|
|Billing webhooks|Billing lifecycle events (payment success, failure, subscription changes) must be handled via secure edge functions, not client calls.|
|Sensitive field masking|visa\_details, bank details, full card numbers must never appear in plain text in logs, diffs, or non-admin views.|
|Chat privacy|Personal phone numbers and emails must never be included in chat room metadata or messages automatically.|
|Password storage|Passwords managed by Supabase Auth. Never store plaintext passwords.|
|Audit immutability|audit\_logs must be INSERT-only via RPC. No UPDATE or DELETE allowed on audit records.|
|Token validation|All API calls must validate the authenticated session before processing. Reject unauthenticated requests.|

# **12. AUDIT LOGGING – REQUIRED EVENTS**

|**Event Code**|**Trigger**|**Logged Fields**|
| :- | :- | :- |
|registration\_created|New user registers|actor, role, timestamp|
|registration\_approved|Admin approves|admin\_id, candidate\_id, timestamp|
|registration\_rejected|Admin rejects|admin\_id, candidate\_id, reason, timestamp|
|intake\_submitted|Candidate submits intake|candidate\_id, submitted\_at|
|intake\_reopened|Admin reopens intake|admin\_id, candidate\_id, reason, timestamp|
|roles\_published|Admin publishes roles|admin\_id, candidate\_id, roles\_count, timestamp|
|roles\_responded|Candidate submits role responses|candidate\_id, response\_summary, timestamp|
|roles\_reopened|Admin reopens roles|admin\_id, candidate\_id, reason, timestamp|
|recruiter\_assigned|Admin assigns recruiter|admin\_id, recruiter\_id, candidate\_id, timestamp|
|recruiter\_unassigned|Admin removes recruiter|admin\_id, recruiter\_id, candidate\_id, timestamp|
|credential\_updated|Any role updates credentials|actor\_id, actor\_role, version\_number, changed\_fields, timestamp|
|payment\_recorded|Admin marks payment|admin\_id, candidate\_id, amount, timestamp|
|payment\_due\_date\_changed|Admin adjusts due date|admin\_id, candidate\_id, old\_date, new\_date, reason|
|billing\_status\_changed|Admin or webhook changes billing|actor, old\_status, new\_status, candidate\_id, timestamp|
|placement\_closed|Admin closes placement|admin\_id, candidate\_id, employer, role, salary, timestamp|
|bank\_details\_updated|Recruiter updates bank info|recruiter\_id, timestamp (no bank data in log)|
|password\_updated|User changes password|user\_id, timestamp|
|chat\_participant\_changed|Participant added or removed from chat room|actor\_id, participant\_id, room\_id, action, timestamp|
|status\_changed|Any status pipeline transition|actor\_id, candidate\_id, old\_status, new\_status, timestamp|


# **13. RECOMMENDED BUILD ORDER**

|**Phase**|**Module**|**Dependencies**|**Priority**|
| :- | :- | :- | :- |
|1|Roles + RLS + Permission Matrix|None|CRITICAL – must be first|
|2|Registration Forms + Validation|Phase 1|CRITICAL|
|3|Approval Gating + Pending Screen|Phase 2|CRITICAL|
|4|Email System (Resend)|Phase 2|HIGH|
|5|Dashboard Shell + Navigation|Phase 3|HIGH|
|6|Status Pipeline Engine|Phase 4|HIGH|
|7|Overview Page + Timeline|Phase 5, 6|HIGH|
|8|Intake Form + Submission Lock|Phase 6|HIGH|
|9|Roles Page + Candidate Response|Phase 8|HIGH|
|10|Credential Versioning System|Phase 9|HIGH|
|11|Recruiter Assignment System|Phase 3|MEDIUM|
|12|Daily Submission Logs + Job Links|Phase 11|MEDIUM|
|13|Applications Visibility (Candidate)|Phase 12|MEDIUM|
|14|Payments Page (Admin-controlled)|Phase 6|MEDIUM|
|15|Billing Page + Subscription Display|Phase 14|MEDIUM|
|16|Interview Logs Module|Phase 12|MEDIUM|
|17|Referral Module|Phase 5|MEDIUM|
|18|Settings + Password Change|Phase 5|MEDIUM|
|19|Internal Group Chat System|Phase 11|MEDIUM|
|20|Admin Dashboard + Audit Viewer|All prior phases|HIGH|
|21|Placement Closure Workflow|Phase 20|MEDIUM|
|22|Billing Webhooks (Edge Functions)|Phase 15|HIGH when billing goes live|
|23|Audit Log Viewer|Phase 20|MEDIUM|
|24|Admin Config Panel|Phase 20|MEDIUM|


# **14. EDGE CASES & HANDLING**

|**Edge Case**|**Correct Handling**|
| :- | :- |
|Candidate logs in before approval|Show pending approval screen only. No dashboard tabs visible.|
|Candidate approved but intake not submitted|Overview prominently shows incomplete intake CTA. Intake tab is accessible.|
|Candidate opens Roles tab before roles published|Show placeholder: 'Suggestions will appear here within 24–48 hours of intake review.'|
|Candidate opens Credentials too early|Show gated message with specific reason and required next step.|
|Admin reopens intake or roles|Show banner on that tab, create notification, audit log event.|
|Payment failed (billing webhook)|Show past\_due banner, update subscription status, restrict future-gated actions per policy.|
|Recruiter unassigned from candidate|Recruiter loses access to profile data and chat. Chat history preserved for audit.|
|Candidate has multiple recruiters (up to 4)|All shown on Assigned Team card. All appear in group chat. Applications show actor name.|
|Profile paused|Overview shows paused status. Edit actions disabled. Billing status noted.|
|Profile on hold|Same as paused – read-only with on\_hold messaging.|
|Profile cancelled|Read-only archive. Billing stopped. All edits blocked.|
|Profile placed|Success banner shown everywhere. All editing locked. Historical data read-only.|
|Job URL fetch fails|Do not block form submission. Allow manual entry. Mark fetch\_status = failed.|
|Candidate submits referral for already-registered email|Show error: 'This email is already registered in our system.'|
|Admin changes billing due date|Audit log required. Candidate notified. Old date stored.|
|Recruiter tries to access non-assigned profile|RLS blocks at DB level. Frontend should also not render the profile in their list.|

# **15. UI / UX REQUIREMENTS**

## **15.1 General Principles**
- Clean left sidebar navigation with branding at top
- Role-based tab visibility – never show tabs the user cannot access
- No dead-end screens – every locked section must explain why and what action unlocks it
- Every next step must be obvious – the candidate should never wonder what to do
- Mobile-responsive layout wherever possible
- Clear status color coding consistent throughout the application
- Activity timeline should feel guided, structured, and professional

## **15.2 Locked Tab Message Pattern**
Every locked section must follow this pattern:

- Icon: lock symbol or relevant illustration
- Headline: Short description of what this section is
- Reason message: Exact explanation of why it is locked
- Next action button: Specific CTA pointing to what they must do first

Example: Credentials tab locked message:

*"Credentials will unlock after you complete your role confirmation and the required payment step is completed. Go to Payments →"*

## **15.3 Admin Configurable UI Text**
- Review timeline text (e.g. '24–48 hours' – updatable without code change)
- Locked tab explanations
- Cal.com scheduling links (all 5 buttons)
- Help desk support URL
- Grace period duration


**END OF SPECIFICATION**

*HYRIND Portal – v4.0 – March 13, 2026*

**CONFIDENTIAL – For Internal Development Use Only**

|**Total Sections: 15**|**Total Build Phases: 24**|
| :-: | :-: |

CONFIDENTIAL – Internal Development Use Only   |   Page XXX
