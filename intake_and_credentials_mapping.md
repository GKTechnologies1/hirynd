# Intake and Credentials Fields Coverage & Mapping

This document provides a comprehensive mapping of every field specified in both sheets of `Client and credentia Intake sheet fields.xlsx` (tabs: **Client** and **Credential**) to the corresponding frontend React components in the workspace.

Both pages cover **100%** of the required fields.

---

## 1. Sheet: "Client" -> `CandidateIntakePage.tsx`

| Excel Column Title / Field | Type | Mandatory? | Component Field / State Mapping | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **Timestamp** | Metadata | Mandatory | `formData.timestamp` (Automatic) | ✅ Covered |
| **First Name** | Text Field | Mandatory | `formData.firstName` | ✅ Covered |
| **Last Name** | Text Field | Mandatory | `formData.lastName` | ✅ Covered |
| **Date of Birth** | Date picker | Mandatory | `formData.dob` | ✅ Covered |
| **Phone Number** | Field with Country Code | Mandatory | `formData.phoneNumber` | ✅ Covered |
| **Email Address** | Text Field | Mandatory | `formData.email` | ✅ Covered |
| **New E-mail for Marketing** | Text Field | Non-mandatory | `formData.marketingEmail` | ✅ Covered |
| **Contact number for Marketing** | Field with Country Code | Non-mandatory | `formData.marketingPhone` | ✅ Covered |
| **Current Address** | Text Field | Mandatory | `formData.currentAddress` | ✅ Covered |
| **Mailing Address:** | Text Field | Mandatory | `formData.mailingAddress` | ✅ Covered |
| **Current Visa Status** | Dropdown (`F1-OPT`, `H1B`, etc.) | Mandatory | `formData.visaStatus` | ✅ Covered |
| **First Entry into the U.S. (DD/MM/YYYY)** | Date picker | Mandatory | `formData.firstEntryUS` | ✅ Covered |
| **Total Years in the U.S.** | Text Field / Number | Mandatory | `formData.totalYearsUS` | ✅ Covered |
| **Skilled In (Skills list)** | Text Area | Mandatory | `formData.skilledIn` | ✅ Covered |
| **Currently Learning / Recently Learned** | Text Area | Mandatory | `formData.recentlyLearned` | ✅ Covered |
| **Experienced With (Tools list)** | Text Area | Mandatory | `formData.experiencedWith` | ✅ Covered |
| **Learning Now / Self-Taught Tools** | Text Area | Mandatory | `formData.learningNow` | ✅ Covered |
| **Other Non Technical Skills / Courses** | Text Area | Mandatory | `formData.otherNonTech` | ✅ Covered |
| **Work Experience (U.S. and/or International)** | Radio Buttons (`yes`/`no`) | Mandatory | `formData.hasWorkExp` | ✅ Covered |
| **Job Title** (Job 1) | Text Field | Non-mandatory | `formData.job1_title` | ✅ Covered |
| **Company Name:** (Job 1) | Text Field | Non-mandatory | `formData.job1_company` | ✅ Covered |
| **Company Address** (Job 1) | Text Field | Non-mandatory | `formData.job1_address` | ✅ Covered |
| **Start Date** (Job 1) | Date picker | Non-mandatory | `formData.job1_start` | ✅ Covered |
| **End Date** (Job 1) | Date picker | Non-mandatory | `formData.job1_end` | ✅ Covered |
| **Job Type** (Job 1) | Dropdown | Non-mandatory | `formData.job1_type` | ✅ Covered |
| **Key Responsibilities / Projects** (Job 1) | Text Area | Non-mandatory | `formData.job1_resp` | ✅ Covered |
| **Did you work anywhere else..?** (Job 1) | Radio Buttons (`yes`/`no`) | Mandatory | `formData.hasMoreWork1` | ✅ Covered |
| **Job Title** (Job 2) | Text Field | Non-mandatory | `formData.job2_title` | ✅ Covered |
| **Company Name:** (Job 2) | Text Field | Non-mandatory | `formData.job2_company` | ✅ Covered |
| **Company Address** (Job 2) | Text Field | Non-mandatory | `formData.job2_address` | ✅ Covered |
| **Start Date** (Job 2) | Date picker | Non-mandatory | `formData.job2_start` | ✅ Covered |
| **End Date** (Job 2) | Date picker | Non-mandatory | `formData.job2_end` | ✅ Covered |
| **Job Type** (Job 2) | Dropdown | Non-mandatory | `formData.job2_type` | ✅ Covered |
| **Key Responsibilities / Projects** (Job 2) | Text Area | Non-mandatory | `formData.job2_resp` | ✅ Covered |
| **Did you work anywhere else..?** (Job 2) | Radio Buttons (`yes`/`no`) | Mandatory | `formData.hasMoreWork2` | ✅ Covered |
| **Job Title** (Job 3) | Text Field | Non-mandatory | `formData.job3_title` | ✅ Covered |
| **Company Name:** (Job 3) | Text Field | Non-mandatory | `formData.job3_company` | ✅ Covered |
| **Company Address** (Job 3) | Text Field | Non-mandatory | `formData.job3_address` | ✅ Covered |
| **Start Date** (Job 3) | Date picker | Non-mandatory | `formData.job3_start` | ✅ Covered |
| **End Date** (Job 3) | Date picker | Non-mandatory | `formData.job3_end` | ✅ Covered |
| **Job Type** (Job 3) | Dropdown | Non-mandatory | `formData.job3_type` | ✅ Covered |
| **Key Responsibilities / Projects** (Job 3) | Text Area | Non-mandatory | `formData.job3_resp` | ✅ Covered |
| **Highest Degree:** | Text Field | Mandatory | `formData.highestDegree` | ✅ Covered |
| **Field of Study** (Highest Degree) | Text Field | Mandatory | `formData.mastersField` | ✅ Covered |
| **University/Institution Name** (Highest) | Text Field | Mandatory | `formData.mastersUni` | ✅ Covered |
| **Country** (Highest) | Text Field | Mandatory | `formData.mastersCountry` | ✅ Covered |
| **Graduation Month & Year:** (Highest) | Text Field | Mandatory | `formData.mastersGradDate` | ✅ Covered |
| **LinkedIn profile link:** | Text Field | Mandatory | `formData.linkedinLink` | ✅ Covered |
| **Bachelors Degree:** | Text Field | Mandatory | `formData.bachelorsDegree` | ✅ Covered |
| **Field of Study** (Bachelors) | Text Field | Mandatory | `formData.bachelorsField` | ✅ Covered |
| **University/Institution Name** (Bachelors) | Text Field | Mandatory | `formData.bachelorsUni` | ✅ Covered |
| **Country** (Bachelors) | Text Field | Mandatory | `formData.bachelorsCountry` | ✅ Covered |
| **Graduation Month & Year:** (Bachelors) | Text Field | Mandatory | `formData.bachelorsGradDate` | ✅ Covered |
| **Have you completed professional certs?** | Radio Buttons (`yes`/`no`) | Mandatory | `formData.hasCerts` | ✅ Covered |
| **Certification Name:** | Text Field | Conditional | `formData.certName` | ✅ Covered |
| **Issuing Organization:** | Text Field | Conditional | `formData.certOrg` | ✅ Covered |
| **Issued Date** | Date picker | Conditional | `formData.certDate` | ✅ Covered |
| **Upload Any Documents** | File Upload | Non-mandatory | `formData.docUpload` | ✅ Covered |
| **Please upload Passport** | File Upload | Mandatory | `formData.passportUpload` | ✅ Covered |
| **Please upload Government ID** | File Upload | Mandatory | `formData.govIdUpload` | ✅ Covered |
| **Please upload Visa** | File Upload | Mandatory | `formData.visaUpload` | ✅ Covered |
| **Please upload Work Auth Proof** | File Upload | Mandatory | `formData.workAuthUpload` | ✅ Covered |
| **Desired Job Role / Roles** | Text Field | Mandatory | `formData.desiredRole` | ✅ Covered |
| **Desired years of experience..?** | Number Field | Mandatory | `formData.desiredExpYears` | ✅ Covered |
| **Please upload original resume** | File Upload | Mandatory | `formData.resumeUpload` | ✅ Covered |

---

## 2. Sheet: "Credential" -> `CandidateCredentialsPage.tsx`

| Excel Column Title / Field | Type | Mandatory? | Component Field / State Mapping | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **Timestamp** | Metadata | Mandatory | `formData.timestamp` (Automatic) | ✅ Covered |
| **Email Address** | Text Field | Mandatory | `formData.email` | ✅ Covered |
| **Bachelors Graduation Date** | Date picker | Mandatory | `formData.bachelors_grad_date` | ✅ Covered |
| **First Entry into the U.S.** | Date picker | Mandatory | `formData.first_entry_us` | ✅ Covered |
| **Masters Graduation Date** | Date picker | Mandatory | `formData.masters_grad_date` | ✅ Covered |
| **Opt Start date..?** | Date picker | Mandatory | `formData.opt_start_date` | ✅ Covered |
| **Opt offer letter submitted** | Dropdown / Select | Mandatory | `formData.opt_offer_submitted` | ✅ Covered |
| **Please upload the Offer letter submitted**| File Upload | Mandatory | `formData.offer_letter_file` | ✅ Covered |
| **Preferred Job Roles for marketing** | Text Field | Mandatory | `formData.preferred_roles` | ✅ Covered |
| **Preferred Location(s)** | Text Field | Mandatory | `formData.preferred_locations` | ✅ Covered |
| **Full Name** | Text Field | Mandatory | `formData.full_name` | ✅ Covered |
| **Personal Email Address** | Text Field | Mandatory | `formData.personal_email` | ✅ Covered |
| **Phone Number** | Field with Country Code | Mandatory | `formData.phone_number` | ✅ Covered |
| **Location (City, State)** | Text Field | Mandatory | `formData.location` | ✅ Covered |
| **LinkedIn Profile Login ID** | Text Field | Mandatory | `formData.linkedin_id` | ✅ Covered |
| **Linkedin Password** | Password Field | Mandatory | `formData.linkedin_pass` | ✅ Covered |
| **Indeed Login ID** | Text Field | Mandatory | `formData.indeed_id` | ✅ Covered |
| **Indeed Password** | Password Field | Mandatory | `formData.indeed_pass` | ✅ Covered |
| **Dice Login ID** | Text Field | Mandatory | `formData.dice_id` | ✅ Covered |
| **Dice Password** | Password Field | Mandatory | `formData.dice_pass` | ✅ Covered |
| **Monster Login ID** | Text Field | Mandatory | `formData.monster_id` | ✅ Covered |
| **Monster Password** | Password Field | Mandatory | `formData.monster_pass` | ✅ Covered |
| **ZipRecruiter Login ID** | Text Field | Mandatory | `formData.ziprecruiter_id` | ✅ Covered |
| **ZipRecruiter Password** | Password Field | Mandatory | `formData.ziprecruiter_pass` | ✅ Covered |
| **Mention all other Job Platform accounts** | Text Area | Mandatory | `formData.other_platforms` | ✅ Covered |
