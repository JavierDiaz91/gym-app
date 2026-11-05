-- Permitir volver a reservar una clase cancelada sin perder el historial.
-- La unicidad debe aplicarse solamente a reservas confirmadas.
-- Ejecutar una vez en Neon (SQL Editor). Seguro para reejecuciones.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_booking_active_member_date
  ON public.class_bookings (schedule_id, member_id, booking_date)
  WHERE status = 'confirmed';

ALTER TABLE public.class_bookings
  DROP CONSTRAINT IF EXISTS class_bookings_schedule_id_member_id_booking_date_key;

-- Por compatibilidad con instalaciones donde se haya creado como indice
-- independiente y no como restriccion.
DROP INDEX IF EXISTS public.class_bookings_schedule_id_member_id_booking_date_key;

COMMIT;

-- Comprobacion: debe existir uq_class_booking_active_member_date,
-- y no el indice unico general.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'class_bookings'
ORDER BY indexname;
