-- Calendar-month billing readiness report (READ ONLY).
-- Execute in Neon before migrating existing subscriptions.
-- All dates below use PostgreSQL CURRENT_DATE (database timezone).

WITH periods AS (
  SELECT s.id, s.gym_id, s.status, s.current_period_start, s.current_period_end,
         date_trunc('month', CURRENT_DATE)::date AS target_start,
         (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date AS target_end,
         (date_trunc('month', CURRENT_DATE) + INTERVAL '9 days')::date AS target_due
  FROM public.gym_saas_subscriptions s
)
SELECT p.*,
       (p.current_period_start IS DISTINCT FROM p.target_start
        OR p.current_period_end IS DISTINCT FROM p.target_end) AS requires_alignment,
       (SELECT COUNT(*) FROM public.saas_invoices i
        WHERE i.subscription_id = p.id AND i.status <> 'cancelled'
          AND i.period_start <= p.target_end AND i.period_end >= p.target_start) AS overlapping_invoices,
       (SELECT COUNT(*) FROM public.saas_invoices i
        WHERE i.subscription_id = p.id AND i.status = 'paid'
          AND i.period_start <= p.target_end AND i.period_end >= p.target_start) AS overlapping_paid_invoices,
       (SELECT COUNT(*) FROM public.saas_invoices i
        WHERE i.subscription_id = p.id AND i.status <> 'cancelled'
          AND (i.period_start IS NULL OR i.period_end IS NULL)) AS invoices_without_period
FROM periods p
ORDER BY p.gym_id;

-- DO NOT automatically rewrite existing dates: paid/overlapping invoices,
-- trials and pending plan changes need individual reconciliation.
-- Calendar periods: first day through last day INCLUSIVE.
-- Due date: 10th of that same month; unpaid restriction from the 11th.
-- No charges or suspensions are performed by this script.
