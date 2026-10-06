import { sql } from "../db/neon";

export async function registerCheckIn(gymId: number, identifier: string) {
  // 1. Buscamos al miembro por DNI, Email o ID haciendo JOIN con users
  const [member] = await sql`
    SELECT 
      m.id AS member_id,
      m.user_id,
      m.first_name,
      m.last_name,
      m.gym_id,
      u.email
    FROM members m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.gym_id = ${gymId}
      AND (
        m.dni = ${identifier} 
        OR u.email = ${identifier} 
        OR m.id::text = ${identifier}
      )
    LIMIT 1
  `;

  if (!member) {
    return { success: false, code: "NOT_FOUND", message: "Usuario no encontrado" };
  }

  // 2. Verificamos la suscripción activa usando member_id
  const [sub] = await sql`
    SELECT s.status, s.end_date, mp.name as plan_name
    FROM subscriptions s
    LEFT JOIN membership_plans mp ON s.plan_id = mp.id
    WHERE s.member_id = ${member.member_id}
    ORDER BY s.end_date DESC
    LIMIT 1
  `;

  const isExpired = !sub || new Date(sub.end_date) < new Date() || sub.status !== "active";

  if (isExpired) {
    return {
      success: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "Membresía vencida o inactiva",
      member: {
        id: member.member_id,
        name: `${member.first_name} ${member.last_name}`,
        plan: sub?.plan_name || "Sin plan activo",
        endDate: sub?.end_date || null,
      },
    };
  }

  const [attendance] = await sql`
  INSERT INTO attendance (member_id, check_in)
  VALUES (${member.member_id}, NOW())
  RETURNING id, check_in
`;

return {
  success: true,
  message: "Acceso permitido",
  member: {
    id: member.member_id,
    name: `${member.first_name} ${member.last_name}`,
    plan: sub.plan_name || "Membresía Activa",
    endDate: sub.end_date,
  },
  checkInTime: attendance.check_in,
};
}