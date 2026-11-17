import logging
from typing import Optional, List, Dict, Any
from django.utils import timezone
from ..matcher.normalize_company import normalize_company
from ..models import CompanyVisaHistory, EmployerContact, EmployerPlacement

logger = logging.getLogger(__name__)


def get_or_create_company(company_name: str) -> Optional[CompanyVisaHistory]:
    """
    Returns or creates the canonical CompanyVisaHistory record for a company name.
    Uses normalized company name as matching key.
    """
    if not company_name or not company_name.strip():
        return None

    raw_name = company_name.strip()
    norm_key = normalize_company(raw_name)
    if not norm_key:
        norm_key = raw_name.lower().replace(' ', '')

    company = CompanyVisaHistory.objects.filter(company_name_norm=norm_key).first()
    if not company:
        # Check alias
        from ..models import CompanyAlias
        alias = CompanyAlias.objects.filter(alias_norm=norm_key).first()
        if alias:
            company = CompanyVisaHistory.objects.filter(company_name_norm=alias.target_norm).first()

    if not company:
        company = CompanyVisaHistory.objects.create(
            company_name=raw_name,
            company_name_norm=norm_key,
            verification_status='UNVERIFIED',
            data_sources=['Hyrind Internal'],
        )
        logger.info(f"[EmployerDirectory] Created new canonical company record for '{raw_name}' ({norm_key})")

    return company


def sync_interview_contact(interview_log, user=None) -> Optional[EmployerContact]:
    """
    Extracts interviewer contact details from an InterviewLog and associates with canonical employer.
    Deduplicates contacts by (company, email_norm).
    """
    if not interview_log or not interview_log.company_name:
        return None

    company = get_or_create_company(interview_log.company_name)
    if not company:
        return None

    email = (interview_log.interviewer_email or '').strip()
    if not email:
        return None

    email_norm = email.lower()
    name = (interview_log.interviewer_name or '').strip() or 'Interviewer / HR'
    phone = (interview_log.interviewer_phone or '').strip() or None

    contact = EmployerContact.objects.filter(company=company, email_norm=email_norm).first()
    if contact:
        # Update missing fields without overwriting established values
        updated = False
        if not contact.phone_number and phone:
            contact.phone_number = phone
            updated = True
        if (contact.name == 'Interviewer / HR' or not contact.name) and name != 'Interviewer / HR':
            contact.name = name
            updated = True
        if updated:
            contact.save()
            logger.info(f"[EmployerDirectory] Updated existing contact '{email_norm}' for '{company.company_name}'")
    else:
        contact = EmployerContact.objects.create(
            company=company,
            name=name,
            email=email,
            email_norm=email_norm,
            role_designation='Interviewer / HR',
            phone_number=phone,
            source='interview_log',
            created_by=user or interview_log.submitted_by,
        )
        logger.info(f"[EmployerDirectory] Created employer contact '{email_norm}' from InterviewLog for '{company.company_name}'")

    return contact


def sync_case_closure_contacts(placement, user=None) -> List[EmployerContact]:
    """
    Enriches canonical CompanyVisaHistory and EmployerContact directory from a Case Closure.
    Associates HR contact, interviewer contact, and additional contacts entered during placement.
    """
    if not placement or not placement.company_name:
        return []

    company = get_or_create_company(placement.company_name)
    if not company:
        return []

    # 1. Update verification and sponsorship willingness
    changed_company = False
    ev_val = (placement.everified_employer or '').lower()
    if ev_val in ('yes', 'no'):
        company.everify_enrolled = (ev_val == 'yes')
        changed_company = True

    h1b_val = (placement.h1b_sponsorship_willing or '').lower()
    if h1b_val in ('yes', 'no', 'unknown'):
        company.h1b_sponsorship_willing = h1b_val
        company.h1b_sponsorship_source = 'Case Closure'
        changed_company = True

    # Populate canonical company HR contacts from placement closure
    if placement.hr_name and (not company.contact_name or company.contact_name == '—'):
        company.contact_name = placement.hr_name.strip()
        changed_company = True

    if placement.hr_email and (not company.contact_email or company.contact_email == '—'):
        company.contact_email = placement.hr_email.strip()
        changed_company = True

    if placement.hr_phone and (not company.contact_phone or company.contact_phone == '—'):
        company.contact_phone = placement.hr_phone.strip()
        changed_company = True

    # Confirmed placement means the employer is VERIFIED
    if company.verification_status != 'VERIFIED':
        company.verification_status = 'VERIFIED'
        changed_company = True

    if not company.industry:
        company.industry = 'Information Technology & Services'
        changed_company = True

    if not company.headquarters:
        cand_loc = None
        if hasattr(placement, 'candidate') and placement.candidate and placement.candidate.current_location:
            cand_loc = placement.candidate.current_location
        company.headquarters = cand_loc or 'United States'
        changed_company = True

    if not company.website and placement.hr_email and '@' in placement.hr_email:
        domain = placement.hr_email.split('@')[-1].lower().strip()
        if domain not in ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'):
            company.website = f"https://www.{domain}"
            changed_company = True

    if not company.notes and placement.placement_notes:
        company.notes = placement.placement_notes
        changed_company = True

    sources = list(company.data_sources or [])
    if 'Case Closure' not in sources:
        sources.append('Case Closure')
        company.data_sources = sources
        changed_company = True

    if changed_company:
        company.save()

    # 2. Increment placement count and link EmployerPlacement
    cand_name = "Placed Candidate"
    if hasattr(placement, 'candidate') and placement.candidate:
        if hasattr(placement.candidate, 'user') and placement.candidate.user:
            if hasattr(placement.candidate.user, 'profile') and placement.candidate.user.profile and placement.candidate.user.profile.full_name:
                cand_name = placement.candidate.user.profile.full_name
            else:
                cand_name = placement.candidate.user.email

    EmployerPlacement.objects.update_or_create(
        placement_closure=placement,
        defaults={
            'company': company,
            'candidate_name': cand_name,
            'role_title': placement.role_title,
            'offer_salary': placement.salary,
            'currency': placement.currency or 'USD',
            'start_date': placement.start_date,
            'hr_contact': placement.hr_email,
            'verification_status': 'VERIFIED',
            'offer_letter_url': placement.offer_letter_url or '',
            'notes': placement.placement_notes or '',
        }
    )
    company.placement_count = company.placements.count()
    company.save(update_fields=['placement_count'])

    saved_contacts = []

    # 3. Save HR Email
    if placement.hr_email and placement.hr_email.strip():
        hr_email = placement.hr_email.strip()
        hr_norm = hr_email.lower()
        hr_contact = EmployerContact.objects.filter(company=company, email_norm=hr_norm).first()
        hr_name = (placement.hr_name or '').strip() or 'HR Manager'
        hr_phone = (placement.hr_phone or '').strip() or None

        if hr_contact:
            if hr_phone and not hr_contact.phone_number:
                hr_contact.phone_number = hr_phone
            if hr_name != 'HR Manager' and (hr_contact.name == 'HR Manager' or not hr_contact.name):
                hr_contact.name = hr_name
            hr_contact.save()
            saved_contacts.append(hr_contact)
        else:
            c = EmployerContact.objects.create(
                company=company,
                name=hr_name,
                email=hr_email,
                email_norm=hr_norm,
                role_designation='HR Manager',
                phone_number=hr_phone,
                source='case_closure',
                created_by=user or placement.closed_by,
            )
            saved_contacts.append(c)

    # 4. Save Interviewer Email if present
    if placement.interviewer_email and placement.interviewer_email.strip():
        int_email = placement.interviewer_email.strip()
        int_norm = int_email.lower()
        int_contact = EmployerContact.objects.filter(company=company, email_norm=int_norm).first()
        if not int_contact:
            c = EmployerContact.objects.create(
                company=company,
                name='Interviewer',
                email=int_email,
                email_norm=int_norm,
                role_designation='Interviewer',
                source='case_closure',
                created_by=user or placement.closed_by,
            )
            saved_contacts.append(c)

    # 5. Save Additional Contacts
    raw_contacts = placement.additional_contacts or []
    if isinstance(raw_contacts, list):
        for item in raw_contacts:
            if not isinstance(item, dict):
                continue
            c_email = (item.get('email') or '').strip()
            if not c_email:
                continue
            c_norm = c_email.lower()
            c_name = (item.get('name') or '').strip() or 'Contact'
            c_role = (item.get('role') or item.get('role_designation') or '').strip() or 'HR / Recruiter'
            c_phone = (item.get('phone') or item.get('phone_number') or '').strip() or None

            existing = EmployerContact.objects.filter(company=company, email_norm=c_norm).first()
            if existing:
                if c_phone and not existing.phone_number:
                    existing.phone_number = c_phone
                if c_name and existing.name == 'Contact':
                    existing.name = c_name
                if c_role and existing.role_designation == 'HR / Recruiter':
                    existing.role_designation = c_role
                existing.save()
                saved_contacts.append(existing)
            else:
                c = EmployerContact.objects.create(
                    company=company,
                    name=c_name,
                    email=c_email,
                    email_norm=c_norm,
                    role_designation=c_role,
                    phone_number=c_phone,
                    source='case_closure',
                    created_by=user or placement.closed_by,
                )
                saved_contacts.append(c)

    logger.info(f"[EmployerDirectory] Synced {len(saved_contacts)} contacts for '{company.company_name}' from PlacementClosure")
    return saved_contacts


def sync_all_case_closures() -> int:
    """
    Syncs all existing PlacementClosure records to CompanyVisaHistory, EmployerPlacement, and EmployerContact.
    """
    from candidates.models import PlacementClosure
    synced = 0
    for placement in PlacementClosure.objects.select_related('candidate', 'candidate__user').all():
        try:
            sync_case_closure_contacts(placement)
            synced += 1
        except Exception as err:
            logger.error(f"[EmployerDirectory] Error syncing placement {placement.id}: {err}", exc_info=True)
    logger.info(f"[EmployerDirectory] Successfully verified/synced {synced} case closures.")
    return synced

