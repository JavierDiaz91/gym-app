-- Migration 006: synchronize membership lifecycle states.
-- Apply after 002. This file creates a function only: no cron job is installed.
-- Periods use [start_date, end_date); payment_status remains unchanged.
-- Access must always independently check payment_status='paid', member status,
-- and date bounds. A pending subscription becoming active does not grant access.

CREATE OR REPLACE FUNCTION public.sync_gym_membership_statuses()
RETURNS TABLE(activated bigint, expired bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_activated bigint := 0;
  v_expired bigint := 0;
BEGIN
  -- Expire periods that no longer cover the current date, including
  -- future renewals missed by a scheduler for an extended time.
  UPDATE public.subscriptions
     SET status = 'expired', updated_at = NOW()
   WHERE status IN ('active', 'scheduled')
     AND end_date <= CURRENT_DATE;
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Activate scheduled periods whose start date has arrived.
  -- A pending payment remains pending and must not grant access.
  UPDATE public.subscriptions
     SET status = 'active', updated_at = NOW()
   WHERE status = 'scheduled'
     AND start_date <= CURRENT_DATE
     AND end_date > CURRENT_DATE;
  GET DIAGNOSTICS v_activated = ROW_COUNT;

  RETURN QUERY SELECT v_activated, v_expired;
END;
$$;

-- Optional manual invocation (changes statuses; run only after approval):
-- SELECT * FROM public.sync_gym_membership_statuses();

-- Check pg_cron availability without changing the database:
-- SELECT name, default_version, installed_version
-- FROM pg_available_extensions WHERE name = 'pg_cron';
-- SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
--
-- If pg_cron is installed and permitted, schedule separately after approval,
-- using the database's timezone and operational requirements.
