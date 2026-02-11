
-- ============================================================
-- SERVER-SIDE INPUT VALIDATION FUNCTIONS
-- ============================================================

-- 1. Validated intake form submission
CREATE OR REPLACE FUNCTION public.submit_intake_form(
  _candidate_id uuid,
  _form_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _candidate_user_id uuid;
  _candidate_status text;
  _is_locked boolean;
BEGIN
  -- Verify candidate belongs to caller
  SELECT user_id, status INTO _candidate_user_id, _candidate_status
  FROM candidates WHERE id = _candidate_id;
  
  IF _candidate_user_id IS NULL OR _candidate_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF _candidate_status != 'approved' THEN
    RAISE EXCEPTION 'Intake form can only be submitted when status is approved';
  END IF;

  -- Check if already locked
  SELECT is_locked INTO _is_locked FROM client_intake_sheets WHERE candidate_id = _candidate_id;
  IF _is_locked = true THEN
    RAISE EXCEPTION 'Intake form is already locked';
  END IF;

  -- Validate required fields
  IF _form_data->>'full_name' IS NULL OR length(trim(_form_data->>'full_name')) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF _form_data->>'phone' IS NULL OR length(trim(_form_data->>'phone')) = 0 THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;
  IF _form_data->>'target_roles' IS NULL OR length(trim(_form_data->>'target_roles')) = 0 THEN
    RAISE EXCEPTION 'Target roles is required';
  END IF;

  -- Validate max lengths
  IF length(_form_data->>'full_name') > 255 THEN RAISE EXCEPTION 'Full name too long (max 255)'; END IF;
  IF length(_form_data->>'phone') > 50 THEN RAISE EXCEPTION 'Phone too long (max 50)'; END IF;
  IF length(_form_data->>'university') > 255 THEN RAISE EXCEPTION 'University too long (max 255)'; END IF;
  IF length(_form_data->>'major') > 255 THEN RAISE EXCEPTION 'Major too long (max 255)'; END IF;
  IF length(_form_data->>'target_roles') > 500 THEN RAISE EXCEPTION 'Target roles too long (max 500)'; END IF;
  IF length(_form_data->>'target_locations') > 500 THEN RAISE EXCEPTION 'Target locations too long (max 500)'; END IF;
  IF length(_form_data->>'skills') > 2000 THEN RAISE EXCEPTION 'Skills too long (max 2000)'; END IF;
  IF length(_form_data->>'notes') > 2000 THEN RAISE EXCEPTION 'Notes too long (max 2000)'; END IF;
  IF length(_form_data->>'current_employer') > 255 THEN RAISE EXCEPTION 'Current employer too long (max 255)'; END IF;

  -- Validate URL formats if provided
  IF _form_data->>'linkedin_url' IS NOT NULL AND length(_form_data->>'linkedin_url') > 0 
     AND _form_data->>'linkedin_url' !~ '^https?://' THEN
    RAISE EXCEPTION 'LinkedIn URL must start with http:// or https://';
  END IF;
  IF _form_data->>'portfolio_url' IS NOT NULL AND length(_form_data->>'portfolio_url') > 0
     AND _form_data->>'portfolio_url' !~ '^https?://' THEN
    RAISE EXCEPTION 'Portfolio URL must start with http:// or https://';
  END IF;

  -- Validate degree enum if provided
  IF _form_data->>'degree' IS NOT NULL AND length(_form_data->>'degree') > 0
     AND _form_data->>'degree' NOT IN ('bachelors', 'masters', 'phd', 'associate', 'other') THEN
    RAISE EXCEPTION 'Invalid degree value';
  END IF;

  -- Validate visa_status enum if provided
  IF _form_data->>'visa_status' IS NOT NULL AND length(_form_data->>'visa_status') > 0
     AND _form_data->>'visa_status' NOT IN ('us_citizen', 'green_card', 'h1b', 'opt', 'cpt', 'ead', 'other') THEN
    RAISE EXCEPTION 'Invalid visa status value';
  END IF;

  -- Upsert intake sheet
  INSERT INTO client_intake_sheets (candidate_id, data, is_locked, submitted_at)
  VALUES (_candidate_id, _form_data, true, now())
  ON CONFLICT (candidate_id) DO UPDATE SET
    data = _form_data,
    is_locked = true,
    submitted_at = now(),
    updated_at = now();

  -- Update candidate status
  UPDATE candidates SET status = 'intake_submitted' WHERE id = _candidate_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'intake_submitted', 'client_intake_sheet', _candidate_id, _form_data);

  -- Notify admins
  PERFORM create_system_notification(
    ur.user_id,
    'Intake Form Submitted',
    'Candidate has submitted their client intake form and is awaiting role suggestions.',
    '/admin-dashboard/candidates'
  ) FROM user_roles ur WHERE ur.role = 'admin';
END;
$$;

-- 2. Validated role confirmation
CREATE OR REPLACE FUNCTION public.confirm_role_selections(
  _candidate_id uuid,
  _decisions jsonb  -- { "role_id": true/false, ... }
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _candidate_user_id uuid;
  _candidate_status text;
  _role_id text;
  _confirmed boolean;
  _role_count int;
BEGIN
  -- Verify candidate belongs to caller
  SELECT user_id, status INTO _candidate_user_id, _candidate_status
  FROM candidates WHERE id = _candidate_id;
  
  IF _candidate_user_id IS NULL OR _candidate_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF _candidate_status != 'roles_suggested' THEN
    RAISE EXCEPTION 'Roles can only be confirmed when status is roles_suggested';
  END IF;

  -- Validate decisions is not empty
  IF _decisions IS NULL OR jsonb_typeof(_decisions) != 'object' OR (SELECT count(*) FROM jsonb_object_keys(_decisions)) = 0 THEN
    RAISE EXCEPTION 'Decisions cannot be empty';
  END IF;

  -- Verify all role IDs belong to this candidate and all roles have decisions
  SELECT count(*) INTO _role_count FROM role_suggestions WHERE candidate_id = _candidate_id;
  IF _role_count != (SELECT count(*) FROM jsonb_object_keys(_decisions)) THEN
    RAISE EXCEPTION 'Must provide a decision for every suggested role';
  END IF;

  -- Update each role
  FOR _role_id, _confirmed IN SELECT key, value::boolean FROM jsonb_each_text(_decisions)
  LOOP
    UPDATE role_suggestions
    SET candidate_confirmed = _confirmed, confirmed_at = now()
    WHERE id = _role_id::uuid AND candidate_id = _candidate_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Role % not found for this candidate', _role_id;
    END IF;
  END LOOP;

  -- Update candidate status
  UPDATE candidates SET status = 'roles_confirmed' WHERE id = _candidate_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'roles_confirmed', 'role_suggestions', _candidate_id, _decisions);

  -- Notify admins
  PERFORM create_system_notification(
    ur.user_id,
    'Roles Confirmed',
    'Candidate has confirmed their role selections. Awaiting payment.',
    '/admin-dashboard/candidates'
  ) FROM user_roles ur WHERE ur.role = 'admin';
END;
$$;

-- 3. Validated role suggestion (admin only)
CREATE OR REPLACE FUNCTION public.add_role_suggestion(
  _candidate_id uuid,
  _role_title text,
  _description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  -- Admin check
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can suggest roles';
  END IF;

  -- Validate inputs
  IF _role_title IS NULL OR length(trim(_role_title)) = 0 THEN
    RAISE EXCEPTION 'Role title is required';
  END IF;
  IF length(_role_title) > 255 THEN RAISE EXCEPTION 'Role title too long (max 255)'; END IF;
  IF length(_description) > 1000 THEN RAISE EXCEPTION 'Description too long (max 1000)'; END IF;

  -- Verify candidate exists
  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = _candidate_id) THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  INSERT INTO role_suggestions (candidate_id, role_title, description, suggested_by)
  VALUES (_candidate_id, trim(_role_title), trim(_description), auth.uid())
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;
