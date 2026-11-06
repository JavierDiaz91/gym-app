-- Attendance is separate from reservations and membership check-ins.
-- Run once in Neon before deploying the UI.
CREATE TABLE IF NOT EXISTS public.class_attendance (
 id BIGSERIAL PRIMARY KEY,
 booking_id INTEGER NOT NULL UNIQUE REFERENCES public.class_bookings(id) ON DELETE CASCADE,
 status VARCHAR(10) NOT NULL CHECK (status IN ('present','absent')),
 marked_by_user_id INTEGER,
 marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_class_attendance_status ON public.class_attendance(status);
COMMENT ON TABLE public.class_attendance IS 'Class-specific attendance; does not consume membership pack entries.';
