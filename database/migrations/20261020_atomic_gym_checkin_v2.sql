-- PASO 2: check-in atomico para membresias pagadas y pases por ingresos.
-- DEPENDENCIAS: ejecutar primero 20261020_membership_flexible_access_foundation.sql
-- y 20261020_attendance_subscription_link.sql
-- NO EJECUTAR NI ACTIVAR EN PRODUCCION SIN PRUEBAS EN NEON DE DESARROLLO.
-- La API actual aun utiliza registerCheckIn: este procedimiento NO esta conectado.
-- Se debe impedir la venta de pases superpuestos o definir una prioridad
-- explicita de consumo. Los check-ins legacy no se contabilizan como cupos.

BEGIN;

CREATE OR REPLACE FUNCTION public.register_gym_checkin_v2(
  p_gym_id bigint,
  p_identifier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member record;
  v_sub record;
  v_used bigint;
  v_attendance_id bigint;
  v_check_in timestamptz;
BEGIN
  IF p_gym_id IS NULL OR p_gym_id <= 0
     OR nullif(btrim(p_identifier), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_INPUT',
                              'message', 'Gimnasio e identificador requeridos');
  END IF;

  SELECT m.id, m.first_name, m.last_name
    INTO v_member
  FROM public.members m
  LEFT JOIN public.users u ON u.id = m.user_id
  WHERE m.gym_id = p_gym_id
    AND (m.dni = btrim(p_identifier)
      OR u.email = btrim(p_identifier)
      OR m.id::text = btrim(p_identifier))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND',
                              'message', 'Socio no encontrado');
  END IF;

  -- Serializa todos los check-ins v2 de este socio, incluso desde distintos
  -- dispositivos. No evita escrituras hechas por codigo antiguo fuera de v2.
  PERFORM pg_advisory_xact_lock(48001, v_member.id::integer);

  SELECT s.id, s.start_date, s.end_date, mp.name AS plan_name,
         mp.access_mode, mp.max_entries
    INTO v_sub
  FROM public.subscriptions s
  JOIN public.membership_plans mp
    ON mp.id = s.plan_id AND mp.gym_id = p_gym_id
  WHERE s.member_id = v_member.id
    AND s.status IN ('active', 'scheduled')
    AND s.payment_status = 'paid'
    AND s.start_date <= CURRENT_DATE
    AND s.end_date > CURRENT_DATE
  ORDER BY s.start_date DESC, s.id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'SUBSCRIPTION_EXPIRED',
                              'message', 'Membresia vencida o inactiva');
  END IF;

  -- Evita que dos lecturas consecutivas del QR generen dos asistencias.
  IF EXISTS (
    SELECT 1 FROM public.attendance a
    WHERE a.member_id = v_member.id
      AND a.check_in >= now() - interval '60 seconds'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_CHECKIN',
                              'message', 'Ingreso registrado recientemente');
  END IF;

  IF v_sub.access_mode = 'entry_pack' THEN
    IF v_sub.max_entries IS NULL OR v_sub.max_entries <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_PLAN',
                                'message', 'Pase sin cantidad de ingresos valida');
    END IF;

    -- Cada ingreso se carga a la suscripcion que autorizo el acceso.
    -- Los check-ins historicos con subscription_id NULL no se descuentan.
    SELECT count(*) INTO v_used
    FROM public.attendance a
    WHERE a.member_id = v_member.id
      AND a.subscription_id = v_sub.id;

    IF v_used >= v_sub.max_entries THEN
      RETURN jsonb_build_object('success', false, 'code', 'ENTRY_LIMIT_REACHED',
                                'message', 'El pase no tiene ingresos disponibles',
                                'entries_remaining', 0);
    END IF;
  END IF;

  INSERT INTO public.attendance (member_id, subscription_id, check_in)
  VALUES (v_member.id, v_sub.id, now())
  RETURNING id, check_in INTO v_attendance_id, v_check_in;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Acceso permitido',
    'member', jsonb_build_object(
      'id', v_member.id,
      'name', concat_ws(' ', v_member.first_name, v_member.last_name),
      'plan', v_sub.plan_name,
      'endDate', v_sub.end_date
    ),
    'attendance_id', v_attendance_id,
    'subscription_id', v_sub.id,
    'checkInTime', v_check_in,
    'entries_remaining', CASE
      WHEN v_sub.access_mode = 'entry_pack'
        THEN v_sub.max_entries - v_used - 1
      ELSE NULL
    END
  );
END;
$$;

-- Sin privilegios anonimos por defecto; conceder EXECUTE solo al rol de
-- backend autorizado, luego de validar los permisos reales de Neon.
REVOKE ALL ON FUNCTION public.register_gym_checkin_v2(bigint, text) FROM PUBLIC;

COMMIT;
