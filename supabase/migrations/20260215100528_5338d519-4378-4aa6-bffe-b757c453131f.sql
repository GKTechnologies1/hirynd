
-- Add unique index to prevent duplicate invoices per subscription per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_invoice_per_period 
ON public.subscription_invoices (subscription_id, period_start, period_end);
