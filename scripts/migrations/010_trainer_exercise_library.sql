-- Biblioteca de ejercicios privada por entrenador y gimnasio.
-- Ejecutar una sola vez en Neon antes de habilitar la pantalla.
CREATE TABLE IF NOT EXISTS trainer_exercise_library (
  id BIGSERIAL PRIMARY KEY,
  gym_id BIGINT NOT NULL REFERENCES gyms(id),
  trainer_id BIGINT NOT NULL REFERENCES trainers(id),
  name VARCHAR(150) NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  muscle_group VARCHAR(100) NOT NULL DEFAULT '',
  equipment VARCHAR(100) NOT NULL DEFAULT '',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trainer_exercise_library_image_https CHECK (image_url IS NULL OR image_url ~ '^https://'),
  CONSTRAINT trainer_exercise_library_name_nonempty CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_trainer_exercise_library_name
  ON trainer_exercise_library (gym_id, trainer_id, lower(name)) WHERE is_active;
CREATE INDEX IF NOT EXISTS ix_trainer_exercise_library_owner
  ON trainer_exercise_library (gym_id, trainer_id, is_active, name);
