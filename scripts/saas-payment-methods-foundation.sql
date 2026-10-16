-- Kivra SaaS: payment evidence and provider transaction integrity.
-- Apply manually in Neon only after reviewing existing data.
-- This migration does not activate access restrictions or charge any account.

CREATE TABLE IF NOT EXISTS public.saas_transfer_submissions (
  id BIGSERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  gym_id INTEGER NOT NULL REFERENCES public.gyms(id) ON DELETE RESTRICT,
  submitted_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  operation_number VARCHAR(120) NOT NULL,
  receipt_storage_key TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'under_review'
    CHECK (status IN ('under_review', 'approved', 'rejected', 'expired')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provisional_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  CONSTRAINT saas_transfer_operation_nonblank CHECK (length(btrim(operation_number)) > 0),
  CONSTRAINT saas_transfer_receipt_nonblank CHECK (length(btrim(receipt_storage_key)) > 0),
  CONSTRAINT saas_transfer_review_consistency CHECK (
    (status = 'under_review' AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status = 'expired')
    OR (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

-- Only one provisional grant per invoice, even if the receipt is rejected.
CREATE UNIQUE INDEX IF NOT EXISTS saas_transfer_one_submission_per_invoice
  ON public.saas_transfer_submissions(invoice_id);

CREATE INDEX IF NOT EXISTS saas_transfer_review_queue
  ON public.saas_transfer_submissions(status, submitted_at);

-- Dedicated records for Mercado Pago payments TO Kivra (not gym member payments).
CREATE TABLE IF NOT EXISTS public.saas_mp_payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  gym_id INTEGER NOT NULL REFERENCES public.gyms(id) ON DELETE RESTRICT,
  mp_payment_id VARCHAR(120) NOT NULL UNIQUE,
  mp_account_id VARCHAR(120),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  provider_status VARCHAR(32) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saas_mp_payments_invoice
  ON public.saas_mp_payments(invoice_id);

-- Billing periods are calendar months; the due date is the 10th of the month.
-- Existing subscription dates and invoices are intentionally NOT rewritten.
-- Access must not be restricted until the server-side gate and recovery flow
-- have been tested with a dedicated test gym.
