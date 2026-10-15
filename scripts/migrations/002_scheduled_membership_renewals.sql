-- Gym App: scheduled membership renewals (review before executing in Neon)
-- This migration changes the allowed lifecycle states; it does not migrate payments.
BEGIN;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
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
