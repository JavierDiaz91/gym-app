-- Apply in Neon before deploying code. Existing plans remain without group classes.
ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS includes_classes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_class_limit integer;
ALTER TABLE public.membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_weekly_class_limit_check;
ALTER TABLE public.membership_plans
  ADD CONSTRAINT membership_plans_weekly_class_limit_check
  CHECK (weekly_class_limit IS NULL OR weekly_class_limit BETWEEN 1 AND 7);

-- Enforce entitlement inside the same transaction as booking.
-- Serialize bookings per member and ISO week to prevent concurrent limit bypass.
CREATE OR REPLACE FUNCTION public.book_gym_class_member(
 p_schedule_id integer, p_member_id integer, p_booking_date date, p_gym_id integer
) RETURNS TABLE (booking_id integer, result_code text)
LANGUAGE plpgsql AS $$
DECLARE
 v_limit integer;
 v_week_start date;
 v_count integer;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id=p_member_id AND m.gym_id=p_gym_id
    AND COALESCE(m.status,'active') NOT IN ('inactive','suspended')
 ) THEN
  RETURN QUERY SELECT NULL::integer, 'MEMBER_INACTIVE'::text; RETURN;
 END IF;

 -- Lock per member to serialize all class reservations (including separate dates).
 PERFORM 1 FROM public.members m
 WHERE m.id=p_member_id AND m.gym_id=p_gym_id FOR UPDATE;

 SELECT p.weekly_class_limit INTO v_limit
 FROM public.subscriptions s
 JOIN public.membership_plans p ON p.id=s.plan_id AND p.gym_id=p_gym_id
 WHERE s.member_id=p_member_id AND s.status IN ('active','scheduled')
   AND s.payment_status='paid'
   AND s.start_date<=p_booking_date AND s.end_date>p_booking_date
   AND p.includes_classes=true
 ORDER BY s.start_date DESC, s.id DESC LIMIT 1;

 IF NOT FOUND THEN
  RETURN QUERY SELECT NULL::integer, 'NO_CLASS_ACCESS'::text; RETURN;
 END IF;

 IF v_limit IS NOT NULL THEN
  v_week_start := date_trunc('week', p_booking_date::timestamp)::date;
  SELECT count(*)::integer INTO v_count
  FROM public.class_bookings b
  JOIN public.class_schedule cs ON cs.id=b.schedule_id
  JOIN public.classes c ON c.id=cs.class_id
  JOIN public.trainers t ON t.id=c.trainer_id
  WHERE b.member_id=p_member_id AND b.status='confirmed'
    AND b.booking_date>=v_week_start AND b.booking_date<v_week_start+7
    AND t.gym_id=p_gym_id;
  IF v_count>=v_limit THEN
   RETURN QUERY SELECT NULL::integer, 'WEEKLY_LIMIT'::text; RETURN;
  END IF;
 END IF;

 RETURN QUERY SELECT b.booking_id,b.result_code
 FROM public.book_gym_class(p_schedule_id,p_member_id,p_booking_date,p_gym_id) b;
END $$;
