-- Reservas autogestionadas por miembros. Aplicar en Neon antes de habilitar Mis clases.
-- La validacion de membresia se realiza dentro de la misma transaccion de reserva.
CREATE OR REPLACE FUNCTION public.book_gym_class_member(
 p_schedule_id integer, p_member_id integer, p_booking_date date, p_gym_id integer
) RETURNS TABLE (booking_id integer, result_code text)
LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id=p_member_id AND m.gym_id=p_gym_id
    AND COALESCE(m.status,'active') NOT IN ('inactive','suspended')
 ) THEN
  RETURN QUERY SELECT NULL::integer, 'MEMBER_INACTIVE'::text; RETURN;
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.subscriptions s
  JOIN public.members m ON m.id=s.member_id
  JOIN public.membership_plans p ON p.id=s.plan_id AND p.gym_id=m.gym_id
  WHERE s.member_id=p_member_id AND m.gym_id=p_gym_id
    AND s.status IN ('active','scheduled') AND s.payment_status='paid'
    AND s.start_date<=p_booking_date AND s.end_date>p_booking_date
    AND (p.access_mode <> 'entry_pack' OR COALESCE(s.entries_remaining,0)>0)
 ) THEN
  RETURN QUERY SELECT NULL::integer, 'NO_MEMBERSHIP'::text; RETURN;
 END IF;
 RETURN QUERY SELECT b.booking_id,b.result_code
 FROM public.book_gym_class(p_schedule_id,p_member_id,p_booking_date,p_gym_id) b;
END $$;
