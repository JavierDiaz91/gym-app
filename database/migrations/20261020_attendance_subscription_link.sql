-- Preparacion de trazabilidad de ingresos por suscripcion.
-- Ejecutar SOLO en base de desarrollo y luego de revisar la estructura real.
-- No cambia los registros historicos: subscription_id permanece NULL.
-- No activa pases por ingresos ni modifica la API actual.
BEGIN;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS subscription_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND conname = 'attendance_subscription_id_fkey'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_subscription_id_fkey
      FOREIGN KEY (subscription_id)
      REFERENCES public.subscriptions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_attendance_subscription_id
  ON public.attendance (subscription_id)
  WHERE subscription_id IS NOT NULL;

COMMENT ON COLUMN public.attendance.subscription_id IS
  'Subscription used to authorize this check-in; NULL for historical/legacy check-ins';

COMMIT;
