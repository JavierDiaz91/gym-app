-- Kivra SaaS: cambios de plan programados.
-- Ejecutar una sola vez en Neon antes de habilitar la programación en la interfaz.
ALTER TABLE public.gym_saas_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id integer,
  ADD COLUMN IF NOT EXISTS pending_plan_effective_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gym_saas_subscriptions_pending_plan_id_fkey'
  ) THEN
    ALTER TABLE public.gym_saas_subscriptions
      ADD CONSTRAINT gym_saas_subscriptions_pending_plan_id_fkey
      FOREIGN KEY (pending_plan_id) REFERENCES public.saas_plans(id);
  END IF;
END $$;

ALTER TABLE public.gym_saas_subscriptions
  DROP CONSTRAINT IF EXISTS gym_saas_pending_plan_pair_check;
ALTER TABLE public.gym_saas_subscriptions
  ADD CONSTRAINT gym_saas_pending_plan_pair_check
  CHECK ((pending_plan_id IS NULL) = (pending_plan_effective_date IS NULL));

-- Verificación:
SELECT gym_id, plan_id, pending_plan_id, current_period_end, pending_plan_effective_date
FROM public.gym_saas_subscriptions ORDER BY gym_id;
