-- Kivra SaaS: server-time billing access decision.
-- READ-ONLY; gate remains disabled by default and test-gym scoped.
-- Every overdue invoice must be paid OR have an active 48-hour
-- provisional transfer. A second overdue invoice cannot be hidden by
-- submitting a receipt for a different invoice.
CREATE OR REPLACE FUNCTION public.kivra_saas_access_preview(p_gym_id integer)
RETURNS TABLE (
  allowed boolean,
  reason text,
  overdue_invoice_id integer,
  provisional_until timestamptz
) LANGUAGE sql STABLE AS $$
  WITH debts AS (
    SELECT i.id, i.due_date,
           t.provisional_until,
           COALESCE(t.status = 'under_review' AND t.provisional_until > NOW(), FALSE) AS provisional
    FROM public.saas_invoices i
    LEFT JOIN public.saas_transfer_submissions t ON t.invoice_id = i.id
    WHERE i.gym_id = p_gym_id
      AND i.status IN ('pending', 'overdue')
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_DATE
  ), summary AS (
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE NOT provisional) AS unprotected
    FROM debts
  ), oldest_unprotected AS (
    SELECT id FROM debts WHERE NOT provisional ORDER BY due_date, id LIMIT 1
  ), oldest_debt AS (
    SELECT id, provisional_until FROM debts ORDER BY due_date, id LIMIT 1
  )
  SELECT
    (summary.unprotected = 0),
    CASE WHEN summary.total = 0 THEN 'no_overdue_invoice'
         WHEN summary.unprotected = 0 THEN 'transfer_under_review'
         ELSE 'overdue' END,
    COALESCE((SELECT id FROM oldest_unprotected), (SELECT id FROM oldest_debt)),
    CASE WHEN summary.unprotected = 0 THEN
      (SELECT MIN(provisional_until) FROM debts)
    ELSE NULL END
  FROM summary;
$$;
REVOKE ALL ON FUNCTION public.kivra_saas_access_preview(integer) FROM PUBLIC;

-- LIMITATION: only existing invoices are considered. Missing monthly invoices
-- require reconciliation/generation before enabling this gate. The function
-- does not authorize routes by itself.
