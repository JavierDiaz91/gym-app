-- Server-time access decision for a SINGLE gym.
-- Read-only function; do not activate restrictions until tested.
-- Assumes calendar invoices exist and historical billing is reconciled.
-- Access is allowed during the 1st-10th, on approved payment, or
-- within the first 48 hours of an under-review transfer.
-- A rejection or 48-hour expiration ends provisional access immediately.
CREATE OR REPLACE FUNCTION public.kivra_saas_access_preview(p_gym_id integer)
RETURNS TABLE (
  allowed boolean,
  reason text,
  overdue_invoice_id integer,
  provisional_until timestamptz
) LANGUAGE sql STABLE AS $$
  WITH debt AS (
    SELECT i.id, i.due_date
    FROM public.saas_invoices i
    WHERE i.gym_id = p_gym_id
      AND i.status IN ('pending', 'overdue')
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_DATE
    ORDER BY i.due_date ASC, i.id ASC
    LIMIT 1
  ), access AS (
    SELECT d.id, t.provisional_until,
           (t.status = 'under_review' AND t.provisional_until > NOW()) AS provisional
    FROM debt d
    LEFT JOIN public.saas_transfer_submissions t ON t.invoice_id = d.id
  )
  SELECT
    CASE WHEN NOT EXISTS (SELECT 1 FROM debt) THEN true
         ELSE COALESCE((SELECT provisional FROM access), false) END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM debt) THEN 'no_overdue_invoice'
         WHEN COALESCE((SELECT provisional FROM access), false) THEN 'transfer_under_review'
         ELSE 'overdue' END,
    (SELECT id FROM debt),
    (SELECT provisional_until FROM access);
$$;
REVOKE ALL ON FUNCTION public.kivra_saas_access_preview(integer) FROM PUBLIC;

-- WARNING: this is a preview, NOT an authorization gate.
-- Pending debt without a generated invoice will not be detected.
-- Multiple overdue invoices require a consolidated policy: the preview
-- checks only the oldest. Server-side actions and APIs are NOT protected.
