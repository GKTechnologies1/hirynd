
-- Job status updates table for dual-status tracking
CREATE TABLE public.job_status_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL,
  source_role TEXT NOT NULL CHECK (source_role IN ('candidate', 'recruiter', 'admin')),
  status TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add candidate_response_status to job_postings for quick access
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS candidate_response_status TEXT DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.job_status_updates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins manage job status updates"
  ON public.job_status_updates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own status updates"
  ON public.job_status_updates FOR INSERT
  WITH CHECK (updated_by = auth.uid());

CREATE POLICY "View job status updates"
  ON public.job_status_updates FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR updated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      JOIN candidates c ON c.id = jp.candidate_id
      WHERE jp.id = job_status_updates.job_posting_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      JOIN daily_submission_logs dsl ON dsl.id = jp.submission_log_id
      WHERE jp.id = job_status_updates.job_posting_id AND dsl.recruiter_id = auth.uid()
    )
  );

-- RPC for adding job status updates with validation
CREATE OR REPLACE FUNCTION public.add_job_status_update(
  _job_posting_id UUID,
  _status TEXT,
  _notes TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _source_role TEXT;
  _job RECORD;
  _new_id UUID;
BEGIN
  -- Get job posting info
  SELECT jp.*, c.user_id as candidate_user_id
  INTO _job
  FROM job_postings jp
  JOIN candidates c ON c.id = jp.candidate_id
  WHERE jp.id = _job_posting_id;

  IF _job IS NULL THEN RAISE EXCEPTION 'Job posting not found'; END IF;

  -- Determine source role and validate access
  IF has_role(_caller_id, 'admin') THEN
    _source_role := 'admin';
  ELSIF _caller_id = _job.candidate_user_id THEN
    _source_role := 'candidate';
    -- Candidates can only set specific statuses
    IF _status NOT IN ('screening', 'interview', 'rejected', 'offer', 'no_response') THEN
      RAISE EXCEPTION 'Invalid candidate status. Allowed: screening, interview, rejected, offer, no_response';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM daily_submission_logs dsl
    WHERE dsl.id = _job.submission_log_id AND dsl.recruiter_id = _caller_id
  ) THEN
    _source_role := 'recruiter';
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate notes length
  IF length(_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long (max 1000)'; END IF;

  -- Insert status update
  INSERT INTO job_status_updates (job_posting_id, updated_by, source_role, status, notes)
  VALUES (_job_posting_id, _caller_id, _source_role, _status, _notes)
  RETURNING id INTO _new_id;

  -- Update candidate_response_status on job_postings if candidate
  IF _source_role = 'candidate' THEN
    UPDATE job_postings SET candidate_response_status = _status, updated_at = now()
    WHERE id = _job_posting_id;
  ELSIF _source_role IN ('recruiter', 'admin') THEN
    UPDATE job_postings SET status = _status, updated_at = now()
    WHERE id = _job_posting_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'job_status_updated', 'job_posting', _job_posting_id,
    jsonb_build_object('status', _status, 'source_role', _source_role, 'notes', _notes));

  RETURN _new_id;
END;
$$;

-- Admin config toggles for email preferences
INSERT INTO public.admin_config (config_key, config_value)
VALUES 
  ('email_admin_on_daily_logs', 'false'),
  ('email_admin_on_interview_logs', 'true')
ON CONFLICT (config_key) DO NOTHING;
