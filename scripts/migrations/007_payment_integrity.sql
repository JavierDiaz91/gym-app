-- Apply only after explicit approval and a database backup.
-- Requires the existing global unique index ux_payments_transaction_id.
-- This v2 function coexists with the original 6-argument function.
BEGIN;
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.payments
   WHERE NULLIF(BTRIM(transaction_id),'') IS NOT NULL
   GROUP BY transaction_id HAVING COUNT(*) > 1
 ) THEN
   RAISE EXCEPTION 'Duplicate transaction_id values: resolve before applying payment migration';
 END IF;
END $$;
-- The existing unique index already prevents reuse of non-null transaction IDs.
-- Reject blank IDs instead of creating a second overlapping index.
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_indexes
   WHERE schemaname='public' AND tablename='payments'
     AND indexname='ux_payments_transaction_id'
     AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
 ) THEN
   RAISE EXCEPTION 'Expected unique index ux_payments_transaction_id is missing';
 END IF;
END $$;

-- Reserve exactly one unpaid membership period for a checkout.
-- All competing requests for a member serialize on the same member row.
CREATE OR REPLACE FUNCTION public.prepare_gym_membership_checkout(
 p_gym_id integer, p_member_id integer, p_plan_id integer
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
 v_sub public.subscriptions%ROWTYPE;
 v_count integer;
BEGIN
 PERFORM 1 FROM public.members
 WHERE id=p_member_id AND gym_id=p_gym_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found in gym'; END IF;
 PERFORM 1 FROM public.membership_plans
 WHERE id=p_plan_id AND gym_id=p_gym_id AND is_active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active plan not found in gym'; END IF;

 SELECT COUNT(*) INTO v_count FROM public.subscriptions
 WHERE member_id=p_member_id AND payment_status='pending'
   AND status IN ('active','scheduled') AND end_date>CURRENT_DATE;
 IF v_count>1 THEN
   RAISE EXCEPTION 'Multiple pending memberships: manual reconciliation required';
 END IF;
 IF v_count=1 THEN
   SELECT * INTO v_sub FROM public.subscriptions
   WHERE member_id=p_member_id AND payment_status='pending'
     AND status IN ('active','scheduled') AND end_date>CURRENT_DATE
   FOR UPDATE;
   IF v_sub.plan_id<>p_plan_id THEN
     RAISE EXCEPTION 'Another plan has a pending membership';
   END IF;
   IF EXISTS (SELECT 1 FROM public.payments
              WHERE subscription_id=v_sub.id AND status='completed') THEN
     RAISE EXCEPTION 'Pending membership already has a completed payment';
   END IF;
 ELSE
   SELECT * INTO v_sub FROM public.renew_gym_membership(
      p_gym_id,p_member_id,p_plan_id,'pending',0
   );
 END IF;
 RETURN v_sub.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_gym_membership_payment_v2(
 p_gym_id integer, p_member_id integer, p_plan_id integer,
 p_payment_method text, p_transaction_id text,
 p_notes text, p_amount numeric, p_subscription_id integer DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
 v_plan public.membership_plans%ROWTYPE;
 v_sub public.subscriptions%ROWTYPE;
 v_payment_id integer;
 v_existing_member integer;
 v_existing_plan integer;
 v_existing_method text;
 v_existing_amount numeric;
 v_existing_subscription_id integer;
 v_existing_status text;
 v_pending_count integer;
BEGIN
 IF NULLIF(BTRIM(p_payment_method),'') IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
   RAISE EXCEPTION 'Invalid payment method or amount';
 END IF;
 IF LOWER(BTRIM(p_payment_method))='mercadopago' AND
    (p_subscription_id IS NULL OR NULLIF(BTRIM(p_transaction_id),'') IS NULL) THEN
   RAISE EXCEPTION 'Mercado Pago requires a bound subscription and transaction ID';
 END IF;
 IF p_transaction_id IS NOT NULL AND NULLIF(BTRIM(p_transaction_id),'') IS NULL THEN
   RAISE EXCEPTION 'Blank transaction ID is not allowed';
 END IF;
 PERFORM 1 FROM public.members WHERE id=p_member_id AND gym_id=p_gym_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found in gym'; END IF;
 IF NULLIF(BTRIM(p_transaction_id),'') IS NOT NULL THEN
   SELECT p.id,p.member_id,s.plan_id,p.payment_method,p.amount,p.subscription_id,p.status
   INTO v_payment_id,v_existing_member,v_existing_plan,v_existing_method,v_existing_amount,v_existing_subscription_id,v_existing_status
   FROM public.payments p
   JOIN public.subscriptions s ON s.id=p.subscription_id
   WHERE p.transaction_id=p_transaction_id;
   IF FOUND THEN
     IF v_existing_member<>p_member_id OR v_existing_plan<>p_plan_id
       OR v_existing_method<>p_payment_method OR v_existing_amount<>p_amount
       OR v_existing_status<>'completed'
       OR (p_subscription_id IS NOT NULL AND v_existing_subscription_id<>p_subscription_id) THEN
       RAISE EXCEPTION 'Transaction already registered with different details';
     END IF;
     RETURN v_payment_id;
   END IF;
 END IF;
 SELECT * INTO v_plan FROM public.membership_plans
 WHERE id=p_plan_id AND gym_id=p_gym_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found in gym'; END IF;
 -- A checkout with an explicit subscription must never settle another period.
 IF p_subscription_id IS NOT NULL THEN
   SELECT * INTO v_sub FROM public.subscriptions
   WHERE id=p_subscription_id AND member_id=p_member_id AND plan_id=p_plan_id
     AND payment_status='pending' AND status IN ('active','scheduled')
     AND end_date>CURRENT_DATE
   FOR UPDATE;
   IF NOT FOUND THEN
     RAISE EXCEPTION 'Checkout subscription is not pending or no longer valid';
   END IF;
   IF EXISTS (
     SELECT 1 FROM public.payments p
     WHERE p.subscription_id=v_sub.id AND p.status='completed'
   ) THEN
     RAISE EXCEPTION 'Subscription already has a completed payment';
   END IF;
 ELSE
 -- Existing pending period may be settled even if the plan has been deactivated.
 -- Reject ambiguous unpaid periods instead of arbitrarily assigning a payment.
 SELECT COUNT(*) INTO v_pending_count FROM public.subscriptions
 WHERE member_id=p_member_id AND plan_id=p_plan_id
   AND payment_status='pending' AND status IN ('active','scheduled')
   AND end_date>CURRENT_DATE;
 IF v_pending_count > 1 THEN
   RAISE EXCEPTION 'Multiple pending memberships: manual reconciliation required';
 END IF;
 SELECT * INTO v_sub FROM public.subscriptions
 WHERE member_id=p_member_id AND plan_id=p_plan_id
 AND payment_status='pending' AND status IN ('active','scheduled')
 AND end_date>CURRENT_DATE
 ORDER BY start_date ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND EXISTS (
   SELECT 1 FROM public.payments p
   WHERE p.subscription_id=v_sub.id AND p.status='completed'
 ) THEN
   RAISE EXCEPTION 'Pending membership already has a completed payment: manual reconciliation required';
 END IF;
 IF NOT FOUND THEN
   IF NOT v_plan.is_active THEN RAISE EXCEPTION 'Cannot renew inactive plan'; END IF;
   SELECT * INTO v_sub FROM public.renew_gym_membership(
      p_gym_id,p_member_id,p_plan_id,'pending',0
   );
 END IF;
 END IF; -- explicit subscription versus unassigned checkout
 INSERT INTO public.payments(member_id,subscription_id,amount,payment_method,transaction_id,status,notes,payment_date)
 VALUES(p_member_id,v_sub.id,p_amount,p_payment_method,NULLIF(BTRIM(p_transaction_id),''),'completed',p_notes,NOW())
 RETURNING id INTO v_payment_id;
 UPDATE public.subscriptions
 SET payment_status='paid',amount_paid=COALESCE(amount_paid,0)+p_amount,updated_at=NOW()
 WHERE id=v_sub.id;
 RETURN v_payment_id;
END;
$$;
COMMIT;
