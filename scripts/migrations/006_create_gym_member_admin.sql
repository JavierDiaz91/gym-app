-- 006: Atomic admin enrollment with SaaS capacity enforcement.
-- Apply after 002-005. No data is changed by installing this function.
CREATE OR REPLACE FUNCTION public.create_gym_member_admin(
    p_gym_id integer,
    p_first_name text,
    p_last_name text,
    p_email text,
    p_phone text DEFAULT NULL,
    p_emergency_contact text DEFAULT NULL,
    p_plan_id integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_gym_status text;
    v_subscription record;
    v_member_count integer;
    v_member_id integer;
    v_email text;
BEGIN
    IF NULLIF(BTRIM(p_first_name), '') IS NULL
       OR NULLIF(BTRIM(p_last_name), '') IS NULL THEN
        RAISE EXCEPTION 'Nombre y apellido son obligatorios';
    END IF;

    v_email := LOWER(NULLIF(BTRIM(p_email), ''));
    IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Correo del socio invalido';
    END IF;

    -- Shared lock point with other enrollments that follow this protocol.
    SELECT g.status INTO v_gym_status
    FROM public.gyms g
    WHERE g.id = p_gym_id
    FOR UPDATE;
    IF NOT FOUND OR v_gym_status <> 'active' THEN
        RAISE EXCEPTION 'Gimnasio inexistente o inactivo';
    END IF;

    SELECT s.status, s.current_period_end, sp.max_members
    INTO v_subscription
    FROM public.gym_saas_subscriptions s
    JOIN public.saas_plans sp ON sp.id = s.plan_id
    WHERE s.gym_id = p_gym_id
    ORDER BY s.id DESC
    LIMIT 1;

    IF NOT FOUND OR v_subscription.status <> 'active'
       OR (v_subscription.current_period_end IS NOT NULL
           AND v_subscription.current_period_end < CURRENT_DATE) THEN
        RAISE EXCEPTION 'El gimnasio no tiene una suscripción SaaS vigente';
    END IF;

    SELECT COUNT(*)::integer INTO v_member_count
    FROM public.members WHERE gym_id = p_gym_id;

    IF v_subscription.max_members IS NOT NULL
       AND v_member_count >= v_subscription.max_members THEN
        RAISE EXCEPTION 'Alcanzaste el límite de alumnos de tu plan SaaS';
    END IF;

    IF p_plan_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.membership_plans
        WHERE id = p_plan_id AND gym_id = p_gym_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'El plan de membresía no pertenece al gimnasio o está inactivo';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.members
        WHERE gym_id = p_gym_id AND LOWER(BTRIM(email)) = v_email
    ) THEN
        RAISE EXCEPTION 'Ya existe un socio registrado con este correo';
    END IF;

    SELECT public.create_gym_member_with_plan(
        p_gym_id, BTRIM(p_first_name), BTRIM(p_last_name),
        v_email, p_phone, p_emergency_contact, p_plan_id
    ) INTO v_member_id;

    RETURN v_member_id;
END;
$$;
