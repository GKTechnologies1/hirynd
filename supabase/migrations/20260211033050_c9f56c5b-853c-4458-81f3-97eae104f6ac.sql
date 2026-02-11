
-- Create email_logs table for tracking email delivery
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins view email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions insert via service role, but allow authenticated insert for safety
CREATE POLICY "Service insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Add admin_notification_email config if not exists
INSERT INTO public.admin_config (config_key, config_value)
VALUES ('admin_notification_email', 'admin@hyrind.com')
ON CONFLICT (config_key) DO NOTHING;
