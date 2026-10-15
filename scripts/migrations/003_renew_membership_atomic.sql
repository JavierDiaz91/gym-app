-- Apply AFTER 002_scheduled_membership_renewals.sql.
-- One renewal at a time per member, with tenant and plan checks.
CREATE OR REPLACE FUNCTION public.renew_gym_membership(
  p_gym_id integer,
  p_member_id integer,
  p_plan_id integer,
  p_payment_status text DEFAULT 'pending',
  p_amount_paid numeric DEFAULT 0
) RETURNS subscriptions
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan membership_plans%ROWTYPE;
  v_last_end date;
  v_start date;
  v_result subscriptions%ROWTYPE;
BEGIN
  IF p_payment_status NOT IN ('pending','paid') THEN
    RAISE EXCEPTION 'Estado de pago invalido';
  END IF;
  -- Serializes renewals for the same member, including from other callers.
  PERFORM 1 FROM members WHERE id=p_member_id AND gym_id=p_gym_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Miembro no encontrado'; END IF;
  SELECT * INTO v_plan FROM membership_plans
    WHERE id=p_plan_id AND gym_id=p_gym_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
  IF v_plan.duration_months IS NULL OR v_plan.duration_months <= 0 THEN
    RAISE EXCEPTION 'Duracion de plan invalida';
  END IF;
  -- Normalize past periods before checking the one-scheduled-renewal rule.
  -- Date validity remains authoritative even if a job has not run.
  UPDATE subscriptions
     SET status='expired', updated_at=NOW()
   WHERE member_id=p_member_id
     AND status IN ('active','scheduled')
     AND end_date <= CURRENT_DATE;
  UPDATE subscriptions
     SET status='active', updated_at=NOW()
   WHERE member_id=p_member_id
     AND status='scheduled'
     AND start_date <= CURRENT_DATE
     AND end_date > CURRENT_DATE;
  IF EXISTS (
    SELECT 1 FROM subscriptions
    WHERE member_id=p_member_id AND status='scheduled'
  ) THEN RAISE EXCEPTION 'Ya existe una renovacion programada'; END IF;
  SELECT MAX(end_date)::date INTO v_last_end
    FROM subscriptions
    WHERE member_id=p_member_id
      AND status IN ('active','scheduled')
      AND end_date > CURRENT_DATE;
  v_start := GREATEST(CURRENT_DATE, COALESCE(v_last_end,CURRENT_DATE));
  INSERT INTO subscriptions (
    member_id,plan_id,start_date,end_date,status,payment_status,amount_paid
  ) VALUES (
    p_member_id,p_plan_id,v_start,
    (v_start + make_interval(months => v_plan.duration_months))::date,
    CASE WHEN v_start > CURRENT_DATE THEN 'scheduled' ELSE 'active' END,
    p_payment_status,p_amount_paid
  ) RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
