
-- PASO 2: Check-in atomico para membresias pagadas y pases por ingresos.
--
-- DEPENDENCIAS:
-- 1. 20261020_membership_flexible_access_foundation.sql
-- 2. 20261020_attendance_subscription_link.sql
--
-- IMPORTANTE:
-- No ejecutar en produccion hasta completar las pruebas.
-- Todos los circuitos de asistencia deben utilizar esta funcion.
-- Los check-ins legacy con subscription_id NULL no consumen cupos.

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
  v_used bigint := 0;
  v_attendance_id bigint;
  v_check_in timestamptz;
BEGIN

  -- 1. Validar parametros.
  IF p_gym_id IS NULL
     OR p_gym_id <= 0
     OR NULLIF(BTRIM(p_identifier), '') IS NULL THEN

    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_INPUT',
      'message', 'Gimnasio e identificador requeridos'
    );

  END IF;

  -- 2. Buscar socio dentro del gimnasio.
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.status
  INTO v_member
  FROM public.members m
  LEFT JOIN public.users u
    ON u.id = m.user_id
  WHERE m.gym_id = p_gym_id
    AND (
      m.dni = BTRIM(p_identifier)
      OR u.email = BTRIM(p_identifier)
      OR m.id::text = BTRIM(p_identifier)
    )
  LIMIT 1;

  -- 3. Verificar que el socio exista.
  IF NOT FOUND THEN

    RETURN jsonb_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'message', 'Socio no encontrado'
    );

  END IF;

  -- 4. Verificar que el socio este activo.
  IF v_member.status IS DISTINCT FROM 'active' THEN

    RETURN jsonb_build_object(
      'success', false,
      'code', 'MEMBER_INACTIVE',
      'message', 'El socio se encuentra inactivo o suspendido'
    );

  END IF;

  -- 5. Serializar check-ins de este socio.
  -- Evita que dos llamadas simultaneas a esta funcion
  -- consuman incorrectamente los cupos.
  --
  -- No bloquea inserciones realizadas por el codigo legacy.
  PERFORM pg_advisory_xact_lock(
    48001,
    v_member.id::integer
  );

  -- 6. Buscar membresia vigente y pagada.
  SELECT
    s.id,
    s.start_date,
    s.end_date,
    mp.name AS plan_name,
    mp.access_mode,
    mp.max_entries
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.membership_plans mp
    ON mp.id = s.plan_id
   AND mp.gym_id = p_gym_id
  WHERE s.member_id = v_member.id
    AND s.status IN ('active', 'scheduled')
    AND s.payment_status = 'paid'
    AND s.start_date <= CURRENT_DATE
    AND s.end_date > CURRENT_DATE
  ORDER BY
    s.start_date DESC,
    s.id DESC
  LIMIT 1;

  IF NOT FOUND THEN

    RETURN jsonb_build_object(
      'success', false,
      'code', 'SUBSCRIPTION_EXPIRED',
      'message', 'Membresia vencida, impaga o inactiva'
    );

  END IF;

  -- 7. Evitar registros duplicados dentro de 60 segundos.
  IF EXISTS (
    SELECT 1
    FROM public.attendance a
    WHERE a.member_id = v_member.id
      AND a.check_in >= NOW() - INTERVAL '60 seconds'
  ) THEN

    RETURN jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_CHECKIN',
      'message', 'Ingreso registrado recientemente'
    );

  END IF;

  -- 8. Validar cupos de packs por ingresos.
  IF v_sub.access_mode = 'entry_pack' THEN

    IF v_sub.max_entries IS NULL
       OR v_sub.max_entries <= 0 THEN

      RETURN jsonb_build_object(
        'success', false,
        'code', 'INVALID_PLAN',
        'message', 'Pase sin cantidad de ingresos valida'
      );

    END IF;

    -- Contar solamente ingresos de esta suscripcion.
    SELECT COUNT(*)
    INTO v_used
    FROM public.attendance a
    WHERE a.member_id = v_member.id
      AND a.subscription_id = v_sub.id;

    IF v_used >= v_sub.max_entries THEN

      RETURN jsonb_build_object(
        'success', false,
        'code', 'ENTRY_LIMIT_REACHED',
        'message', 'El pase no tiene ingresos disponibles',
        'entries_remaining', 0
      );

    END IF;

  END IF;

  -- 9. Registrar asistencia vinculada a la suscripcion.
  INSERT INTO public.attendance (
    member_id,
    subscription_id,
    check_in
  )
  VALUES (
    v_member.id,
    v_sub.id,
    NOW()
  )
  RETURNING
    id,
    check_in
  INTO
    v_attendance_id,
    v_check_in;

  -- 10. Devolver resultado al frontend.
  RETURN jsonb_build_object(
    'success', true,
    'code', 'CHECKIN_SUCCESS',
    'message', 'Acceso permitido',

    'member', jsonb_build_object(
      'id', v_member.id,
      'name', CONCAT_WS(
        ' ',
        v_member.first_name,
        v_member.last_name
      ),
      'plan', v_sub.plan_name,
      'endDate', v_sub.end_date
    ),

    'attendance_id', v_attendance_id,
    'subscription_id', v_sub.id,
    'checkInTime', v_check_in,

    'entries_remaining',
      CASE
        WHEN v_sub.access_mode = 'entry_pack'
        THEN v_sub.max_entries - v_used - 1
        ELSE NULL
      END
  );

END;
$$;

-- Restringir ejecucion a los roles autorizados.
REVOKE ALL
ON FUNCTION public.register_gym_checkin_v2(bigint, text)
FROM PUBLIC;

-- Rol utilizado por la API en Neon.
GRANT EXECUTE
ON FUNCTION public.register_gym_checkin_v2(bigint, text)
TO neondb_owner;

COMMIT;
