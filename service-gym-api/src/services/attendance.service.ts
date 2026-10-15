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

  // La vigencia se determina por fechas; una renovacion futura no reemplaza
  // a la membresia que cubre el dia actual.
  const [sub] = await sql`
    SELECT s.status, s.end_date, mp.name AS plan_name
    FROM subscriptions s
    JOIN membership_plans mp ON mp.id = s.plan_id AND mp.gym_id = ${gymId}
    WHERE s.member_id = ${member.member_id}
      AND s.status IN ('active', 'scheduled')
      AND s.payment_status = 'paid'
      AND s.start_date <= CURRENT_DATE
      AND s.end_date > CURRENT_DATE
    ORDER BY s.start_date DESC
    LIMIT 1
  `;

  const isExpired = !sub;

  if (isExpired) {
    return {
      success: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "Membresía vencida o inactiva",
      member: {
        id: member.member_id,
        name: `${member.first_name} ${member.last_name}`,
        plan: "Sin plan activo",
        endDate: null,
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