
-- ============================================================
-- FIX: Infinite recursion between candidates ↔ candidate_assignments
-- Strategy: Create SECURITY DEFINER helpers, then rewrite all
-- circular RLS policies to use them.
-- ============================================================

-- 1. Helper: Does the caller own this candidate row?
CREATE OR REPLACE FUNCTION public.is_candidate_owner(_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates
    WHERE id = _candidate_id AND user_id = auth.uid()
  )
$$;

-- 2. Helper: Is the caller an active recruiter for this candidate?
CREATE OR REPLACE FUNCTION public.is_assigned_recruiter(_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidate_assignments
    WHERE candidate_id = _candidate_id
      AND recruiter_id = auth.uid()
      AND is_active = true
  )
$$;

-- 3. Helper: Is the caller the user behind this candidate user_id?
CREATE OR REPLACE FUNCTION public.is_user_candidate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.candidate_assignments ca ON ca.candidate_id = c.id
    WHERE c.user_id = _user_id
      AND ca.recruiter_id = auth.uid()
      AND ca.is_active = true
  )
$$;

-- ============================================================
-- CANDIDATES table — drop & recreate SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Candidates view own record" ON public.candidates;
CREATE POLICY "Candidates view own record" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR is_assigned_recruiter(id)
  );

-- ============================================================
-- CANDIDATE_ASSIGNMENTS table — drop & recreate SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "View assignments" ON public.candidate_assignments;
CREATE POLICY "View assignments" ON public.candidate_assignments
  FOR SELECT USING (
    recruiter_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
  );

-- ============================================================
-- PROFILES table — fix SELECT to avoid candidates↔assignments loop
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR is_user_candidate(user_id)
  );

-- ============================================================
-- Fix other tables that reference candidates in SELECT policies
-- ============================================================

-- candidate_subscriptions
DROP POLICY IF EXISTS "Candidates view own subscription" ON public.candidate_subscriptions;
CREATE POLICY "Candidates view own subscription" ON public.candidate_subscriptions
  FOR SELECT USING (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "Recruiters view assigned subscription" ON public.candidate_subscriptions;
CREATE POLICY "Recruiters view assigned subscription" ON public.candidate_subscriptions
  FOR SELECT USING (is_assigned_recruiter(candidate_id));

-- training_clicks
DROP POLICY IF EXISTS "Candidates view own clicks" ON public.training_clicks;
CREATE POLICY "Candidates view own clicks" ON public.training_clicks
  FOR SELECT USING (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "Candidates insert own clicks" ON public.training_clicks;
CREATE POLICY "Candidates insert own clicks" ON public.training_clicks
  FOR INSERT WITH CHECK (is_candidate_owner(candidate_id));

-- client_intake_sheets
DROP POLICY IF EXISTS "Intake sheet access" ON public.client_intake_sheets;
CREATE POLICY "Intake sheet access" ON public.client_intake_sheets
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

DROP POLICY IF EXISTS "Candidate manages intake" ON public.client_intake_sheets;
CREATE POLICY "Candidate manages intake" ON public.client_intake_sheets
  FOR INSERT WITH CHECK (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "Candidate updates intake" ON public.client_intake_sheets;
CREATE POLICY "Candidate updates intake" ON public.client_intake_sheets
  FOR UPDATE USING (is_candidate_owner(candidate_id) AND is_locked = false);

-- credential_intake_sheets
DROP POLICY IF EXISTS "View credentials" ON public.credential_intake_sheets;
CREATE POLICY "View credentials" ON public.credential_intake_sheets
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

DROP POLICY IF EXISTS "Insert credentials" ON public.credential_intake_sheets;
CREATE POLICY "Insert credentials" ON public.credential_intake_sheets
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

-- daily_submission_logs
DROP POLICY IF EXISTS "View submission logs" ON public.daily_submission_logs;
CREATE POLICY "View submission logs" ON public.daily_submission_logs
  FOR SELECT USING (
    recruiter_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
  );

-- job_postings
DROP POLICY IF EXISTS "View job postings" ON public.job_postings;
CREATE POLICY "View job postings" ON public.job_postings
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR EXISTS (
      SELECT 1 FROM daily_submission_logs dsl
      WHERE dsl.id = job_postings.submission_log_id AND dsl.recruiter_id = auth.uid()
    )
  );

-- job_status_updates
DROP POLICY IF EXISTS "View job status updates" ON public.job_status_updates;
CREATE POLICY "View job status updates" ON public.job_status_updates
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR updated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_status_updates.job_posting_id
        AND is_candidate_owner(jp.candidate_id)
    )
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      JOIN daily_submission_logs dsl ON dsl.id = jp.submission_log_id
      WHERE jp.id = job_status_updates.job_posting_id AND dsl.recruiter_id = auth.uid()
    )
  );

-- interview_logs
DROP POLICY IF EXISTS "View interview logs" ON public.interview_logs;
CREATE POLICY "View interview logs" ON public.interview_logs
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

DROP POLICY IF EXISTS "Users update interview logs" ON public.interview_logs;
CREATE POLICY "Users update interview logs" ON public.interview_logs
  FOR UPDATE USING (
    submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_assigned_recruiter(candidate_id)
  );

-- payments
DROP POLICY IF EXISTS "View payments" ON public.payments;
CREATE POLICY "View payments" ON public.payments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
  );

-- payment_methods
DROP POLICY IF EXISTS "Candidates view own payment methods" ON public.payment_methods;
CREATE POLICY "Candidates view own payment methods" ON public.payment_methods
  FOR SELECT USING (is_candidate_owner(candidate_id));

-- placement_closures
DROP POLICY IF EXISTS "View closures" ON public.placement_closures;
CREATE POLICY "View closures" ON public.placement_closures
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

-- referrals
DROP POLICY IF EXISTS "Candidates create referrals" ON public.referrals;
CREATE POLICY "Candidates create referrals" ON public.referrals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM candidates c WHERE c.id = referrals.referrer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "View referrals" ON public.referrals;
CREATE POLICY "View referrals" ON public.referrals
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM candidates c WHERE c.id = referrals.referrer_id AND c.user_id = auth.uid())
  );

-- role_suggestions
DROP POLICY IF EXISTS "Candidates confirm roles" ON public.role_suggestions;
CREATE POLICY "Candidates confirm roles" ON public.role_suggestions
  FOR UPDATE USING (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "View role suggestions" ON public.role_suggestions;
CREATE POLICY "View role suggestions" ON public.role_suggestions
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR is_candidate_owner(candidate_id)
    OR is_assigned_recruiter(candidate_id)
  );

-- subscription_invoices
DROP POLICY IF EXISTS "Candidates view own invoices" ON public.subscription_invoices;
CREATE POLICY "Candidates view own invoices" ON public.subscription_invoices
  FOR SELECT USING (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "Recruiters view assigned invoices" ON public.subscription_invoices;
CREATE POLICY "Recruiters view assigned invoices" ON public.subscription_invoices
  FOR SELECT USING (is_assigned_recruiter(candidate_id));

-- subscription_payments
DROP POLICY IF EXISTS "Candidates view own subscription payments" ON public.subscription_payments;
CREATE POLICY "Candidates view own subscription payments" ON public.subscription_payments
  FOR SELECT USING (is_candidate_owner(candidate_id));

DROP POLICY IF EXISTS "Recruiters view assigned subscription payments" ON public.subscription_payments;
CREATE POLICY "Recruiters view assigned subscription payments" ON public.subscription_payments
  FOR SELECT USING (is_assigned_recruiter(candidate_id));

-- audit_logs — fix the SELECT that joins candidate_assignments
DROP POLICY IF EXISTS "View audit logs" ON public.audit_logs;
CREATE POLICY "View audit logs" ON public.audit_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR actor_id = auth.uid()
    OR is_assigned_recruiter(entity_id)
  );
