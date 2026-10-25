# Kivra — diseño técnico de planificaciones multideporte (v1)

Estado: **propuesta para revisión; no aplicar migraciones ni activar en producción**.

## Alcance
- Plantillas reutilizables por entrenador y gimnasio; duplicación y publicación por versión.
- Asignaciones a uno o varios alumnos como **snapshot independiente**. Los cambios de la plantilla no alteran asignaciones ya publicadas.
- Clasificación por **disciplina** (musculación, running, funcional...), **objetivo** (fuerza, hipertrofia, resistencia...), **nivel**, **público opcional** (todos, mujeres, hombres), duración y frecuencia. Público es etiqueta de descubrimiento, **no restricción de acceso**.
- Sesiones de fuerza, running y mixtas; cada modalidad expone sus propias métricas.
- Catálogo de ejercicios con imagen demostrativa y posibilidad de imagen propia por gimnasio/entrenador o sobrescritura puntual en un plan.
- Alumno: semana/día/bloque, demostración, instrucciones, registro de series y progreso persistente.

## Estado existente (revisado en main, 22/10/2026)
- `app/trainer/rutinas/FormularioNuevaRutina.tsx`: lista plana de ejercicios; series, reps, RIR, pausa, notas, `image_url` por URL; autocompleta imágenes del catálogo.
- `app/actions.ts` `saveOrUpdateRoutine`: guarda JSON serializado en `routines.notes`; valida rol y propiedad por trainer_id, pero al resolver el perfil para guardar **no filtra gym_id** (debe endurecerse antes de la nueva funcionalidad).
- `app/actions.ts` `assignRoutineToMember`: verifica gimnasio y que el alumno esté asignado al entrenador; asigna rutina existente.
- `app/miembro/rutina/page.tsx`: interpreta JSON en notes y ofrece fallback a `routine_exercises`; debe conservarse mientras migramos.
- `ExerciseCard.tsx`: progreso parcial en localStorage; no sustituye logs persistentes en base de datos.

## Modelo lógico propuesto (nombres provisionales)
1. `training_categories`: id, gym_id nullable (null = catálogo global), dimension, slug, label, active. Índice único según ámbito/dimensión/slug.
2. `training_plans`: id, gym_id, trainer_id, title, objective_text, duration_weeks, status (draft/published/archived), version, created_at, updated_at; `source_plan_id` nullable para duplicaciones.
3. `training_plan_categories`: plan_id, category_id; validación de ámbito (global o mismo gym).
4. `training_plan_days`: id, plan_id, day_index, title, modality (strength/running/mixed), sort_order.
5. `training_plan_blocks`: id, day_id, block_type (warmup/main/circuit/cooldown/custom), title, sort_order.
6. `training_plan_items`: id, block_id, exercise_id nullable, title_snapshot, media_asset_id nullable, sort_order, instructions, item_type (exercise/run_interval/timed_activity).
7. `training_week_prescriptions`: id, item_id, week_number, sets, reps_text, rir_text, rest_seconds, tempo_text, load_text, distance_meters, duration_seconds, pace_text, interval_work_seconds, interval_rest_seconds, notes; restricciones según tipo de actividad y semanas.
8. `training_media_assets`: id, gym_id, uploader_user_id, storage_key, mime_type, size_bytes, status, created_at. Guardar archivo en almacenamiento externo privado/gestionado; NO blobs binarios en Neon.
9. `member_training_plans`: id, gym_id, member_id, trainer_id, source_plan_id, source_version, start_date, status, snapshot_jsonb, assigned_at; el snapshot conserva días, bloques, prescripciones e imágenes de la versión asignada.
10. `workout_sessions`: id, member_training_plan_id, member_id, day_index, week_number, started_at, finished_at, status.
11. `workout_set_logs`: id, workout_session_id, item_snapshot_key, set_index, actual_reps, actual_load, actual_rir, duration_seconds, distance_meters, notes.

**Antes de implementar SQL**: verificar en Neon columnas, tipos, claves, constraints, RLS/roles y nombres reales de `gyms`, `trainers`, `members`, `routines`, `exercises`, `member_routines`. No asumir que los nombres provisionales están disponibles.

## Reglas de negocio y seguridad
- Toda lectura/escritura debe validar sesión, rol, `gym_id` y relación entrenador/alumno. No confiar en `trainerId` enviado por el navegador.
- Imágenes: JPG/PNG/WebP; límites de tamaño, MIME real, dimensiones, permisos de subida, rutas no adivinables y limpieza de archivos huérfanos. Permitir URL externa sólo si se valida y se define política de orígenes.
- Catálogo compartido de ejercicios de sólo lectura; personalizaciones de imagen con ámbito gym/entrenador sin sobrescribir el global.
- Versiones publicadas inmutables; cambios generan versión nueva. Asignaciones con snapshot propio; editar un alumno no cambia los demás.
- Validar semana 1..duration_weeks; orden estable; evitar prescripciones incompatibles (ej. kilómetros obligatorios para intervalos de running sólo si la modalidad lo exige).
- Público hombres/mujeres/todos es filtro opcional y nunca bloqueo de acceso.
- Historizar y auditar reasignaciones; no borrar entrenamientos previos por editar planes.

## Entregas por PR
1. **Auditoría read-only** de esquema real y permisos; prueba de no regresión de rutinas actuales. Confirmar almacenamiento de medios y su costo.
2. **Migración aditiva** de categorías, planes y medios, con rollback documentado; aplicar primero en entorno de pruebas o transacción de verificación.
3. **Constructor v2**: categorías, días, bloques, semanas, imágenes del catálogo, URL y subida controlada; modo borrador.
4. **Publicación/asignación**: snapshots, duplicación, personalización individual, comprobación de aislamiento entre gimnasios.
5. **Panel alumno**: vista semana/día, imágenes, prescripciones de fuerza y running; compatibilidad con rutinas legacy.
6. **Seguimiento**: sesiones y series persistentes, histórico y reportes.

## Caso de aceptación del PDF RUNNEA FUERZA
- Objetivo general, 3 variantes de entrada en calor, 3 días de fuerza.
- Progresión 4 semanas por ejercicio (series/reps/RIR/pausa/tempo/notas).
- Bloques de estrés metabólico y density training con intervalos de trabajo/descanso.
- Imágenes por ejercicio; el alumno ve sólo su semana/día y puede consultar semanas futuras.
- Duplicar plantilla, asignar a dos alumnos, personalizar uno; verificar que el otro y la plantilla no cambien.

## Fuera de alcance de este PR
Ningún cambio de Neon, migración ejecutada, endpoint, UI de producción, cron, Render o Vercel.
