-- Kivra SaaS - motor de renovacion transaccional (instalacion, SIN cron).
-- Requiere columnas pending_plan_id y pending_plan_effective_date.
-- No modifica datos hasta invocar explicitamente la funcion.
-- Primero comprobar duplicados de facturas no canceladas:
-- SELECT subscription_id, period_start, period_end, count(*)
-- FROM saas_invoices WHERE status <> 'cancelled'
-- GROUP BY 1,2,3 HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS saas_invoice_one_active_per_period
ON public.saas_invoices (subscription_id, period_start, period_end)
WHERE status <> 'cancelled';

CREATE OR REPLACE FUNCTION public.renew_due_saas_subscriptions(
  p_actor_user_id integer,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(subscription_id integer, gym_id integer, invoice_id integer, new_plan_id integer)
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  v_plan_id integer;
  v_amount numeric;
  v_invoice_id integer;
  v_end date;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Se requiere un usuario superadmin valido';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Limite fuera de rango';
  END IF;

  FOR r IN
    SELECT s.*
    FROM public.gym_saas_subscriptions s
    WHERE s.status = 'active'
      AND s.current_period_end <= CURRENT_DATE
    ORDER BY s.current_period_end, s.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  LOOP
    -- No avanzar si la factura del periodo que termina sigue sin pagar.
    IF NOT EXISTS (
      SELECT 1 FROM public.saas_invoices i
      WHERE i.subscription_id = r.id
        AND i.period_start = r.current_period_start
        AND i.period_end = r.current_period_end
        AND i.status = 'paid'
    ) THEN
      CONTINUE;
    END IF;

    IF r.pending_plan_id IS NOT NULL
       AND (r.pending_plan_effective_date IS DISTINCT FROM r.current_period_end) THEN
      RAISE EXCEPTION 'Fecha pendiente inconsistente para suscripcion %', r.id;
    END IF;

    v_plan_id := COALESCE(r.pending_plan_id, r.plan_id);
    SELECT COALESCE(r.price_override, p.monthly_price)
    INTO v_amount
    FROM public.saas_plans p
    WHERE p.id = v_plan_id AND p.status = 'active';

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Plan % no activo o sin precio valido', v_plan_id;
    END IF;

    -- Los periodos se encadenan desde la fecha anterior, sin perder dias.
    v_end := (r.current_period_end + INTERVAL '1 month')::date;

    INSERT INTO public.saas_invoices (
      gym_id, subscription_id, period_start, period_end,
      amount, status, due_date, created_at
    ) VALUES (
      r.gym_id, r.id, r.current_period_end, v_end,
      v_amount, 'pending', v_end, NOW()
    )
    ON CONFLICT (subscription_id, period_start, period_end)
      WHERE status <> 'cancelled'
    DO NOTHING
    RETURNING id INTO v_invoice_id;

    -- Si ya existia, NO avanzar: puede ser otra ejecucion o factura manual.
    IF v_invoice_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.gym_saas_subscriptions
    SET plan_id = v_plan_id,
        current_period_start = r.current_period_end,
        current_period_end = v_end,
        next_billing_date = v_end,
        pending_plan_id = NULL,
        pending_plan_effective_date = NULL,
        updated_at = NOW()
    WHERE id = r.id;

    INSERT INTO public.saas_audit_log
      (actor_user_id, action, entity_type, entity_id, gym_id, details)
    VALUES (
      p_actor_user_id, 'gym_saas_subscription_renewed',
      'gym_saas_subscription', r.id::text, r.gym_id,
      jsonb_build_object(
        'previousPlanId', r.plan_id, 'newPlanId', v_plan_id,
        'previousPeriodEnd', r.current_period_end,
        'newPeriodEnd', v_end, 'invoiceId', v_invoice_id,
        'amount', v_amount
      )
    );

    subscription_id := r.id;
    gym_id := r.gym_id;
    invoice_id := v_invoice_id;
    new_plan_id := v_plan_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- No conceder ejecucion a roles de la aplicacion/publico.
REVOKE ALL ON FUNCTION public.renew_due_saas_subscriptions(integer, integer) FROM PUBLIC;

-- Comprobacion sin efectos:
-- SELECT id, gym_id, plan_id, pending_plan_id, current_period_end
-- FROM public.gym_saas_subscriptions WHERE current_period_end <= CURRENT_DATE;
-- NO ejecutar SELECT renew_due_saas_subscriptions(...) en produccion sin validar antes.
