-- Kivra: registro QR transaccional. Aplicar en una rama de desarrollo de Neon
-- antes de desplegar la version de app/actions.ts que llama a esta funcion.
-- Requiere el indice ux_members_gym_email creado previamente.
CREATE OR REPLACE FUNCTION public.register_gym_member(
  p_gym_id bigint,
  p_email text,
  p_password_hash text,
  p_first_name text,
  p_last_name text,
  p_phone text
)
RETURNS TABLE(user_id bigint, member_id bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member_id bigint;
  v_member_user_id bigint;
  v_user_id bigint;
  v_status text;
  v_plan_status text;
  v_period_end date;
  v_max_members integer;
  v_count bigint;
BEGIN
  -- Serializa las altas y modificaciones que adopten el mismo bloqueo de gimnasio.
  SELECT status INTO v_status FROM public.gyms WHERE id = p_gym_id FOR UPDATE;
  IF NOT FOUND OR v_status <> 'active' THEN
    RAISE EXCEPTION 'El gimnasio no está disponible para registros.';
  END IF;

  SELECT s.status, s.current_period_end::date, p.max_members
    INTO v_plan_status, v_period_end, v_max_members
  FROM public.gym_saas_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.gym_id = p_gym_id
  LIMIT 1;

  IF NOT FOUND OR v_plan_status <> 'active'
     OR (v_period_end IS NOT NULL AND v_period_end < CURRENT_DATE) THEN
    RAISE EXCEPTION 'El gimnasio no tiene una suscripción SaaS vigente.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(btrim(email)) = p_email) THEN
    RAISE EXCEPTION 'El correo ya tiene una cuenta registrada.';
  END IF;

  SELECT id, members.user_id INTO v_member_id, v_member_user_id
  FROM public.members
  WHERE gym_id = p_gym_id AND lower(btrim(email)) = p_email
  FOR UPDATE;

  IF v_member_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'La ficha ya está vinculada a una cuenta.';
  END IF;

  IF v_member_id IS NULL AND v_max_members IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.members WHERE gym_id = p_gym_id;
    IF v_count >= v_max_members THEN
      RAISE EXCEPTION 'Se alcanzó el límite de alumnos del plan SaaS.';
    END IF;
  END IF;

  INSERT INTO public.users (email, password_hash, role, gym_id)
  VALUES (p_email, p_password_hash, 'member', p_gym_id)
  RETURNING id INTO v_user_id;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.members
    SET user_id = v_user_id,
        phone = coalesce(nullif(p_phone, ''), phone)
    WHERE id = v_member_id AND gym_id = p_gym_id AND user_id IS NULL
    RETURNING id INTO v_member_id;
    IF v_member_id IS NULL THEN
      RAISE EXCEPTION 'No se pudo vincular la ficha existente.';
    END IF;
  ELSE
    INSERT INTO public.members
      (user_id, gym_id, first_name, last_name, email, phone, status, join_date)
    VALUES
      (v_user_id, p_gym_id, p_first_name, p_last_name, p_email,
       nullif(p_phone, ''), 'active', now())
    RETURNING id INTO v_member_id;
  END IF;

  RETURN QUERY SELECT v_user_id, v_member_id;
END;
$$;
