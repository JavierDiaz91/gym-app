-- Kivra: categorias propias por entrenador. Ejecutar manualmente en Neon tras revisar.
-- No elimina categorias existentes ni modifica planes o entrenamientos.
BEGIN;
ALTER TABLE training_categories
  ADD COLUMN IF NOT EXISTS trainer_id integer;
CREATE INDEX IF NOT EXISTS idx_training_categories_trainer
  ON training_categories (gym_id, trainer_id, dimension, is_active);
COMMIT;
