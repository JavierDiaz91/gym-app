-- Read-only operational audit before enabling Kivra SaaS access restrictions.
-- Inspect results and reconcile manually. Never automatically suspend
-- a gym based on this report alone.
WITH active_gym_subscriptions AS (
  SELECT s.id, s.gym_id, s.status, s.started_at,
         date_trunc('month', CURRENT_DATE)::date AS month_start,
         (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date AS month_end
  FROM public.gym_saas_subscriptions s
  WHERE s.status IN ('active', 'past_due')
), current_month AS (
  SELECT s.id AS subscription_id, s.gym_id, s.started_at,
         s.month_start, s.month_end,
         COUNT(i.id) AS active_invoices,
         COUNT(i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices,
         COUNT(i.id) FILTER (WHERE i.status IN ('pending','overdue')) AS unpaid_invoices
  FROM active_gym_subscriptions s
  LEFT JOIN public.saas_invoices i
    ON i.subscription_id = s.id AND i.status <> 'cancelled'
   AND i.period_start <= s.month_end AND i.period_end >= s.month_start
  GROUP BY s.id, s.gym_id, s.started_at, s.month_start, s.month_end
)
SELECT gym_id, subscription_id, month_start, month_end, started_at,
       active_invoices, paid_invoices, unpaid_invoices,
       CASE
         WHEN active_invoices = 0 THEN 'MISSING_CURRENT_MONTH_INVOICE'
         WHEN active_invoices > 1 THEN 'OVERLAPPING_INVOICES'
         ELSE 'OK'
       END AS audit_result
FROM current_month
ORDER BY audit_result, gym_id;

-- Separate check for duplicate/overlapping active invoices in all periods.
SELECT a.subscription_id, a.id AS invoice_a, b.id AS invoice_b,
       a.period_start AS a_start, a.period_end AS a_end,
       b.period_start AS b_start, b.period_end AS b_end
FROM public.saas_invoices a
JOIN public.saas_invoices b
  ON b.subscription_id = a.subscription_id
 AND b.id > a.id
 AND b.status <> 'cancelled'
 AND a.period_start <= b.period_end
 AND b.period_start <= a.period_end
WHERE a.status <> 'cancelled'
ORDER BY a.subscription_id, a.id, b.id;
