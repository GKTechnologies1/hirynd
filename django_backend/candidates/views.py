from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db.models import Q
from datetime import datetime

from django.conf import settings
from users.permissions import IsAdmin, IsApproved, IsRecruiter, IsCandidate
from audit.utils import log_action
from notifications.utils import send_email, get_styled_email_html, create_notification
from .models import (
    Candidate, ClientIntake, RoleSuggestion, RoleConfirmation, CredentialVersion,
    Referral, InterviewLog, PlacementClosure, CandidateLegacyPayment, InterestedCandidate,
    WorkExperience, Certification,
)
from billing.models import Payment
from .serializers import (
    CandidateSerializer, CandidateListSerializer, ClientIntakeSerializer,
    RoleSuggestionSerializer, CredentialVersionSerializer,
    ReferralSerializer, InterviewLogSerializer, PlacementClosureSerializer,
    PaymentSerializer, InterestedCandidateSerializer, RoleConfirmationSerializer,
)
from billing.utils import ensure_default_subscription


# ─── Candidate CRUD ───

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_me(request):
    """Return the Candidate record for the logged-in user, creating it lazily if needed."""
    if request.user.role != 'candidate':
        return Response({'error': 'Not a candidate user'}, status=status.HTTP_403_FORBIDDEN)
    candidate, created = Candidate.objects.get_or_create(
        user=request.user,
        defaults={'status': 'approved'},
    )
    if not created and candidate.status == 'pending_approval':
        candidate.status = 'approved'
        candidate.save(update_fields=['status'])
    return Response(CandidateSerializer(candidate).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_list(request):
    if request.user.role in ('admin', 'team_lead', 'team_manager'):
        qs = Candidate.objects.select_related('user__profile').all()
    elif request.user.role in ('recruiter',):
        assigned_ids = request.user.recruiter_assignments.filter(
            is_active=True
        ).values_list('candidate_id', flat=True)
        qs = Candidate.objects.filter(id__in=assigned_ids).select_related('user__profile')
    else:
        qs = Candidate.objects.filter(user=request.user).select_related('user__profile')

    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(user__email__icontains=search) |
            Q(user__profile__full_name__icontains=search)
        )

    qs = qs.order_by('-created_at')
    total = qs.count()
    page = int(request.query_params.get('page', 0))
    page_size = int(request.query_params.get('page_size', 0))
    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        data = CandidateListSerializer(qs[start:start + page_size], many=True).data
        return Response({'total': total, 'results': data})

    return Response(CandidateListSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_detail(request, candidate_id):
    try:
        try:
            candidate = Candidate.objects.select_related('user__profile').get(id=candidate_id)
        except (Candidate.DoesNotExist, ValueError, ValidationError):
            # Fallback for when a User ID is passed instead of Candidate ID
            candidate = Candidate.objects.select_related('user__profile').get(user_id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(CandidateSerializer(candidate).data)


@api_view(['GET'])
@permission_classes([IsRecruiter])
def interested_candidate_list(request):
    qs = InterestedCandidate.objects.all().order_by('-created_at')
    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(email__icontains=search) |
            Q(university__icontains=search) |
            Q(referral_source__icontains=search)
        )
    return Response(InterestedCandidateSerializer(qs, many=True).data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsRecruiter])
def interested_candidate_detail(request, lead_id):
    try:
        lead = InterestedCandidate.objects.get(id=lead_id)
    except InterestedCandidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = InterestedCandidateSerializer(lead, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(InterestedCandidateSerializer(lead).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def update_candidate_status(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    old_status = candidate.status
    candidate.status = new_status
    candidate.save()

    log_action(request.user, 'status_change', str(candidate.id), 'candidate',
               {'old': old_status, 'new': new_status})

    # ── Email: Roles Published to Candidate ──
    if new_status == 'roles_published' and old_status != 'roles_published':
        cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else candidate.user.email
        try:
            send_email(
                to=candidate.user.email,
                subject='Roles Published for Your Review – Hyrind',
                html=get_styled_email_html(
                    cand_name,
                    '<p>Great news! Your team has reviewed your profile and published suggested roles for your marketing.</p>'
                    '<p>Please log in to review the suggested roles and confirm your selections.</p>',
                    action_label="Review Roles",
                    action_url="/candidate-dashboard"
                ),
            )
            create_notification(
                candidate.user,
                'Roles Published',
                'Your suggested roles are ready for review. Please confirm your selections.',
                link='/candidate-dashboard'
            )
        except Exception:
            pass

    return Response({'message': f'Status updated to {new_status}'})


# ─── Intake ───

def validate_intake_data(data):
    """Validate intake form data — aligned with CandidateIntakePage.tsx field names."""
    errors = {}

    # Required personal fields (frontend sends camelCase-mapped to snake_case)
    required_personal = [
        'first_name', 'last_name', 'dob', 'phone_number', 'email',
        'current_address', 'visa_status', 'first_entry_us', 'total_years_us',
    ]
    for field in required_personal:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"

    # Required skills fields
    required_skills = ['skilled_in', 'recently_learned', 'experienced_with', 'learning_now']
    for field in required_skills:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"

    # Required education fields
    required_education = [
        'highest_degree', 'masters_field', 'masters_uni', 'masters_grad_date',
        'bachelors_degree', 'bachelors_field', 'bachelors_uni', 'bachelors_grad_date',
    ]
    for field in required_education:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"

    # Required preferences
    required_prefs = ['desired_role', 'desired_exp_years']
    for field in required_prefs:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"

    # File URL validation (files must have been pre-uploaded)
    document_url_fields = ['resume_url', 'passport_url', 'gov_id_url', 'visa_url', 'work_auth_url']
    for url_field in document_url_fields:
        if data.get(url_field):
            try:
                URLValidator()(data[url_field])
            except ValidationError:
                errors[url_field] = f"Invalid URL format for {url_field}"

    # Date format validation (ISO 8601: YYYY-MM-DD is preferred)
    # Graduation date fields accept flexible human-readable formats
    # (e.g. "May 2024", "12/2021", "2021", "December 2021", "05-2024")
    grad_date_fields = {'masters_grad_date', 'bachelors_grad_date'}
    date_fields = ['dob', 'first_entry_us', 'masters_grad_date', 'bachelors_grad_date']
    for date_field in date_fields:
        if data.get(date_field):
            raw = str(data[date_field]).strip()
            parsed_date = None

            # 1. Try standard full-date formats
            for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                try:
                    parsed_date = datetime.strptime(raw, fmt)
                    break
                except (ValueError, TypeError):
                    continue

            # 2. For graduation fields, try additional flexible formats
            if parsed_date is None and date_field in grad_date_fields:
                # Month+Year combos: "May 2024", "December 2021", "05/2024", "05-2024", "May-2024"
                month_year_formats = [
                    '%B %Y',    # "May 2024", "December 2021"
                    '%b %Y',    # "May 2024" (abbreviated)
                    '%m/%Y',    # "05/2024"
                    '%m-%Y',    # "05-2024"
                    '%B-%Y',    # "May-2024"
                    '%b-%Y',    # "May-2024" (abbreviated)
                    '%Y/%m',    # "2024/05"
                ]
                for fmt in month_year_formats:
                    try:
                        parsed_date = datetime.strptime(raw, fmt)
                        break
                    except (ValueError, TypeError):
                        continue

                # Year-only: "2021"
                if parsed_date is None and raw.isdigit() and 1900 <= int(raw) <= 2100:
                    parsed_date = datetime(int(raw), 1, 1)

                # Last resort: try general date parsing
                if parsed_date is None:
                    try:
                        from dateutil import parser as dateutil_parser
                        parsed_date = dateutil_parser.parse(raw, dayfirst=False)
                    except Exception:
                        pass

            if parsed_date:
                # Normalize to YYYY-MM-DD so downstream date parsing works
                data[date_field] = parsed_date.strftime('%Y-%m-%d')
            else:
                if date_field in grad_date_fields:
                    errors[date_field] = f"{date_field} must be a valid date (e.g. May 2024, 2021, or MM-DD-YYYY)"
                else:
                    errors[date_field] = f"{date_field} must be a valid date (YYYY-MM-DD)"

    # Phone validation
    if data.get('phone_number'):
        phone = str(data['phone_number']).replace('-', '').replace(' ', '').replace('+', '')
        if not phone.isdigit() or len(phone) < 6:
            errors['phone_number'] = "Invalid phone number format"

    # Certifications validation if enabled
    if data.get('has_certs') == 'yes':
        certs = data.get('certifications')
        if not certs or not isinstance(certs, list):
            errors['certifications'] = "Please add at least one certification entry"
        else:
            cert_errors = []
            for index, cert in enumerate(certs):
                single_errors = {}
                if not cert.get('name'):
                    single_errors['name'] = "Certification name is required"
                if not cert.get('organization'):
                    single_errors['organization'] = "Issuing organization is required"
                
                # Validate issued_date
                issued_date = cert.get('issued_date')
                if not issued_date:
                    single_errors['issued_date'] = "Issued date is required"
                else:
                    raw = str(issued_date).strip()
                    parsed_issued = None
                    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                        try:
                            parsed_issued = datetime.strptime(raw, fmt)
                            break
                        except (ValueError, TypeError):
                            continue
                    if parsed_issued:
                        cert['issued_date'] = parsed_issued.strftime('%Y-%m-%d')
                    else:
                        single_errors['issued_date'] = "Must be a valid date"

                # Validate expires_date (if present)
                expires_date = cert.get('expires_date')
                if expires_date:
                    raw = str(expires_date).strip()
                    parsed_expires = None
                    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                        try:
                            parsed_expires = datetime.strptime(raw, fmt)
                            break
                        except (ValueError, TypeError):
                            continue
                    if parsed_expires:
                        cert['expires_date'] = parsed_expires.strftime('%Y-%m-%d')
                    else:
                        single_errors['expires_date'] = "Must be a valid date"

                # Validate credential_url (if present)
                cred_url = cert.get('credential_url')
                if cred_url:
                    try:
                        URLValidator()(cred_url)
                    except ValidationError:
                        single_errors['credential_url'] = "Invalid URL format"

                if single_errors:
                    cert_errors.append({'index': index, 'errors': single_errors})
            
            if cert_errors:
                errors['certifications'] = cert_errors

    return errors


@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def intake(request, candidate_id):
    try:
        candidate = Candidate.objects.select_related('user__profile').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        try:
            intake = ClientIntake.objects.get(candidate=candidate)
            return Response(ClientIntakeSerializer(intake).data)
        except ClientIntake.DoesNotExist:
            # Fallback: Pre-populate from Candidate + User Profile for initial form load
            initial_data = {
                'full_name': candidate.user.profile.full_name,
                'phone': candidate.user.profile.phone,
                'email': candidate.user.email,
                'university': candidate.university,
                'major': candidate.major,
                'degree': candidate.degree,
                'graduation_year': candidate.graduation_year or (str(candidate.graduation_date.year) if candidate.graduation_date else ""),
                'visa_status': candidate.visa_status,
                'linkedin_url': candidate.linkedin_url,
                'portfolio_url': candidate.portfolio_url,
                'current_location': candidate.current_location,
                'notes': candidate.notes,
            }
            return Response({'candidate': str(candidate_id), 'data': initial_data, 'is_locked': False})

    # Check lock
    try:
        existing = ClientIntake.objects.get(candidate=candidate)
        if existing.is_locked:
            return Response({'error': 'Intake is locked. Contact admin to reopen.'}, status=status.HTTP_403_FORBIDDEN)
    except ClientIntake.DoesNotExist:
        pass

    # Accept both { data: {...} } (legacy) and flat field submission
    payload = request.data.get('data') if 'data' in request.data else request.data

    # Validate intake data
    validation_errors = validate_intake_data(payload)
    if validation_errors:
        return Response({
            'error': 'Validation failed',
            'validation_errors': validation_errors
        }, status=status.HTTP_400_BAD_REQUEST)

    intake, created = ClientIntake.objects.update_or_create(
        candidate=candidate,
        defaults={'data': payload, 'submitted_at': timezone.now(), 'is_locked': True},
    )

    # Candidate registration details are kept pristine and are not mutated by intake sheet submissions.

    # ── Work experiences (sent as experiences array) ──
    if payload.get('experiences') and isinstance(payload['experiences'], list):
        WorkExperience.objects.filter(candidate=candidate).delete()
        for exp in payload['experiences']:
            try:
                s_date = None
                for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                    try:
                        s_date = datetime.strptime(str(exp.get('start_date', '')), fmt).date()
                        break
                    except Exception:
                        continue

                e_date = None
                if exp.get('end_date'):
                    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                        try:
                            e_date = datetime.strptime(str(exp.get('end_date', '')), fmt).date()
                            break
                        except Exception:
                            continue

                # Map frontend job_type values to model choices
                jt_map = {
                    'Full-time': 'full_time', 'Part-time': 'part_time',
                    'Internship': 'freelance', 'Contract': 'contract',
                    'C2C': 'c2c',
                }
                job_type = jt_map.get(exp.get('job_type', ''), 'full_time')

                if s_date:  # start_date is required by model
                    WorkExperience.objects.create(
                        candidate=candidate,
                        job_title=exp.get('job_title', ''),
                        company_name=exp.get('company_name', ''),
                        company_address=exp.get('company_address', ''),
                        start_date=s_date,
                        end_date=e_date,
                        job_type=job_type,
                        responsibilities=exp.get('responsibilities', ''),
                    )
            except Exception as e:
                print(f"Error saving work experience: {e}")

    # ── Certifications (sent as certifications array) ──
    if payload.get('certifications') and isinstance(payload['certifications'], list):
        Certification.objects.filter(candidate=candidate).delete()
        for cert in payload['certifications']:
            try:
                i_date = None
                for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                    try:
                        i_date = datetime.strptime(str(cert.get('issued_date', '')), fmt).date()
                        break
                    except Exception:
                        continue

                e_date = None
                if cert.get('expires_date'):
                    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                        try:
                            e_date = datetime.strptime(str(cert.get('expires_date', '')), fmt).date()
                            break
                        except Exception:
                            continue

                if i_date:
                    Certification.objects.create(
                        candidate=candidate,
                        name=cert.get('name', ''),
                        organization=cert.get('organization', ''),
                        issued_date=i_date,
                        expires_date=e_date,
                        credential_url=cert.get('credential_url', ''),
                    )
            except Exception as e:
                print(f"Error saving certification: {e}")
    
    if candidate.status in ('approved', 'intake_pending', 'lead'):
        candidate.status = 'intake_submitted'
    
    candidate.save()
    log_action(request.user, 'intake_submitted', str(candidate.id), 'candidate', {})

    # ── Email: Intake Submitted ──
    cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else candidate.user.email
    try:
        send_email(
            to=candidate.user.email,
            subject='Intake Form Submitted Successfully – Hyrind',
            html=get_styled_email_html(
                cand_name,
                '<p>Your intake form has been submitted and locked successfully.</p>'
                '<p>Our team will now review your profile and suggest relevant roles for your marketing.</p>'
                '<p>You will receive a notification once roles are published for your review.</p>',
                action_label="View Dashboard",
                action_url="/candidate-dashboard"
            ),
        )
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'hyrind.operations@gmail.com')
        send_email(
            to=admin_email,
            subject=f'Intake Submitted: {cand_name}',
            html=f'<p><strong>{cand_name}</strong> ({candidate.user.email}) has submitted their intake form.</p>'
                 f'<p><a href="{settings.SITE_URL}/admin-dashboard/candidates/{candidate.id}">Review in Admin</a></p>',
            email_type='admin_notification'
        )
    except Exception:
        pass  # Non-critical

    return Response(ClientIntakeSerializer(intake).data)


# ─── Roles ───

@api_view(['GET'])
@permission_classes([IsApproved])
def role_list(request, candidate_id):
    roles = RoleSuggestion.objects.filter(candidate_id=candidate_id)
    return Response(RoleSuggestionSerializer(roles, many=True).data)


@api_view(['POST'])
@permission_classes([IsRecruiter])
def add_role(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = candidate_id
    data['suggested_by'] = request.user.id
    
    proposed_role_id = data.get('delete_proposed_role_id')
    
    serializer = RoleSuggestionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    
    if proposed_role_id:
        serializer.validated_data['candidate_confirmed'] = True
        serializer.validated_data['confirmed_at'] = timezone.now()
        
    serializer.save()
    
    if proposed_role_id:
        RoleConfirmation.objects.filter(id=proposed_role_id, candidate_id=candidate_id).delete()
        
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsCandidate])
def confirm_roles(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data
    decisions = payload.get('decisions', {})
    notes = payload.get('notes', {})
    custom_role = payload.get('custom_role')
    custom_roles = payload.get('custom_roles', [])
    
    for role_id, decision in decisions.items():
        status_val = True if decision == 'accepted' else False if decision == 'declined' else None
        # Save rejection reason note for 'declined' as well as 'change_requested'
        save_note = notes.get(role_id, '') if decision in ('declined', 'change_requested') else None
        RoleSuggestion.objects.filter(id=role_id, candidate_id=candidate_id).update(
            candidate_confirmed=status_val,
            confirmed_at=timezone.now(),
            change_request_note=save_note
        )
    
    if custom_role and custom_role.get('title'):
        RoleConfirmation.objects.create(
            candidate_id=candidate_id,
            response='change_requested',
            custom_role_title=custom_role['title'],
            custom_reason=custom_role.get('reason')
        )
        
    if isinstance(custom_roles, list):
        for role in custom_roles:
            if role.get('title'):
                RoleConfirmation.objects.create(
                    candidate_id=candidate_id,
                    response='change_requested',
                    custom_role_title=role['title'],
                    custom_reason=role.get('reason')
                )

    if candidate.status in ('roles_suggested', 'roles_published', 'intake_submitted'):
        candidate.status = 'payment_pending'
        candidate.save()
        
    # AUTOMATION: Ensure the $400 subscription exists
    ensure_default_subscription(candidate)

    # ── Email: Roles Confirmed by Candidate ──
    cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else candidate.user.email
    try:
        send_email(
            to=candidate.user.email,
            subject='Role Selections Confirmed – Hyrind',
            html=get_styled_email_html(
                cand_name,
                '<p>Your role selections have been confirmed successfully.</p>'
                '<p>Your next step is to complete your payment to proceed with the onboarding process.</p>',
                action_label="Proceed to Payment",
                action_url="/candidate-dashboard"
            ),
        )
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'hyrind.operations@gmail.com')
        send_email(
            to=admin_email,
            subject=f'Roles Confirmed: {cand_name}',
            html=f'<p><strong>{cand_name}</strong> ({candidate.user.email}) has confirmed their role selections.</p>'
                 f'<p><a href="{settings.SITE_URL}/admin-dashboard/candidates/{candidate.id}">View in Admin</a></p>',
            email_type='admin_notification'
        )
    except Exception:
        pass

    return Response({'message': 'Roles confirmed'})


@api_view(['GET'])
@permission_classes([IsApproved])
def proposed_roles(request, candidate_id):
    """Return candidate-proposed custom roles (RoleConfirmation with custom_role_title set)."""
    confirmations = RoleConfirmation.objects.filter(
        candidate_id=candidate_id,
        custom_role_title__isnull=False
    ).exclude(custom_role_title='').order_by('-responded_at')
    return Response(RoleConfirmationSerializer(confirmations, many=True).data)

@api_view(['DELETE'])
@permission_classes([IsRecruiter])
def delete_proposed_role(request, candidate_id, role_id):
    try:
        RoleConfirmation.objects.get(id=role_id, candidate_id=candidate_id).delete()
        return Response({'message': 'Proposed role deleted'})
    except RoleConfirmation.DoesNotExist:
        return Response({'error': 'Proposed role not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsRecruiter])
def delete_role(request, candidate_id, role_id):
    try:
        RoleSuggestion.objects.get(id=role_id, candidate_id=candidate_id).delete()
        return Response({'message': 'Suggested role deleted'})
    except RoleSuggestion.DoesNotExist:
        return Response({'error': 'Suggested role not found'}, status=404)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsRecruiter])
def update_role(request, candidate_id, role_id):
    try:
        role = RoleSuggestion.objects.get(id=role_id, candidate_id=candidate_id)
        role.role_title = request.data.get('role_title', role.role_title)
        role.description = request.data.get('description', role.description)
        role.save()
        return Response(RoleSuggestionSerializer(role).data)
    except RoleSuggestion.DoesNotExist:
        return Response({'error': 'Suggested role not found'}, status=404)




@api_view(['POST'])
@permission_classes([IsAdmin])
def reopen_intake(request, candidate_id):
    try:
        intake = ClientIntake.objects.get(candidate_id=candidate_id)
        intake.is_locked = False
        intake.save()
        log_action(request.user, 'intake_reopened', str(candidate_id), 'intake', {})
        return Response({'message': 'Intake reopened'})
    except ClientIntake.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def reopen_roles(request, candidate_id):
    try:
        RoleSuggestion.objects.filter(candidate_id=candidate_id).update(
            candidate_confirmed=None,
            confirmed_at=None,
            change_request_note=None
        )
        candidate = Candidate.objects.get(id=candidate_id)
        candidate.status = 'intake_submitted'
        candidate.save()
        log_action(request.user, 'roles_reopened', str(candidate_id), 'roles', {})
        return Response({'message': 'Roles reopened and status reset'})
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ─── Credentials ───

@api_view(['GET'])
@permission_classes([IsApproved])
def credentials(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        
    versions = list(CredentialVersion.objects.filter(candidate_id=candidate_id).select_related('edited_by__profile'))
    for v in versions:
        if isinstance(v.data, dict):
            sync_credential_keys(v.data, candidate=candidate)
    return Response(CredentialVersionSerializer(versions, many=True).data)


def validate_credential_data(data):
    """Validate credential form — aligned with CandidateCredentialsPage.tsx field names."""
    errors = {}

    # Required fields matching the frontend form
    required_fields = {
        'email': 'Email Address',
        'full_name': 'Full Name',
        'phone_number': 'Phone Number',
        'location': 'Location',
        'personal_email': 'Personal Email',
        'preferred_roles': 'Preferred Job Roles',
        'preferred_locations': 'Preferred Locations',
        'linkedin_id': 'LinkedIn Login ID',
        'linkedin_pass': 'LinkedIn Password',
    }
    for field, label in required_fields.items():
        val = data.get(field)
        if not val or (isinstance(val, str) and not val.strip()):
            errors[field] = f"{label} is required"

    # Date validations
    if not data.get('bachelors_grad_date'):
        errors['bachelors_grad_date'] = "Bachelor's Graduation Date is required"
    if not data.get('opt_start_date'):
        errors['opt_start_date'] = "OPT Start Date is required"

    return errors


def sync_credential_keys(data, payload=None, candidate=None):
    mappings = [
        ('full_name', 'full_legal_name'),
        ('phone_number', 'phone'),
        ('location', 'location_city_state'),
        ('preferred_roles', 'preferred_job_roles'),
        ('linkedin_id', 'linkedin_login_id'),
        ('linkedin_pass', 'linkedin_password'),
        ('indeed_id', 'indeed_login_id'),
        ('indeed_pass', 'indeed_password'),
        ('dice_id', 'dice_login_id'),
        ('dice_pass', 'dice_password'),
        ('monster_id', 'monster_login_id'),
        ('monster_pass', 'monster_password'),
        ('ziprecruiter_id', 'ziprecruiter_login_id'),
        ('ziprecruiter_pass', 'ziprecruiter_password'),
        ('bachelors_grad_date', 'bachelors_graduation_date'),
        ('masters_grad_date', 'masters_graduation_date'),
        ('email', 'shared_email'),
        ('opt_offer_submitted', 'opt_offer_letter_submitted'),
    ]
    payload = payload or {}
    
    # First, apply fallback from candidate model if available
    if candidate:
        if not data.get('full_name') and not data.get('full_legal_name'):
            cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else ''
            if cand_name:
                data['full_name'] = cand_name
                data['full_legal_name'] = cand_name
        
        if not data.get('phone_number') and not data.get('phone'):
            cand_phone = candidate.user.profile.phone if hasattr(candidate.user, 'profile') else ''
            if cand_phone:
                data['phone_number'] = cand_phone
                data['phone'] = cand_phone
                
        if not data.get('email') and not data.get('shared_email'):
            cand_email = candidate.user.email
            data['email'] = cand_email
            data['shared_email'] = cand_email
            
        if not data.get('linkedin_url'):
            data['linkedin_url'] = candidate.linkedin_url or (candidate.user.profile.linkedin_profile if hasattr(candidate.user, 'profile') else '')
            
    for key1, key2 in mappings:
        in_payload1 = key1 in payload
        in_payload2 = key2 in payload
        
        if in_payload1 and not in_payload2:
            data[key2] = data.get(key1)
        elif in_payload2 and not in_payload1:
            data[key1] = data.get(key2)
        else:
            val1 = data.get(key1)
            val2 = data.get(key2)
            if val1 and (val2 is None or val2 == ''):
                data[key2] = val1
            elif val2 and (val1 is None or val1 == ''):
                data[key1] = val2


@api_view(['POST'])
@permission_classes([IsApproved])
def upsert_credential(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    # Accept both { data: {...} } and flat submission
    payload = request.data.get('data') if 'data' in request.data else request.data

    last_version = CredentialVersion.objects.filter(candidate=candidate).order_by('-version').first()

    # 1. Fetch previous version and merge
    merged_payload = {}
    if last_version and isinstance(last_version.data, dict):
        merged_payload.update(last_version.data)
    if isinstance(payload, dict):
        merged_payload.update(payload)
    else:
        merged_payload = payload

    # 2. Synchronize key mapping bidirectionally
    if isinstance(merged_payload, dict):
        sync_credential_keys(merged_payload, payload if isinstance(payload, dict) else None, candidate)

    # 3. Validate the merged and normalized credential data
    validation_errors = validate_credential_data(merged_payload)
    if validation_errors:
        return Response({
            'error': 'Validation failed',
            'validation_errors': validation_errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # If the candidate status is not submitted/finalized yet, we are still on the initial version (v1).
    # Reuse/overwrite the existing last_version if one exists, to keep it as version 1.
    post_credentials_statuses = (
        'credentials_submitted', 'active_marketing', 'paused', 
        'on_hold', 'past_due', 'cancelled', 'placed_closed'
    )
    if last_version and candidate.status not in post_credentials_statuses:
        last_version.data = merged_payload
        last_version.edited_by = request.user
        last_version.created_at = timezone.now()
        last_version.save()
        cred = last_version
    else:
        new_version = (last_version.version + 1) if last_version else 1
        cred = CredentialVersion.objects.create(
            candidate=candidate,
            data=merged_payload,
            edited_by=request.user,
            version=new_version,
        )

    # ── Sync key fields from credential data to top-level Candidate model ──
    if merged_payload.get('personal_email'):
        candidate.personal_email = merged_payload['personal_email']
    if merged_payload.get('preferred_locations'):
        candidate.current_location = merged_payload['preferred_locations']
    if merged_payload.get('linkedin_id'):
        # Store LinkedIn ID as the linkedin_url field (best match in current model)
        candidate.linkedin_url = merged_payload['linkedin_id']

    # Date field sync — frontend uses bachelors_grad_date / masters_grad_date
    date_map = {
        'bachelors_grad_date': 'bachelors_graduation_date',
        'masters_grad_date': 'masters_graduation_date',
        'opt_start_date': 'opt_start_date',
        'first_entry_us': 'first_entry_us',
    }
    for payload_key, model_attr in date_map.items():
        if merged_payload.get(payload_key):
            for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y'):
                try:
                    setattr(candidate, model_attr, datetime.strptime(str(merged_payload[payload_key]), fmt).date())
                    break
                except Exception:
                    continue

    if candidate.status in ('payment_completed', 'roles_confirmed', 'pending_payment'):
        candidate.status = 'credentials_submitted'
        candidate.save(update_fields=['status', 'personal_email', 'current_location',
                                      'linkedin_url', 'bachelors_graduation_date',
                                      'masters_graduation_date', 'opt_start_date', 'first_entry_us'])
    else:
        candidate.save(update_fields=['personal_email', 'current_location', 'linkedin_url',
                                      'bachelors_graduation_date', 'masters_graduation_date',
                                      'opt_start_date', 'first_entry_us'])

    log_action(request.user, 'credential_edit', str(candidate.id), 'credential', {'version': new_version})

    # ── Email: Credential Submitted/Updated ──
    cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else candidate.user.email
    try:
        action_text = 'submitted' if new_version == 1 else f'updated (v{new_version})'
        send_email(
            to=candidate.user.email,
            subject=f'Credentials {action_text.title()} – Hyrind',
            html=get_styled_email_html(
                cand_name,
                f'<p>Your credential intake sheet has been {action_text} successfully.</p>'
                '<p>Our marketing team will use the latest version of your credentials for job applications.</p>',
                action_label="View Dashboard",
                action_url="/candidate-dashboard"
            ),
        )
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'hyrind.operations@gmail.com')
        send_email(
            to=admin_email,
            subject=f'Credentials {action_text.title()}: {cand_name}',
            html=f'<p><strong>{cand_name}</strong> ({candidate.user.email}) has {action_text} their credential intake sheet.</p>'
                 f'<p><a href="{settings.SITE_URL}/admin-dashboard/candidates/{candidate.id}">View in Admin</a></p>',
            email_type='admin_notification'
        )
    except Exception:
        pass

    return Response(CredentialVersionSerializer(cred).data, status=status.HTTP_201_CREATED)


# ─── Referrals ───

@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def referrals(request, candidate_id):
    if request.method == 'GET':
        refs = Referral.objects.filter(referrer_id=candidate_id)
        return Response(ReferralSerializer(refs, many=True).data)

    data = request.data.copy()
    serializer = ReferralSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(referrer_id=candidate_id)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Interviews ───

@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsApproved])
def interviews(request, candidate_id):
    if request.method == 'GET':
        logs = InterviewLog.objects.filter(candidate_id=candidate_id)
        return Response(InterviewLogSerializer(logs, many=True).data)

    if request.method == 'PATCH':
        log_id = request.data.get('id')
        if not log_id:
            return Response({'error': 'Interview log ID is required for update'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            log = InterviewLog.objects.get(id=log_id, candidate_id=candidate_id)
        except InterviewLog.DoesNotExist:
            return Response({'error': 'Interview log not found'}, status=status.HTTP_404_NOT_FOUND)

        log.updated_by = request.user
        serializer = InterviewLogSerializer(log, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_action(request.user, 'interview_outcome_update', str(candidate_id), 'interview', {'log_id': str(log.id), 'outcome': log.outcome})
        return Response(serializer.data)

    data = request.data.copy()
    data['candidate'] = candidate_id
    serializer = InterviewLogSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(submitted_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Candidate Payments ───

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_payments(request, candidate_id):
    # USE THE UPDATED BILLING PAYMENT MODEL INSTEAD OF LEGACY
    payments = Payment.objects.filter(candidate_id=candidate_id).order_by('-created_at')
    return Response(PaymentSerializer(payments, many=True).data)


# ─── Admin Referrals ───

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_referrals(request):
    refs = Referral.objects.select_related('referrer__user__profile').all().order_by('-created_at')
    data = []
    for ref in refs:
        row = ReferralSerializer(ref).data
        try:
            row['referrer_name'] = ref.referrer.user.profile.full_name
        except Exception:
            row['referrer_name'] = 'Unknown'
        data.append(row)
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_referral(request, referral_id):
    try:
        ref = Referral.objects.get(id=referral_id)
    except Referral.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    ref_status = request.data.get('status')
    notes_val = request.data.get('notes')
    if ref_status:
        ref.status = ref_status
    if notes_val is not None:
        ref.notes = notes_val
    ref.save()
    row = ReferralSerializer(ref).data
    try:
        row['referrer_name'] = ref.referrer.user.profile.full_name
    except Exception:
        row['referrer_name'] = 'Unknown'
    return Response(row)


# ─── Placement ───

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def placement(request, candidate_id):
    if request.method == 'GET':
        try:
            p = PlacementClosure.objects.get(candidate_id=candidate_id)
            return Response(PlacementClosureSerializer(p).data)
        except PlacementClosure.DoesNotExist:
            return Response({})

    data = request.data.copy()
    data['candidate'] = candidate_id
    
    try:
        instance = PlacementClosure.objects.get(candidate_id=candidate_id)
        serializer = PlacementClosureSerializer(instance, data=data)
    except PlacementClosure.DoesNotExist:
        serializer = PlacementClosureSerializer(data=data)
        
    serializer.is_valid(raise_exception=True)
    serializer.save(closed_by=request.user)

    Candidate.objects.filter(id=candidate_id).update(status='placed_closed')
    log_action(request.user, 'placement_closed', str(candidate_id), 'candidate', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED if serializer.instance.id is None else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_activity_report(request):
    """Export summary of candidate activity for admin dashboard."""
    from recruiters.models import RecruiterAssignment, JobLinkEntry
    from .models import InterviewLog, TrainingScheduleClick
    
    candidates = Candidate.objects.select_related('user__profile').all()
    
    report_data = []
    for c in candidates:
        # Get active recruiters
        recruiters = RecruiterAssignment.objects.filter(candidate=c, is_active=True).select_related('recruiter__profile')
        recruiter_names = ", ".join([
            r.recruiter.profile.full_name if hasattr(r.recruiter, 'profile') and r.recruiter.profile.full_name 
            else r.recruiter.email 
            for r in recruiters
        ])
        
        # Total submissions (JobLinkEntry)
        total_submissions = JobLinkEntry.objects.filter(candidate=c).count()
        
        # Total interviews (Manual logs + JobLinkEntry with interview status)
        manual_interviews = InterviewLog.objects.filter(candidate=c).count()
        link_interviews = JobLinkEntry.objects.filter(
            candidate=c, 
            application_status__icontains='interview'
        ).count()
        total_interviews = manual_interviews + link_interviews
        
        # Training clicks
        training_clicks = TrainingScheduleClick.objects.filter(candidate=c).count()
        
        report_data.append({
            'candidate_name': c.user.profile.full_name if hasattr(c.user, 'profile') and c.user.profile.full_name else c.user.email,
            'email': c.user.email,
            'assigned_recruiters': recruiter_names,
            'status': c.status,
            'total_submissions': total_submissions,
            'total_interviews': total_interviews,
            'training_clicks': training_clicks,
            'created_at': c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else "",
        })
        
    return Response(report_data)
