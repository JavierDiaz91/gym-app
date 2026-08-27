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

export async function getAllGyms() {
  // Subconsultas directas para evitar fallos de GROUP BY en Postgres
  const result = await sql`
    SELECT 
      g.id, 
      g.name, 
      g.slug, 
      g.status, 
      g.created_at,
      (SELECT COUNT(*)::int FROM users u WHERE u.gym_id = g.id AND u.role = 'member') AS total_members,
      (SELECT COUNT(*)::int FROM users u WHERE u.gym_id = g.id AND u.role = 'trainer') AS total_trainers
    FROM gyms g
    ORDER BY g.created_at DESC
  `;

  return result;
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

// 3. Cambiar el estado del gimnasio (active / suspended)
export async function toggleGymStatus(gymId: number, status: 'active' | 'suspended' | 'inactive') {
  const result = await sql`
    UPDATE gyms
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${gymId}
    RETURNING id, name, status, updated_at
  `;

  return result[0] ?? null;
}