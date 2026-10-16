-- Calendar-month renewal engine: safe pilot ONLY.
-- This function creates invoices for ONE explicitly selected gym and month.
-- It never rewrites historical invoices, suspends gyms or changes plans.
-- Call from a secret-protected server endpoint, NOT the browser.
-- Prerequisites: saas-admin-schema.sql and saas-payment-methods-foundation.sql.

CREATE OR REPLACE FUNCTION public.kivra_generate_monthly_invoice_pilot(
  p_gym_id integer,
  p_month date,
  p_actor_user_id integer
) RETURNS TABLE(invoice_id integer, result text)
LANGUAGE plpgsql AS $$
DECLARE
  v_sub record;
  v_start date;
  v_end date;
  v_id integer;
  v_existing record;
BEGIN
  IF p_gym_id IS NULL OR p_gym_id <= 0 OR p_month IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Parámetros o SuperAdmin inválidos';
  END IF;

  v_start := date_trunc('month', p_month)::date;
  v_end := (v_start + interval '1 month - 1 day')::date;
  IF v_start > date_trunc('month', CURRENT_DATE)::date THEN
    RAISE EXCEPTION 'No se permite facturar meses futuros en el piloto';
  END IF;

  SELECT s.id, s.gym_id, s.status, s.started_at,
         COALESCE(s.price_override, p.monthly_price) AS amount
  INTO v_sub
  FROM public.gym_saas_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.gym_id = p_gym_id
  FOR UPDATE OF s;

  IF NOT FOUND OR v_sub.status NOT IN ('active', 'past_due') THEN
    RAISE EXCEPTION 'El gimnasio no tiene una suscripción facturable';
  END IF;
  IF v_start < date_trunc('month', v_sub.started_at)::date THEN
    invoice_id := NULL; result := 'before_onboarding'; RETURN NEXT; RETURN;
  END IF;
  IF v_sub.amount IS NULL OR v_sub.amount <= 0 THEN
    RAISE EXCEPTION 'El precio SaaS no está configurado';
  END IF;

  -- Reject historical overlap rather than silently double-charge.
  SELECT i.id, i.period_start, i.period_end INTO v_existing
  FROM public.saas_invoices i
  WHERE i.subscription_id = v_sub.id AND i.status <> 'cancelled'
    AND (i.period_start IS NULL OR i.period_end IS NULL
         OR (i.period_start <= v_end AND i.period_end >= v_start))
  ORDER BY i.id LIMIT 1;

  IF FOUND THEN
    IF v_existing.period_start = v_start AND v_existing.period_end = v_end THEN
      invoice_id := v_existing.id; result := 'already_exists';
      RETURN NEXT; RETURN;
    END IF;
    RAISE EXCEPTION 'Existe factura histórica superpuesta: %', v_existing.id;
  END IF;

  INSERT INTO public.saas_invoices (
    gym_id, subscription_id, period_start, period_end, amount, status, due_date, created_at
  ) VALUES (
    p_gym_id, v_sub.id, v_start, v_end, v_sub.amount, 'pending', v_start + 9, NOW()
  ) RETURNING id INTO v_id;

  INSERT INTO public.saas_audit_log
    (actor_user_id, action, entity_type, entity_id, gym_id, details)
  VALUES (p_actor_user_id, 'saas_pilot_calendar_invoice_created',
          'saas_invoice', v_id::text, p_gym_id,
          jsonb_build_object('periodStart', v_start, 'periodEnd', v_end, 'dueDate', v_start + 9));

  invoice_id := v_id; result := 'created'; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.kivra_generate_monthly_invoice_pilot(integer, date, integer) FROM PUBLIC;
