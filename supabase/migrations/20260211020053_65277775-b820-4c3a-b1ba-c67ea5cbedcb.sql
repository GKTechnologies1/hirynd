
-- ============================================================
-- SECURITY FIX MIGRATION
-- ============================================================

-- 1. NOTIFICATIONS: Create SECURITY DEFINER function for system notifications
CREATE OR REPLACE FUNCTION public.create_system_notification(
  _user_id uuid,
  _title text,
  _message text,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (_user_id, _title, _message, _link);
END;
$$;

-- Restrict notifications INSERT to admin-only (system uses SECURITY DEFINER function)
DROP POLICY IF EXISTS "Authenticated users insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. ROLE ASSIGNMENT: Auto-assign candidate role on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidate');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 3. BANK DETAILS: Create separate secure table
CREATE TABLE public.recruiter_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bank_name text DEFAULT '',
  bank_account_last4 text DEFAULT '',
  bank_routing_last4 text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_bank_details ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins manage bank details" ON public.recruiter_bank_details
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Recruiter: INSERT/UPDATE only (no SELECT after submission)
CREATE POLICY "Recruiters insert bank details" ON public.recruiter_bank_details
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters update bank details" ON public.recruiter_bank_details
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- No SELECT policy for recruiters — they cannot read back bank data

-- Remove bank columns from recruiter_profiles
ALTER TABLE public.recruiter_profiles
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_routing_number;

-- Add updated_at trigger for bank details
CREATE TRIGGER update_recruiter_bank_details_updated_at
  BEFORE UPDATE ON public.recruiter_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. FIX BROKEN RLS POLICIES (self-join bugs: ca.candidate_id = ca.id)

-- Fix candidates SELECT policy
DROP POLICY IF EXISTS "Candidates view own record" ON public.candidates;
CREATE POLICY "Candidates view own record" ON public.candidates
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = candidates.id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix client_intake_sheets SELECT policy
DROP POLICY IF EXISTS "Intake sheet access" ON public.client_intake_sheets;
CREATE POLICY "Intake sheet access" ON public.client_intake_sheets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = client_intake_sheets.candidate_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = client_intake_sheets.candidate_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix credential_intake_sheets SELECT policy
DROP POLICY IF EXISTS "View credentials" ON public.credential_intake_sheets;
CREATE POLICY "View credentials" ON public.credential_intake_sheets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = credential_intake_sheets.candidate_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = credential_intake_sheets.candidate_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix credential_intake_sheets INSERT policy
DROP POLICY IF EXISTS "Insert credentials" ON public.credential_intake_sheets;
CREATE POLICY "Insert credentials" ON public.credential_intake_sheets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = credential_intake_sheets.candidate_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = credential_intake_sheets.candidate_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix interview_logs SELECT policy
DROP POLICY IF EXISTS "View interview logs" ON public.interview_logs;
CREATE POLICY "View interview logs" ON public.interview_logs
  FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = interview_logs.candidate_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = interview_logs.candidate_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix role_suggestions SELECT policy
DROP POLICY IF EXISTS "View role suggestions" ON public.role_suggestions;
CREATE POLICY "View role suggestions" ON public.role_suggestions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = role_suggestions.candidate_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.candidate_id = role_suggestions.candidate_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- Fix candidate_assignments SELECT policy
DROP POLICY IF EXISTS "View assignments" ON public.candidate_assignments;
CREATE POLICY "View assignments" ON public.candidate_assignments
  FOR SELECT TO authenticated
  USING (
    recruiter_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = candidate_assignments.candidate_id AND c.user_id = auth.uid())
  );

-- 5. PROFILES: Restrict recruiter access to assigned candidates only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM candidates c
      JOIN candidate_assignments ca ON ca.candidate_id = c.id
      WHERE c.user_id = profiles.user_id
        AND ca.recruiter_id = auth.uid()
        AND ca.is_active = true
    )
  );

-- 6. Recruiter profiles: tighten policies (bank columns removed, keep clean)
DROP POLICY IF EXISTS "Recruiters view own profile" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Recruiters manage own profile" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Admins manage recruiter profiles" ON public.recruiter_profiles;

CREATE POLICY "Admins manage recruiter profiles" ON public.recruiter_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Recruiters view own profile" ON public.recruiter_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Recruiters insert own profile" ON public.recruiter_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters update own profile" ON public.recruiter_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
