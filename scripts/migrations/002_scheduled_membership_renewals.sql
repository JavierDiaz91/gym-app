-- Gym App: scheduled membership renewals (review before executing in Neon)
-- This migration changes the allowed lifecycle states; it does not migrate payments.
BEGIN;

-- Find the actual status CHECK by its definition; constraint names vary
-- across environments. Fail if the schema has an unexpected CHECK.
DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.subscriptions'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%payment_status%'
  LOOP
    IF v_constraint.definition NOT ILIKE '%active%'
       OR v_constraint.definition NOT ILIKE '%expired%'
       OR v_constraint.definition NOT ILIKE '%cancelled%' THEN
      RAISE EXCEPTION 'Unexpected subscriptions status constraint: %', v_constraint.conname;
    END IF;
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'scheduled', 'expired', 'cancelled'));

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_valid_dates_check
  CHECK (end_date > start_date);

CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_one_scheduled_per_member
  ON subscriptions (member_id)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_dates
  ON subscriptions (member_id, start_date, end_date)
  WHERE status IN ('active', 'scheduled');

COMMIT;
