-- Aplicar primero en Neon dev-kivra-registro.
-- Alta administrativa atomica, serializada con register_gym_member.
CREATE OR REPLACE FUNCTION public.create_gym_member_admin(
  p_gym_id bigint,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_emergency_contact text,
  p_plan_id bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_subscription_status text;
  v_period_end date;
  v_max_members integer;
  v_count bigint;
  v_member_id bigint;
  v_plan_exists boolean;
  v_start date := CURRENT_DATE;
  v_end date := (CURRENT_DATE + INTERVAL '1 month')::date;
  v_email text := lower(btrim(p_email));
BEGIN
  IF nullif(btrim(p_first_name), '') IS NULL
     OR nullif(btrim(p_last_name), '') IS NULL
     OR nullif(v_email, '') IS NULL THEN
    RAISE EXCEPTION 'Nombre, apellido y correo son obligatorios.';
  END IF;

  SELECT status INTO v_status
  FROM public.gyms WHERE id = p_gym_id FOR UPDATE;
  IF NOT FOUND OR v_status <> 'active' THEN
    RAISE EXCEPTION 'El gimnasio no está disponible.';
  END IF;

  SELECT s.status, s.current_period_end, p.max_members
    INTO v_subscription_status, v_period_end, v_max_members
  FROM public.gym_saas_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.gym_id = p_gym_id
  ORDER BY s.id DESC LIMIT 1;

  IF NOT FOUND OR v_subscription_status <> 'active'
     OR (v_period_end IS NOT NULL AND v_period_end < CURRENT_DATE) THEN
    RAISE EXCEPTION 'El gimnasio no tiene una suscripción SaaS vigente.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.members
    WHERE gym_id = p_gym_id AND lower(btrim(email)) = v_email
  ) THEN
    RAISE EXCEPTION 'Ya existe un socio registrado con este correo electrónico.';
  END IF;

  IF v_max_members IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.members WHERE gym_id = p_gym_id;
    IF v_count >= v_max_members THEN
      RAISE EXCEPTION 'Se alcanzó el límite de alumnos del plan SaaS.';
    END IF;
  END IF;

  IF p_plan_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.membership_plans
      WHERE id = p_plan_id AND gym_id = p_gym_id
    ) INTO v_plan_exists;
    IF NOT v_plan_exists THEN
      RAISE EXCEPTION 'El plan de membresía no pertenece al gimnasio.';
    END IF;
  END IF;

  INSERT INTO public.members
    (gym_id, first_name, last_name, email, phone, emergency_contact, status)
  VALUES
    (p_gym_id, btrim(p_first_name), btrim(p_last_name), v_email,
     nullif(btrim(p_phone), ''), nullif(btrim(p_emergency_contact), ''), 'active')
  RETURNING id INTO v_member_id;

  IF p_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (member_id, plan_id, start_date, end_date, status)
    VALUES (v_member_id, p_plan_id, v_start, v_end, 'active');
  END IF;

  RETURN v_member_id;
END;
$$;
