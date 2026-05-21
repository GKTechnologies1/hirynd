# Graph Report - hirynd  (2026-05-20)

## Corpus Check
- 267 files · ~206,254 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 992 nodes · 2421 edges · 40 communities detected
- Extraction: 37% EXTRACTED · 63% INFERRED · 0% AMBIGUOUS · INFERRED: 1520 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 107|Community 107]]

## God Nodes (most connected - your core abstractions)
1. `Candidate` - 90 edges
2. `toast()` - 84 edges
3. `User` - 75 edges
4. `Payment` - 53 edges
5. `DailySubmissionLog` - 43 edges
6. `UserListSerializer` - 43 edges
7. `InterestedCandidate` - 41 edges
8. `PaymentSerializer` - 39 edges
9. `ClientIntake` - 38 edges
10. `RoleSuggestion` - 38 edges

## Surprising Connections (you probably didn't know these)
- `log_action()` --calls--> `unassign_recruiter()`  [INFERRED]
  django_backend\audit\utils.py → django_backend\recruiters\views.py
- `SubscriptionPlanSerializer` --calls--> `list_plans()`  [INFERRED]
  django_backend\billing\serializers.py → django_backend\billing\views.py
- `SubscriptionPlanSerializer` --calls--> `manage_plan()`  [INFERRED]
  django_backend\billing\serializers.py → django_backend\billing\views.py
- `SubscriptionAddonSerializer` --calls--> `list_addons()`  [INFERRED]
  django_backend\billing\serializers.py → django_backend\billing\views.py
- `SubscriptionAddonSerializer` --calls--> `manage_addon()`  [INFERRED]
  django_backend\billing\serializers.py → django_backend\billing\views.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (104): fetchPending(), handleAction(), handleBlock(), fetchData(), handleAssign(), handleStartMarketing(), handleUnassign(), handleConfirmExecute() (+96 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (51): CandidateAdmin, CandidateLegacyPaymentAdmin, ClientIntakeAdmin, ClientIntakeInline, CredentialVersionAdmin, InterestedCandidateAdmin, InterviewLogAdmin, PlacementClosureAdmin (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (43): UploadedFile, DailySubmissionLogAdmin, JobLinkEntryAdmin, JobLinkEntryInline, RecruiterAssignmentAdmin, RecruiterBankDetailsAdmin, RecruiterProfileAdmin, TeamLeadAssignmentAdmin (+35 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (64): log_action(), ensure_default_subscription(), _ensure_fonts(), generate_invoice_pdf(), _get_logo(), add_addon_to_subscription(), admin_ledger_report(), all_payments() (+56 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (39): AbstractBaseUser, AuditLogAdmin, AuditLog, Meta, AuditLogSerializer, Meta, candidate_audit_logs(), global_audit_logs() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (43): BasePermission, InvoiceAdmin, PaymentAdmin, RazorpayOrderAdmin, SubscriptionAddonAdmin, SubscriptionAddonAssignmentAdmin, SubscriptionAdmin, SubscriptionPlanAdmin (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (4): Flat serialiser — frontend gets full_name/phone directly without nested profile, UserListSerializer, all_users(), pending_approvals()

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (19): CandidateSubmissionAdmin, CandidateSubmissionInline, JobOpeningAdmin, CandidateSubmission, JobOpening, Meta, CandidateSubmissionSerializer, JobOpeningSerializer (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (19): ChatMessageAdmin, ChatRoomAdmin, ChatRoomParticipantAdmin, MessageInline, ParticipantInline, ChatMessage, ChatRoom, ChatRoomParticipant (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (13): EmailLogAdmin, NotificationAdmin, EmailLog, Meta, Notification, EmailLogSerializer, Meta, NotificationSerializer (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (5): closeLoginDropdown(), closeProfileDropdown(), closeServicesDropdown(), handleClickOutside(), handleLogout()

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (1): Migration

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (8): custom_404(), custom_500(), landing_page(), Premium developer landing page for the Hyrind backend API., Industry standard media server for development/staging.     Ensures that missin, Industry standard 404 handler.     Returns JSON for all paths., Industry standard 500 handler.     Returns JSON for all paths., serve_media()

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (1): Migration

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (5): ProtectedRoute(), useToast(), useAuth(), RecruiterProfilePage(), Toaster()

### Community 16 - "Community 16"
Cohesion: 0.42
Nodes (8): btn(), buildEmail(), getAdminConfigFlag(), getAdminEmails(), getSiteUrl(), handler(), logEmail(), wrap()

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (5): UploadedFileAdmin, Meta, get_download_url(), _get_s3_client(), upload_file()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (2): handleSubmit(), validate()

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (3): BaseCommand, Command, Command

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (2): onFocus(), fetchData()

### Community 23 - "Community 23"
Cohesion: 0.7
Nodes (4): getAdminEmails(), getSiteUrl(), handler(), logEmail()

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Migration

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Migration

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Migration

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Migration

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Migration

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Migration

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Migration

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Migration

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Migration

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Migration

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Migration

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Migration

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Migration

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Migration

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Migration

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Migration

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Migration

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Delegates to the user's branded display ID (e.g. HYRCDT000001)

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Branded display ID: HYRCDT000001 (candidates), HYRREC000001 (recruiters), etc.

## Knowledge Gaps
- **25 isolated node(s):** `Migration`, `Migration`, `Delegates to the user's branded display ID (e.g. HYRCDT000001)`, `Branded display ID: HYRLD0001`, `Migration` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (10 nodes): `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `0001_initial.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (9 nodes): `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `0002_initial.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (8 nodes): `FormField()`, `handleChange()`, `handleSubmit()`, `init()`, `SectionHeader()`, `toggleSection()`, `validate()`, `CandidateIntakePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (7 nodes): `handleClick()`, `if()`, `onFocus()`, `switch()`, `fetchData()`, `CandidateDashboard.tsx`, `DailyLogPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `0003_subscriptionaddonassignment_amount_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `0004_alter_invoice_subscription.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `0003_alter_roleconfirmation_suggestion.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `0004_create_interestedcandidate.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `0004_rename_payment_candidatelegacypayment.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `0005_merge_20260408_0110.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `0006_candidate_resume_file_candidate_services_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `0007_alter_candidate_status.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `0008_interestedcandidate_degree_interestedcandidate_major.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `0009_workexperience_certification.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `0010_candidate_bachelors_graduation_date_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `0011_interestedcandidate_seq_number.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `0003_recruiterprofile_degree.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `0004_recruiterprofile_bank_passbook_id_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `0005_expand_application_status_choices.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `0006_dailysubmissionlog_is_manual.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `0002_profile_city_profile_country_profile_degree_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Delegates to the user's branded display ID (e.g. HYRCDT000001)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Branded display ID: HYRCDT000001 (candidates), HYRREC000001 (recruiters), etc.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 4` to `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `Candidate` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `UserListSerializer` connect `Community 6` to `Community 1`, `Community 2`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 88 inferred relationships involving `Candidate` (e.g. with `SubscriptionPlan` and `Meta`) actually correct?**
  _`Candidate` has 88 INFERRED edges - model-reasoned connections that need verification._
- **Are the 81 inferred relationships involving `toast()` (e.g. with `handleAssign()` and `handleUnassign()`) actually correct?**
  _`toast()` has 81 INFERRED edges - model-reasoned connections that need verification._
- **Are the 70 inferred relationships involving `User` (e.g. with `Command` and `AuditLog`) actually correct?**
  _`User` has 70 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `Payment` (e.g. with `SubscriptionPlanAdmin` and `SubscriptionAddonAdmin`) actually correct?**
  _`Payment` has 51 INFERRED edges - model-reasoned connections that need verification._