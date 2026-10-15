-- Apply after 002 and 003. Enrollment and optional membership are atomic.
CREATE OR REPLACE FUNCTION public.create_gym_member_with_plan(
  p_gym_id integer,
  p_first_name text,
  p_last_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_emergency_contact text DEFAULT NULL,
  p_plan_id integer DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_member_id integer;
BEGIN
  IF NULLIF(BTRIM(p_first_name), '') IS NULL
     OR NULLIF(BTRIM(p_last_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nombre y apellido son obligatorios';
  END IF;
  IF p_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM membership_plans
    WHERE id=p_plan_id AND gym_id=p_gym_id AND is_active=true
  ) THEN
    RAISE EXCEPTION 'Plan inexistente o inactivo';
  END IF;
  INSERT INTO members (
    gym_id,first_name,last_name,email,phone,emergency_contact
  ) VALUES (
    p_gym_id,BTRIM(p_first_name),BTRIM(p_last_name),
    NULLIF(BTRIM(p_email),''),
    NULLIF(BTRIM(p_phone),''),
    NULLIF(BTRIM(p_emergency_contact),'')
  ) RETURNING id INTO v_member_id;
  IF p_plan_id IS NOT NULL THEN
    PERFORM public.renew_gym_membership(
      p_gym_id,v_member_id,p_plan_id,'pending',0
    );
  END IF;
  RETURN v_member_id;
END;
$$;
