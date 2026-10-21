-- Preparacion no destructiva para pases flexibles de gimnasios.
-- No ejecutar en produccion hasta actualizar y probar las funciones de
-- suscripciones, cobros, renovaciones y validacion de acceso QR.
-- Esta migracion no cambia el comportamiento de planes existentes.

BEGIN;

ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS access_mode TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS max_entries INTEGER;

-- Los planes existentes siguen usando duration_months y conservan su logica.
UPDATE public.membership_plans
SET access_mode = 'monthly'
WHERE access_mode IS NULL;

ALTER TABLE public.membership_plans
  ALTER COLUMN access_mode SET DEFAULT 'monthly',
  ALTER COLUMN access_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_plans_access_mode_check'
      AND conrelid = 'public.membership_plans'::regclass
  ) THEN
    ALTER TABLE public.membership_plans
      ADD CONSTRAINT membership_plans_access_mode_check
      CHECK (access_mode IN ('monthly', 'fixed_days', 'entry_pack'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_plans_duration_days_check'
      AND conrelid = 'public.membership_plans'::regclass
  ) THEN
    ALTER TABLE public.membership_plans
      ADD CONSTRAINT membership_plans_duration_days_check
      CHECK (duration_days IS NULL OR duration_days > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_plans_max_entries_check'
      AND conrelid = 'public.membership_plans'::regclass
  ) THEN
    ALTER TABLE public.membership_plans
      ADD CONSTRAINT membership_plans_max_entries_check
      CHECK (max_entries IS NULL OR max_entries > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.membership_plans.access_mode IS
  'monthly=legacy monthly plan; fixed_days=day-based pass; entry_pack=limited check-ins';
COMMENT ON COLUMN public.membership_plans.duration_days IS
  'Validity in days for future fixed_days or entry_pack plans';
COMMENT ON COLUMN public.membership_plans.max_entries IS
  'Maximum check-ins for future entry_pack plans; enforcement not yet implemented';

COMMIT;
