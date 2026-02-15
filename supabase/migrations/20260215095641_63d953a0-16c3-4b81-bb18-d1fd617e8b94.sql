
-- 1. Extend subscription_status enum
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'grace_period';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';

-- 2. Add new columns to candidate_subscriptions
ALTER TABLE public.candidate_subscriptions
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'Monthly Marketing',
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS grace_days int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0;

-- 3. Create subscription_invoices table
CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.candidate_subscriptions(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','paid','failed','waived')),
  attempted_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_invoices_sub ON public.subscription_invoices(subscription_id);
CREATE INDEX idx_subscription_invoices_candidate ON public.subscription_invoices(candidate_id);
CREATE INDEX idx_subscription_invoices_status ON public.subscription_invoices(status);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoices" ON public.subscription_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Candidates view own invoices" ON public.subscription_invoices FOR SELECT
  USING (EXISTS (SELECT 1 FROM candidates c WHERE c.id = subscription_invoices.candidate_id AND c.user_id = auth.uid()));

CREATE POLICY "Recruiters view assigned invoices" ON public.subscription_invoices FOR SELECT
  USING (EXISTS (SELECT 1 FROM candidate_assignments ca WHERE ca.candidate_id = subscription_invoices.candidate_id AND ca.recruiter_id = auth.uid() AND ca.is_active = true));

-- 4. Create payment_methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id),
  provider text NOT NULL DEFAULT 'manual',
  method_label text NOT NULL DEFAULT 'Manual Payment',
  last4 text,
  brand text,
  exp_month int,
  exp_year int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_candidate ON public.payment_methods(candidate_id);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment methods" ON public.payment_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Candidates view own payment methods" ON public.payment_methods FOR SELECT
  USING (EXISTS (SELECT 1 FROM candidates c WHERE c.id = payment_methods.candidate_id AND c.user_id = auth.uid()));

-- 5. RPC: admin_create_or_update_subscription
CREATE OR REPLACE FUNCTION public.admin_create_or_update_subscription(
  _candidate_id uuid,
  _amount numeric,
  _next_charge_date date DEFAULT (CURRENT_DATE + 30),
  _grace_days int DEFAULT 5,
  _status text DEFAULT 'active',
  _plan_name text DEFAULT 'Monthly Marketing'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _sub_id uuid;
  _candidate_user_id uuid;
  _invoice_id uuid;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _status NOT IN ('active','past_due','grace_period','paused','canceled','trialing','unpaid','cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  IF _grace_days < 1 OR _grace_days > 30 THEN RAISE EXCEPTION 'Grace days must be 1-30'; END IF;

  SELECT user_id INTO _candidate_user_id FROM candidates WHERE id = _candidate_id;
  IF _candidate_user_id IS NULL THEN RAISE EXCEPTION 'Candidate not found'; END IF;

  SELECT id INTO _sub_id FROM candidate_subscriptions WHERE candidate_id = _candidate_id;

  IF _sub_id IS NOT NULL THEN
    UPDATE candidate_subscriptions SET
      amount = _amount,
      next_billing_at = _next_charge_date::timestamptz,
      grace_days = _grace_days,
      status = _status::subscription_status,
      plan_name = _plan_name,
      updated_at = now()
    WHERE id = _sub_id;

    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
    VALUES (_caller_id, 'subscription_updated', 'candidate_subscription', _candidate_id,
      jsonb_build_object('amount', _amount, 'status', _status, 'next_charge_date', _next_charge_date, 'grace_days', _grace_days));
  ELSE
    INSERT INTO candidate_subscriptions (
      candidate_id, amount, status, plan_name, start_date, grace_days,
      next_billing_at, billing_cycle, currency, provider
    ) VALUES (
      _candidate_id, _amount, _status::subscription_status, _plan_name, CURRENT_DATE, _grace_days,
      _next_charge_date::timestamptz, 'monthly', 'USD', 'manual'
    ) RETURNING id INTO _sub_id;

    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
    VALUES (_caller_id, 'subscription_created', 'candidate_subscription', _candidate_id,
      jsonb_build_object('amount', _amount, 'status', _status, 'plan_name', _plan_name));

    PERFORM create_system_notification(_candidate_user_id, 'Subscription Created',
      'A monthly subscription of $' || _amount || ' has been set up for your account.',
      '/candidate-dashboard/billing');
  END IF;

  -- Auto-create scheduled invoice for next cycle if none exists
  IF NOT EXISTS (
    SELECT 1 FROM subscription_invoices
    WHERE subscription_id = _sub_id AND status = 'scheduled'
  ) THEN
    INSERT INTO subscription_invoices (subscription_id, candidate_id, period_start, period_end, amount, currency, status)
    VALUES (_sub_id, _candidate_id, _next_charge_date, _next_charge_date + 30, _amount, 'USD', 'scheduled');
  END IF;

  RETURN _sub_id;
END;
$$;

-- 6. RPC: admin_record_invoice_payment
CREATE OR REPLACE FUNCTION public.admin_record_invoice_payment(
  _invoice_id uuid,
  _payment_reference text DEFAULT '',
  _paid_at timestamptz DEFAULT now()
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _inv record;
  _sub record;
  _candidate_user_id uuid;
  _new_next date;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO _inv FROM subscription_invoices WHERE id = _invoice_id;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF _inv.status = 'paid' THEN RAISE EXCEPTION 'Invoice already paid'; END IF;

  SELECT * INTO _sub FROM candidate_subscriptions WHERE id = _inv.subscription_id;
  SELECT user_id INTO _candidate_user_id FROM candidates WHERE id = _inv.candidate_id;

  -- Mark invoice paid
  UPDATE subscription_invoices SET status = 'paid', paid_at = _paid_at, payment_reference = _payment_reference, attempted_at = now()
  WHERE id = _invoice_id;

  -- Update subscription
  _new_next := (_inv.period_end)::date;
  UPDATE candidate_subscriptions SET
    last_payment_at = _paid_at,
    next_billing_at = _new_next::timestamptz,
    failed_attempts = 0,
    status = 'active',
    grace_period_ends_at = NULL,
    updated_at = now()
  WHERE id = _inv.subscription_id;

  -- Create next scheduled invoice
  INSERT INTO subscription_invoices (subscription_id, candidate_id, period_start, period_end, amount, currency, status)
  VALUES (_inv.subscription_id, _inv.candidate_id, _new_next, _new_next + 30, _sub.amount, _sub.currency, 'scheduled');

  -- Also record in subscription_payments for backward compat
  INSERT INTO subscription_payments (subscription_id, candidate_id, amount, currency, payment_status, payment_method)
  VALUES (_inv.subscription_id, _inv.candidate_id, _inv.amount, _inv.currency, 'success', 'manual');

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'invoice_payment_recorded', 'subscription_invoice', _invoice_id,
    jsonb_build_object('amount', _inv.amount, 'reference', _payment_reference));

  PERFORM create_system_notification(_candidate_user_id, 'Payment Received',
    'Your subscription payment of $' || _inv.amount || ' has been recorded.',
    '/candidate-dashboard/billing');
END;
$$;

-- 7. RPC: admin_mark_invoice_failed
CREATE OR REPLACE FUNCTION public.admin_mark_invoice_failed(
  _invoice_id uuid,
  _reason text DEFAULT 'Payment failed'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _inv record;
  _sub record;
  _candidate_user_id uuid;
  _grace_end date;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO _inv FROM subscription_invoices WHERE id = _invoice_id;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT * INTO _sub FROM candidate_subscriptions WHERE id = _inv.subscription_id;
  SELECT user_id INTO _candidate_user_id FROM candidates WHERE id = _inv.candidate_id;

  UPDATE subscription_invoices SET status = 'failed', failure_reason = _reason, attempted_at = now()
  WHERE id = _invoice_id;

  _grace_end := CURRENT_DATE + _sub.grace_days;

  UPDATE candidate_subscriptions SET
    failed_attempts = failed_attempts + 1,
    status = 'past_due',
    grace_period_ends_at = _grace_end::timestamptz,
    updated_at = now()
  WHERE id = _inv.subscription_id;

  INSERT INTO subscription_payments (subscription_id, candidate_id, amount, currency, payment_status, payment_method)
  VALUES (_inv.subscription_id, _inv.candidate_id, _inv.amount, _inv.currency, 'failed', 'manual');

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'invoice_marked_failed', 'subscription_invoice', _invoice_id,
    jsonb_build_object('reason', _reason, 'failed_attempts', _sub.failed_attempts + 1));

  PERFORM create_system_notification(_candidate_user_id, 'Payment Failed',
    'Your subscription payment could not be processed. Please update your payment method. Grace period ends ' || _grace_end || '.',
    '/candidate-dashboard/billing');
END;
$$;

-- 8. RPC: admin_pause_or_cancel_subscription
CREATE OR REPLACE FUNCTION public.admin_pause_or_cancel_subscription(
  _subscription_id uuid,
  _action text,
  _reason text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _sub record;
  _candidate_user_id uuid;
  _new_status text;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _action NOT IN ('pause','cancel','resume') THEN RAISE EXCEPTION 'Action must be pause, cancel, or resume'; END IF;

  SELECT * INTO _sub FROM candidate_subscriptions WHERE id = _subscription_id;
  IF _sub IS NULL THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  SELECT user_id INTO _candidate_user_id FROM candidates WHERE id = _sub.candidate_id;

  IF _action = 'pause' THEN
    _new_status := 'paused';
    UPDATE candidates SET status = 'paused' WHERE id = _sub.candidate_id AND status = 'active_marketing';
  ELSIF _action = 'cancel' THEN
    _new_status := 'canceled';
    UPDATE candidate_subscriptions SET canceled_at = now() WHERE id = _subscription_id;
    UPDATE candidates SET status = 'paused' WHERE id = _sub.candidate_id AND status = 'active_marketing';
  ELSIF _action = 'resume' THEN
    _new_status := 'active';
    UPDATE candidate_subscriptions SET grace_period_ends_at = NULL, failed_attempts = 0 WHERE id = _subscription_id;
  END IF;

  UPDATE candidate_subscriptions SET status = _new_status::subscription_status, updated_at = now()
  WHERE id = _subscription_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (_caller_id, 'subscription_' || _action, 'candidate_subscription', _sub.candidate_id,
    jsonb_build_object('status', _sub.status),
    jsonb_build_object('status', _new_status, 'reason', _reason));

  PERFORM create_system_notification(_candidate_user_id,
    CASE _action
      WHEN 'pause' THEN 'Subscription Paused'
      WHEN 'cancel' THEN 'Subscription Cancelled'
      WHEN 'resume' THEN 'Subscription Resumed'
    END,
    CASE _action
      WHEN 'pause' THEN 'Your subscription has been paused. Marketing services are on hold.'
      WHEN 'cancel' THEN 'Your subscription has been cancelled.'
      WHEN 'resume' THEN 'Your subscription has been resumed! Marketing services are active again.'
    END,
    '/candidate-dashboard/billing');
END;
$$;

-- 9. Replace run_billing_checks with dry_run support
CREATE OR REPLACE FUNCTION public.run_billing_checks(_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _rec record;
  _expired_grace int := 0;
  _upcoming int := 0;
  _overdue int := 0;
  _affected jsonb := '[]'::jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  -- 1. Expired grace periods -> pause
  FOR _rec IN
    SELECT cs.id as sub_id, cs.candidate_id, c.user_id, c.status as cand_status
    FROM candidate_subscriptions cs
    JOIN candidates c ON c.id = cs.candidate_id
    WHERE cs.status IN ('past_due','grace_period')
      AND cs.grace_period_ends_at IS NOT NULL
      AND cs.grace_period_ends_at::date < CURRENT_DATE
      AND c.status = 'active_marketing'
  LOOP
    _affected := _affected || jsonb_build_object('candidate_id', _rec.candidate_id, 'action', 'pause_expired_grace');
    IF NOT _dry_run THEN
      UPDATE candidates SET status = 'paused' WHERE id = _rec.candidate_id;
      UPDATE candidate_subscriptions SET status = 'paused' WHERE id = _rec.sub_id;
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
      VALUES (auth.uid(), 'marketing_paused_due_to_billing', 'candidate', _rec.candidate_id,
        jsonb_build_object('reason', 'grace_period_expired'));
      PERFORM create_system_notification(_rec.user_id, 'Marketing Paused',
        'Your marketing has been paused due to an outstanding billing issue.',
        '/candidate-dashboard/billing');
    END IF;
    _expired_grace := _expired_grace + 1;
  END LOOP;

  -- 2. Overdue: active subs where next_billing_at < today, no scheduled invoice
  FOR _rec IN
    SELECT cs.id as sub_id, cs.candidate_id, cs.amount, cs.currency, c.user_id
    FROM candidate_subscriptions cs
    JOIN candidates c ON c.id = cs.candidate_id
    WHERE cs.status = 'active'
      AND cs.next_billing_at IS NOT NULL
      AND cs.next_billing_at::date <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM subscription_invoices si
        WHERE si.subscription_id = cs.id AND si.status = 'scheduled'
      )
  LOOP
    _affected := _affected || jsonb_build_object('candidate_id', _rec.candidate_id, 'action', 'create_overdue_invoice');
    IF NOT _dry_run THEN
      INSERT INTO subscription_invoices (subscription_id, candidate_id, period_start, period_end, amount, currency, status)
      VALUES (_rec.sub_id, _rec.candidate_id, CURRENT_DATE, CURRENT_DATE + 30, _rec.amount, _rec.currency, 'scheduled');
    END IF;
    _overdue := _overdue + 1;
  END LOOP;

  -- 3. Upcoming: next_billing_at in 3 days
  FOR _rec IN
    SELECT cs.candidate_id, c.user_id, cs.amount
    FROM candidate_subscriptions cs
    JOIN candidates c ON c.id = cs.candidate_id
    WHERE cs.status = 'active'
      AND cs.next_billing_at::date = CURRENT_DATE + 3
  LOOP
    _affected := _affected || jsonb_build_object('candidate_id', _rec.candidate_id, 'action', 'upcoming_reminder');
    IF NOT _dry_run THEN
      PERFORM create_system_notification(_rec.user_id, 'Upcoming Charge',
        'Your monthly subscription of $' || _rec.amount || ' will be charged in 3 days.',
        '/candidate-dashboard/billing');
    END IF;
    _upcoming := _upcoming + 1;
  END LOOP;

  _result := jsonb_build_object(
    'dry_run', _dry_run,
    'expired_grace_paused', _expired_grace,
    'overdue_invoices_created', _overdue,
    'upcoming_reminders', _upcoming,
    'affected', _affected
  );

  RETURN _result;
END;
$$;
