-- Requires database/migrations/20261020_membership_flexible_access_foundation.sql before applying this version.
-- Execute after migrations 002 and 003. This function is one atomic statement
-- from the HTTP Neon driver: membership and payment roll back together.
CREATE OR REPLACE FUNCTION public.record_gym_membership_payment(
 p_gym_id integer, p_member_id integer, p_plan_id integer,
 p_payment_method text, p_transaction_id text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
 v_plan membership_plans%ROWTYPE;
 v_sub subscriptions%ROWTYPE;
 v_payment_id integer;
 v_existing_member_id integer;
 v_existing_plan_id integer;
 v_existing_method text;
BEGIN
 IF NULLIF(BTRIM(p_payment_method),'') IS NULL THEN
   RAISE EXCEPTION 'Metodo de pago obligatorio';
 END IF;
 PERFORM 1 FROM members WHERE id=p_member_id AND gym_id=p_gym_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Miembro no encontrado'; END IF;
 IF NULLIF(BTRIM(p_transaction_id),'') IS NOT NULL THEN
   SELECT p.id, p.member_id, s.plan_id, p.payment_method
     INTO v_payment_id, v_existing_member_id, v_existing_plan_id, v_existing_method
     FROM payments p
     JOIN subscriptions s ON s.id=p.subscription_id
     WHERE p.transaction_id=p_transaction_id;
   IF FOUND THEN
     IF v_existing_member_id <> p_member_id
        OR v_existing_plan_id <> p_plan_id
        OR v_existing_method <> p_payment_method THEN
       RAISE EXCEPTION 'La transaccion ya existe con otros datos';
     END IF;
     RETURN v_payment_id; -- webhook retries must not extend twice
   END IF;
 END IF;
 -- Idempotent retries must work even if the plan was later deactivated.
 SELECT * INTO v_plan FROM membership_plans
   WHERE id=p_plan_id AND gym_id=p_gym_id AND is_active=true;
 IF NOT FOUND OR v_plan.price IS NULL OR v_plan.price <= 0 THEN
   RAISE EXCEPTION 'Plan inexistente o precio invalido';
 END IF;
 IF v_plan.access_mode <> 'monthly' THEN
   RAISE EXCEPTION 'Pase flexible no admitido en cobro mensual';
 END IF;
 -- Collect payment for an existing unpaid subscription to this plan first.
 SELECT * INTO v_sub FROM subscriptions
 WHERE member_id=p_member_id AND plan_id=p_plan_id
   AND payment_status='pending' AND status IN ('active','scheduled')
   AND end_date>CURRENT_DATE
 ORDER BY start_date ASC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN
   SELECT * INTO v_sub FROM public.renew_gym_membership(
     p_gym_id,p_member_id,p_plan_id,'pending',0
   );
 END IF;
 INSERT INTO payments(
   member_id,subscription_id,amount,payment_method,
   transaction_id,status,notes,payment_date
 ) VALUES (
   p_member_id,v_sub.id,v_plan.price,p_payment_method,
   NULLIF(BTRIM(p_transaction_id),''),'completed',p_notes,NOW()
 ) RETURNING id INTO v_payment_id;
 UPDATE subscriptions SET payment_status='paid',
   amount_paid=COALESCE(amount_paid,0)+v_plan.price, updated_at=NOW()
 WHERE id=v_sub.id;
 RETURN v_payment_id;
END;
$$;
