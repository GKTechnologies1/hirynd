
-- RPC: Admin assign recruiter to candidate
CREATE OR REPLACE FUNCTION public.admin_assign_recruiter(
  _candidate_id uuid,
  _recruiter_id uuid,
  _role_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _new_id uuid;
  _candidate_status text;
  _active_count int;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  -- Validate role_type
  IF _role_type NOT IN ('primary_recruiter', 'secondary_recruiter', 'team_lead', 'team_manager') THEN
    RAISE EXCEPTION 'Invalid role type. Must be primary_recruiter, secondary_recruiter, team_lead, or team_manager';
  END IF;

  -- Validate candidate exists and status allows assignment
  SELECT status INTO _candidate_status FROM candidates WHERE id = _candidate_id;
  IF _candidate_status IS NULL THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  IF _candidate_status NOT IN ('paid', 'credential_completed', 'active_marketing') THEN
    RAISE EXCEPTION 'Can only assign recruiters when candidate status is paid, credential_completed, or active_marketing';
  END IF;

  -- Validate recruiter exists and has recruiter role
  IF NOT has_role(_recruiter_id, 'recruiter') THEN
    RAISE EXCEPTION 'Target user is not a recruiter';
  END IF;

  -- Check max 3 active assignments
  SELECT count(*) INTO _active_count FROM candidate_assignments
  WHERE candidate_id = _candidate_id AND is_active = true;
  IF _active_count >= 4 THEN
    RAISE EXCEPTION 'Maximum 4 recruiters (primary, secondary, team lead, team manager) already assigned';
  END IF;

  -- Deactivate any existing assignment with same role_type for this candidate
  UPDATE candidate_assignments
  SET is_active = false, unassigned_at = now()
  WHERE candidate_id = _candidate_id AND role_type = _role_type AND is_active = true;

  -- Deactivate any existing active assignment of this recruiter to this candidate
  UPDATE candidate_assignments
  SET is_active = false, unassigned_at = now()
  WHERE candidate_id = _candidate_id AND recruiter_id = _recruiter_id AND is_active = true;

  -- Insert new assignment
  INSERT INTO candidate_assignments (candidate_id, recruiter_id, role_type, assigned_by, is_active)
  VALUES (_candidate_id, _recruiter_id, _role_type, _caller_id, true)
  RETURNING id INTO _new_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'recruiter_assigned', 'candidate_assignment', _candidate_id,
    jsonb_build_object('recruiter_id', _recruiter_id, 'role_type', _role_type));

  -- Notify recruiter
  PERFORM create_system_notification(
    _recruiter_id,
    'New Candidate Assignment',
    'You have been assigned as ' || replace(_role_type, '_', ' ') || ' for a candidate.',
    '/recruiter-dashboard'
  );

  -- Notify candidate
  DECLARE _candidate_user_id uuid;
  BEGIN
    SELECT user_id INTO _candidate_user_id FROM candidates WHERE id = _candidate_id;
    PERFORM create_system_notification(
      _candidate_user_id,
      'Recruiter Assigned',
      'A ' || replace(_role_type, '_', ' ') || ' has been assigned to your case.',
      '/candidate-dashboard'
    );
  END;

  RETURN _new_id;
END;
$$;

-- RPC: Admin unassign recruiter
CREATE OR REPLACE FUNCTION public.admin_unassign_recruiter(
  _assignment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _assignment record;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO _assignment FROM candidate_assignments WHERE id = _assignment_id AND is_active = true;
  IF _assignment IS NULL THEN RAISE EXCEPTION 'Assignment not found or already inactive'; END IF;

  UPDATE candidate_assignments SET is_active = false, unassigned_at = now() WHERE id = _assignment_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value)
  VALUES (_caller_id, 'recruiter_unassigned', 'candidate_assignment', _assignment.candidate_id,
    jsonb_build_object('recruiter_id', _assignment.recruiter_id, 'role_type', _assignment.role_type));
END;
$$;

-- RPC: Admin start marketing
CREATE OR REPLACE FUNCTION public.admin_start_marketing(
  _candidate_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _candidate_status text;
  _candidate_user_id uuid;
  _has_credentials boolean;
  _has_recruiter boolean;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT status, user_id INTO _candidate_status, _candidate_user_id
  FROM candidates WHERE id = _candidate_id;

  IF _candidate_status IS NULL THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  IF _candidate_status NOT IN ('paid', 'credential_completed') THEN
    RAISE EXCEPTION 'Candidate must be paid or credential_completed to start marketing';
  END IF;

  _has_credentials := EXISTS (SELECT 1 FROM credential_intake_sheets WHERE candidate_id = _candidate_id);
  IF NOT _has_credentials THEN RAISE EXCEPTION 'Credentials not submitted yet'; END IF;

  _has_recruiter := EXISTS (SELECT 1 FROM candidate_assignments WHERE candidate_id = _candidate_id AND is_active = true);
  IF NOT _has_recruiter THEN RAISE EXCEPTION 'At least one recruiter must be assigned'; END IF;

  UPDATE candidates SET status = 'active_marketing' WHERE id = _candidate_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'marketing_started', 'candidate', _candidate_id,
    jsonb_build_object('status', 'active_marketing'));

  PERFORM create_system_notification(
    _candidate_user_id,
    'Marketing Started',
    'Your profile is now being actively marketed to employers!',
    '/candidate-dashboard'
  );
END;
$$;
