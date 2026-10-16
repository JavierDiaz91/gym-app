-- Kivra SaaS: calendar-month invoice creation, transactionally.
-- Run ONLY after reconciling the read-only readiness report.
-- Does not alter existing subscription periods or paid invoices.
-- Does not restrict access. No cron is enabled by this migration.
-- The caller must be a real SuperAdmin user.
CREATE OR REPLACE FUNCTION public.create_calendar_saas_invoice(
  p_subscription_id integer,
  p_month date,
  p_actor_user_id integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription record;
  v_month_start date;
  v_month_end date;
  v_due date;
  v_amount numeric;
  v_id integer;
BEGIN
  IF p_month IS NULL OR p_subscription_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Parámetros obligatorios faltantes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Se requiere un usuario SuperAdmin válido';
  END IF;
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::date;
  v_due := v_month_start + 9;

  SELECT s.id, s.gym_id, s.status, s.started_at,
         COALESCE(s.price_override, p.monthly_price) AS price
  INTO v_subscription
  FROM public.gym_saas_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.id = p_subscription_id
  FOR UPDATE OF s;

  IF NOT FOUND OR v_subscription.status NOT IN ('active', 'past_due') THEN
    RAISE EXCEPTION 'Suscripción inexistente o no facturable';
  END IF;
  IF v_month_start < date_trunc('month', v_subscription.started_at)::date THEN
    RAISE EXCEPTION 'No se puede facturar un mes anterior al alta del gimnasio';
  END IF;
  v_amount := v_subscription.price;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'El plan no tiene un precio válido';
  END IF;

  -- Avoid double billing if a historical non-calendar invoice overlaps.
  IF EXISTS (
    SELECT 1 FROM public.saas_invoices i
    WHERE i.subscription_id = p_subscription_id
      AND i.status <> 'cancelled'
      AND (i.period_start IS NULL OR i.period_end IS NULL
        OR (i.period_start <= v_month_end AND i.period_end >= v_month_start))
  ) THEN
    RAISE EXCEPTION 'Existe una factura activa superpuesta o sin período; requiere conciliación';
  END IF;

  INSERT INTO public.saas_invoices (
    gym_id, subscription_id, period_start, period_end, amount, status, due_date, created_at
  ) VALUES (
    v_subscription.gym_id, p_subscription_id, v_month_start, v_month_end,
    v_amount, 'pending', v_due, NOW()
  ) RETURNING id INTO v_id;

  INSERT INTO public.saas_audit_log
    (actor_user_id, action, entity_type, entity_id, gym_id, details)
  VALUES (
    p_actor_user_id, 'saas_calendar_invoice_created', 'saas_invoice',
    v_id::text, v_subscription.gym_id,
    jsonb_build_object('periodStart', v_month_start, 'periodEnd', v_month_end, 'dueDate', v_due)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_calendar_saas_invoice(integer, date, integer) FROM PUBLIC;
-- The application must call this function only from an authenticated
-- SuperAdmin server action. Never expose it through an unauthenticated API.
