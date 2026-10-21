-- KIVRA - Cobro presencial de pases flexibles
-- Exclusivamente para pagos ya confirmados.
-- No procesa ni verifica pagos de Mercado Pago.
-- Requiere la estructura de planes flexibles y
-- la restriccion subscriptions_no_overlap.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_flexible_gym_pass_payment_draft(
    p_gym_id integer,
    p_member_id integer,
    p_plan_id integer,
    p_payment_method text,
    p_transaction_id text,
    p_amount numeric,
    p_notes text DEFAULT NULL
)
RETURNS TABLE (
    payment_id bigint,
    subscription_id bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_plan public.membership_plans%ROWTYPE;
    v_sub_id bigint;
    v_payment_id bigint;
    v_existing record;
    v_end date;
BEGIN
    IF p_gym_id IS NULL OR p_gym_id <= 0
       OR p_member_id IS NULL OR p_member_id <= 0
       OR p_plan_id IS NULL OR p_plan_id <= 0 THEN
        RAISE EXCEPTION 'Identificadores invalidos';
    END IF;

    IF NULLIF(BTRIM(p_payment_method), '') IS NULL
       OR NULLIF(BTRIM(p_transaction_id), '') IS NULL THEN
        RAISE EXCEPTION 'Metodo y referencia unica del pago son obligatorios';
    END IF;

    IF LOWER(BTRIM(p_payment_method)) = 'mercadopago' THEN
        RAISE EXCEPTION 'Mercado Pago requiere un flujo de cobro verificado';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Monto invalido';
    END IF;

    -- Bloqueo por socio para serializar ventas concurrentes.
    PERFORM 1
    FROM public.members
    WHERE id = p_member_id
      AND gym_id = p_gym_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Socio fuera del gimnasio';
    END IF;

    -- Idempotencia: reintentos de un pago ya registrado.
    SELECT
        p.id,
        p.subscription_id,
        p.member_id,
        p.amount,
        p.payment_method,
        p.status,
        s.plan_id,
        s.payment_status,
        m.gym_id
    INTO v_existing
    FROM public.payments p
    JOIN public.subscriptions s
      ON s.id = p.subscription_id
    JOIN public.members m
      ON m.id = p.member_id
    WHERE p.transaction_id = BTRIM(p_transaction_id)
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.member_id <> p_member_id
           OR v_existing.gym_id <> p_gym_id
           OR v_existing.plan_id <> p_plan_id
           OR v_existing.amount <> p_amount
           OR v_existing.payment_method <> BTRIM(p_payment_method)
           OR v_existing.status IS DISTINCT FROM 'completed'
           OR v_existing.payment_status IS DISTINCT FROM 'paid'
        THEN
            RAISE EXCEPTION 'Referencia de pago reutilizada con otros datos o estado invalido';
        END IF;

        payment_id := v_existing.id;
        subscription_id := v_existing.subscription_id;

        RETURN NEXT;
        RETURN;
    END IF;

    -- Validar plan flexible del mismo gimnasio.
    SELECT *
    INTO v_plan
    FROM public.membership_plans
    WHERE id = p_plan_id
      AND gym_id = p_gym_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_plan.access_mode NOT IN ('fixed_days', 'entry_pack') THEN
        RAISE EXCEPTION 'Plan flexible no encontrado';
    END IF;

    IF v_plan.is_active IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Plan no habilitado para venta';
    END IF;

    IF v_plan.duration_days IS NULL
       OR v_plan.duration_days <= 0
       OR v_plan.price IS DISTINCT FROM p_amount THEN
        RAISE EXCEPTION 'Vigencia o monto distinto al precio del plan';
    END IF;

    IF v_plan.access_mode = 'entry_pack'
       AND (
           v_plan.max_entries IS NULL
           OR v_plan.max_entries <= 0
       ) THEN
        RAISE EXCEPTION 'Cantidad de ingresos invalida';
    END IF;

    -- No permitir otra suscripcion vigente o programada.
    IF EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.member_id = p_member_id
          AND s.status IN ('active', 'scheduled')
          AND s.end_date > CURRENT_DATE
    ) THEN
        RAISE EXCEPTION 'El socio ya tiene una suscripcion vigente o programada';
    END IF;

    v_end := CURRENT_DATE + v_plan.duration_days;

    -- Crear suscripcion pagada.
    INSERT INTO public.subscriptions (
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        payment_status,
        amount_paid
    )
    VALUES (
        p_member_id,
        p_plan_id,
        CURRENT_DATE,
        v_end,
        'active',
        'paid',
        p_amount
    )
    RETURNING id INTO v_sub_id;

    -- Registrar pago confirmado.
    INSERT INTO public.payments (
        member_id,
        subscription_id,
        amount,
        payment_method,
        transaction_id,
        status,
        notes,
        payment_date
    )
    VALUES (
        p_member_id,
        v_sub_id,
        p_amount,
        BTRIM(p_payment_method),
        BTRIM(p_transaction_id),
        'completed',
        p_notes,
        NOW()
    )
    RETURNING id INTO v_payment_id;

    payment_id := v_payment_id;
    subscription_id := v_sub_id;

    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.record_flexible_gym_pass_payment_draft(
    integer, integer, integer, text, text, numeric, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_flexible_gym_pass_payment_draft(
    integer, integer, integer, text, text, numeric, text
) TO neondb_owner;

COMMIT;