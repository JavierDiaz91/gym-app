-- Run only after reviewing duplicate transaction IDs and approving a Neon migration.
-- The new function coexists with the original 6-argument function.
BEGIN;
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.payments
   WHERE NULLIF(BTRIM(transaction_id),'') IS NOT NULL
   GROUP BY transaction_id HAVING COUNT(*) > 1
 ) THEN
   RAISE EXCEPTION 'Duplicate transaction_id values: resolve before adding unique index';
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_transaction_id_nonempty
 ON public.payments(transaction_id)
 WHERE NULLIF(BTRIM(transaction_id),'') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_gym_membership_payment_v2(
 p_gym_id integer, p_member_id integer, p_plan_id integer,
 p_payment_method text, p_transaction_id text,
 p_notes text, p_amount numeric
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
 v_plan public.membership_plans%ROWTYPE;
 v_sub public.subscriptions%ROWTYPE;
 v_payment_id integer;
 v_existing_member integer;
 v_existing_plan integer;
 v_existing_method text;
 v_existing_amount numeric;
BEGIN
 IF NULLIF(BTRIM(p_payment_method),'') IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
   RAISE EXCEPTION 'Invalid payment method or amount';
 END IF;
 PERFORM 1 FROM public.members WHERE id=p_member_id AND gym_id=p_gym_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found in gym'; END IF;
 IF NULLIF(BTRIM(p_transaction_id),'') IS NOT NULL THEN
   SELECT p.id,p.member_id,s.plan_id,p.payment_method,p.amount
   INTO v_payment_id,v_existing_member,v_existing_plan,v_existing_method,v_existing_amount
   FROM public.payments p
   JOIN public.subscriptions s ON s.id=p.subscription_id
   WHERE p.transaction_id=p_transaction_id;
   IF FOUND THEN
     IF v_existing_member<>p_member_id OR v_existing_plan<>p_plan_id
       OR v_existing_method<>p_payment_method OR v_existing_amount<>p_amount THEN
       RAISE EXCEPTION 'Transaction already registered with different details';
     END IF;
     RETURN v_payment_id;
   END IF;
 END IF;
 SELECT * INTO v_plan FROM public.membership_plans
 WHERE id=p_plan_id AND gym_id=p_gym_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found in gym'; END IF;
 -- Existing pending period may be settled even if the plan has been deactivated.
 SELECT * INTO v_sub FROM public.subscriptions
 WHERE member_id=p_member_id AND plan_id=p_plan_id
 AND payment_status='pending' AND status IN ('active','scheduled')
 AND end_date>CURRENT_DATE
 ORDER BY start_date ASC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN
   IF NOT v_plan.is_active THEN RAISE EXCEPTION 'Cannot renew inactive plan'; END IF;
   SELECT * INTO v_sub FROM public.renew_gym_membership(
      p_gym_id,p_member_id,p_plan_id,'pending',0
   );
 END IF;
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
