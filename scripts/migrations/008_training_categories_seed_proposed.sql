-- Kivra: shared training categories. Execute AFTER migration 007.
-- Idempotent, does not alter existing exercises, trainers or members.
INSERT INTO training_categories (gym_id, dimension, slug, label)
VALUES
(NULL,'discipline','musculacion','Musculación'),
(NULL,'discipline','running','Running'),
(NULL,'discipline','funcional','Funcional'),
(NULL,'discipline','movilidad','Movilidad'),
(NULL,'discipline','preparacion_fisica','Preparación física'),
(NULL,'objective','fuerza','Fuerza'),
(NULL,'objective','hipertrofia','Hipertrofia'),
(NULL,'objective','resistencia','Resistencia'),
(NULL,'objective','potencia','Potencia'),
(NULL,'objective','movilidad','Movilidad'),
(NULL,'level','principiante','Principiante'),
(NULL,'level','intermedio','Intermedio'),
(NULL,'level','avanzado','Avanzado'),
(NULL,'audience','todos','Todos'),
(NULL,'audience','mujeres','Mujeres'),
(NULL,'audience','hombres','Hombres')
ON CONFLICT (dimension, slug) WHERE gym_id IS NULL
DO UPDATE SET label = EXCLUDED.label, is_active = TRUE;
