-- Reservas por fecha, con control de cupos concurrente.
-- Ejecutar en Neon antes de habilitar la interfaz de reservas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_booking_active_member_date
 ON public.class_bookings (schedule_id, member_id, booking_date)
 WHERE status = 'confirmed';

CREATE OR REPLACE FUNCTION public.book_gym_class(
 p_schedule_id integer, p_member_id integer, p_booking_date date, p_gym_id integer
) RETURNS TABLE (booking_id integer, result_code text)
LANGUAGE plpgsql AS $$
DECLARE v_capacity integer; v_day integer; v_count integer; v_existing integer;
BEGIN
 IF p_booking_date < CURRENT_DATE THEN RAISE EXCEPTION 'No se puede reservar una fecha pasada'; END IF;
 SELECT c.capacity, s.day_of_week INTO v_capacity,v_day
 FROM public.class_schedule s
 JOIN public.classes c ON c.id=s.class_id
 JOIN public.trainers t ON t.id=c.trainer_id
 WHERE s.id=p_schedule_id AND s.is_active=true AND c.is_active=true AND t.gym_id=p_gym_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Horario no disponible'; END IF;
 IF EXTRACT(DOW FROM p_booking_date)::integer <> v_day THEN RAISE EXCEPTION 'La fecha no corresponde al horario'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.members m WHERE m.id=p_member_id AND m.gym_id=p_gym_id)
 THEN RAISE EXCEPTION 'Alumno no pertenece al gimnasio'; END IF;
 -- Bloqueo por horario y fecha; serializa reservas competidoras del mismo cupo.
 PERFORM pg_advisory_xact_lock(p_schedule_id, (p_booking_date - DATE '2000-01-01')::integer);
 SELECT id INTO v_existing FROM public.class_bookings
 WHERE schedule_id=p_schedule_id AND member_id=p_member_id AND booking_date=p_booking_date AND status='confirmed' LIMIT 1;
 IF FOUND THEN RETURN QUERY SELECT v_existing,'ALREADY_BOOKED'::text; RETURN; END IF;
 SELECT COUNT(*)::integer INTO v_count FROM public.class_bookings
 WHERE schedule_id=p_schedule_id AND booking_date=p_booking_date AND status='confirmed';
 IF v_count >= v_capacity THEN RETURN QUERY SELECT NULL::integer,'FULL'::text; RETURN; END IF;
 INSERT INTO public.class_bookings(schedule_id,member_id,booking_date,status)
 VALUES(p_schedule_id,p_member_id,p_booking_date,'confirmed') RETURNING id INTO v_existing;
 RETURN QUERY SELECT v_existing,'BOOKED'::text;
END $$;
