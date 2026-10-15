// Prueba de concurrencia QR. Solo para la rama dev-kivra-registro.
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

const expectedHost = 'ep-billowing-sound-ahtu9re0-pooler.c-3.us-east-1.aws.neon.tech';
const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== expectedHost) {
  throw new Error('DATABASE_URL no coincide con el host de desarrollo verificado.');
}
if (process.argv[2] !== '--run-dev-test') {
  throw new Error('Usar --run-dev-test para confirmar la prueba.');
}

const sql = neon(url);
const gymId = 3;
const prefix = 'kivra-race-' + randomUUID().slice(0, 8);
const a = prefix + '-a@example.com';
const b = prefix + '-b@example.com';
const match = prefix + '%@example.com';

async function count() {
  const rows = await sql`SELECT count(*)::int AS total FROM public.members WHERE gym_id = ${gymId}`;
  return rows[0].total;
}

let initial = null;
try {
  const rows = await sql`
    SELECT g.name, g.status, s.status AS subscription_status, p.max_members
    FROM public.gyms g
    JOIN public.gym_saas_subscriptions s ON s.gym_id = g.id
    JOIN public.saas_plans p ON p.id = s.plan_id
    WHERE g.id = ${gymId} AND s.status = 'active'
  `;
  if (rows.length !== 1 || rows[0].name !== 'Kivra Gym Test' ||
      rows[0].status !== 'active' || Number(rows[0].max_members) !== 50) {
    throw new Error('Gimnasio o plan inesperado; se cancela.');
  }
  initial = await count();
  if (initial !== 3) throw new Error('Se esperaban exactamente 3 alumnos; hay ' + initial);
  console.log('Preparando 46 alumnos de prueba...');
  await sql`
    INSERT INTO public.members (gym_id, first_name, last_name, email, status, join_date)
    SELECT ${gymId}, 'Test', 'Cupo', ${prefix} || '-seed-' || n || '@example.com', 'active', current_date
    FROM generate_series(1, 46) AS n
  `;
  if (await count() !== 49) throw new Error('No quedaron exactamente 49 alumnos.');

  const register = async email => {
    try {
      await sql`SELECT * FROM public.register_gym_member(
        ${gymId}, ${email}, 'hash-ficticio-no-utilizar', 'Test', 'Concurrente', ''
      )`;
      return { email, status: 'accepted' };
    } catch (error) {
      return { email, status: 'rejected', code: error.code, message: error.message };
    }
  };
  const results = await Promise.all([register(a), register(b)]);
  const total = await count();
  console.log('Resultados:', results);
  console.log('Alumnos tras los dos intentos:', total);
  const ok = total === 50 &&
    results.filter(x => x.status === 'accepted').length === 1 &&
    results.filter(x => x.status === 'rejected' && x.message.includes('límite de alumnos')).length === 1;
  console.log(ok ? 'PRUEBA SUPERADA' : 'PRUEBA FALLIDA: revisar el resultado');
  if (!ok) process.exitCode = 1;
} finally {
  // Solo borra las fichas y cuentas ficticias con el prefijo de esta ejecución.
  try {
    await sql`DELETE FROM public.members WHERE gym_id = ${gymId} AND email LIKE ${match}`;
    await sql`DELETE FROM public.users WHERE gym_id = ${gymId} AND email IN (${a}, ${b})`;
    const remaining = await count();
    console.log('Alumnos después de limpieza:', remaining);
    if (initial !== null && remaining !== initial) {
      console.error('ATENCION: el total no coincide con el inicial.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('LIMPIEZA INCOMPLETA. Prefijo:', prefix, error.message);
    process.exitCode = 1;
  }
}
