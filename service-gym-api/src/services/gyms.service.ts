import bcrypt from "bcryptjs";
import { sql } from "../db/neon";


export interface CreateGymInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminPasswordHash: string;
  adminFirstName?: string;
  adminLastName?: string;
}

export interface ScheduleItem {
  dayGroup: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface HolidayItem {
  fecha: string;
  motivo: string;
}

export async function getAllGyms() {
  const result = await sql`
    SELECT 
      g.id, 
      g.name, 
      g.slug, 
      g.status, 
      g.created_at,
      COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.gym_id = g.id AND u.role = 'member'), 0) AS total_members,
      COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.gym_id = g.id AND u.role = 'trainer'), 0) AS total_trainers
    FROM gyms g
    ORDER BY g.created_at DESC
  `;

  return result;
}

export async function getGymById(id: number) {
  const result = await sql`
    SELECT id, name, slug, phone, address, email, status, created_at, updated_at 
    FROM gyms 
    WHERE id = ${id};
  `;

  return result[0] || null;
}

export async function createGymWithAdmin(data: CreateGymInput) {
  // Si la clave no arranca con $2b$, sabemos que es texto plano y la encriptamos
  const isAlreadyHashed = data.adminPasswordHash.startsWith("$2b$") || data.adminPasswordHash.startsWith("$2a$");
  const hashedPassword = isAlreadyHashed 
    ? data.adminPasswordHash 
    : await bcrypt.hash(data.adminPasswordHash, 10);

  const gymResult = await sql`
    INSERT INTO gyms (name, slug)
    VALUES (${data.name}, ${data.slug})
    RETURNING id, name, slug, status, created_at
  `;
  const gym = gymResult[0];

  const userResult = await sql`
    INSERT INTO users (email, password_hash, role, gym_id)
    VALUES (${data.adminEmail}, ${hashedPassword}, 'admin', ${gym.id})
    RETURNING id, email, role, gym_id
  `;
  const user = userResult[0];

  return { gym, adminUser: user };
}

export async function toggleGymStatus(gymId: number, status: string) {
  const targetStatus = status === "suspended" ? "suspended" : "active";

  const [updated] = await sql`
    UPDATE gyms
    SET 
      status = ${targetStatus},
      updated_at = NOW()
    WHERE id = ${Number(gymId)}
    RETURNING id, name, slug, status, updated_at
  `;

  return updated || null;
}

export async function getGymSchedulesAndHolidays(gymId: number) {
  const schedules = await sql`
    SELECT day_group, open_time, close_time, is_closed 
    FROM gym_schedules 
    WHERE gym_id = ${Number(gymId)}
  `;

  const holidays = await sql`
    SELECT id, holiday_date AS fecha, description AS motivo 
    FROM gym_holidays 
    WHERE gym_id = ${Number(gymId)}
    ORDER BY holiday_date ASC
  `;

  return { schedules, holidays };
}

export async function saveGymSchedulesAndHolidays(
  gymId: number,
  schedules: ScheduleItem[],
  holidays: HolidayItem[]
) {
  const parsedGymId = Number(gymId);

  // 1. Insertar o Actualizar los horarios semanales (Upsert)
  for (const item of schedules) {
    const open = item.isClosed ? null : item.openTime;
    const close = item.isClosed ? null : item.closeTime;

    await sql`
      INSERT INTO gym_schedules (gym_id, day_group, open_time, close_time, is_closed, updated_at)
      VALUES (${parsedGymId}, ${item.dayGroup}, ${open}, ${close}, ${item.isClosed}, NOW())
      ON CONFLICT (gym_id, day_group) 
      DO UPDATE SET
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        is_closed = EXCLUDED.is_closed,
        updated_at = NOW()
    `;
  }

  // 2. Reemplazar cierres especiales/feriados
  await sql`
    DELETE FROM gym_holidays 
    WHERE gym_id = ${parsedGymId}
  `;

  if (holidays.length > 0) {
    for (const h of holidays) {
      if (h.fecha && h.motivo) {
        await sql`
          INSERT INTO gym_holidays (gym_id, holiday_date, description)
          VALUES (${parsedGymId}, ${h.fecha}, ${h.motivo})
          ON CONFLICT (gym_id, holiday_date) DO NOTHING
        `;
      }
    }
  }

  return { success: true };
}

export async function updateGymGeneral(
  id: number,
  data: { name?: string; phone?: string; address?: string; email?: string }
) {
  const { name, phone, address, email } = data;

  const result = await sql`
    UPDATE gyms 
    SET name = COALESCE(${name || null}, name), 
        phone = COALESCE(${phone || null}, phone), 
        address = COALESCE(${address || null}, address),
        email = COALESCE(${email || null}, email),
        updated_at = NOW()
    WHERE id = ${id} 
    RETURNING *;
  `;

  return result[0] || null;
}