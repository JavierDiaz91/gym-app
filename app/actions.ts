"use server";

import { sql } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Member } from "./types/member";
import { AttendanceStat } from "./types/attendance";
import { TrainerMember } from "./types/trainer";
import { MemberRoutine } from "@/app/types/routine";
import { decodeSession, encodeSession, getSessionCookieName } from "@/lib/session";

// ==================== AUTH ACTIONS ====================

export async function registerUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string | null;

    if (!email || !password || !name) {
      return { error: "Todos los campos son requeridos" };
    }

    // 1️⃣ Verificar email duplicado
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existing.length > 0) {
      return { error: "El email ya está registrado" };
    }

    // 2️⃣ Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Crear usuario
    const userResult = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${email}, ${hashedPassword}, 'member')
      RETURNING id
    `;
    const userId = userResult[0].id;

    // 4️⃣ Crear perfil de miembro
    await sql`
      INSERT INTO members (
        user_id,
        first_name,
        last_name,
        phone,
        status,
        join_date
      )
      VALUES (
        ${userId},
        ${name.split(" ")[0]},
        ${name.split(" ").slice(1).join(" ") || ""},
        ${phone},
        'active',
        NOW()
      )
    `;

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Error al registrar usuario" };
  }
}

export async function loginUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email y contraseña requeridos" };
    }

    const users = await sql`
      SELECT id, email, password_hash, role
      FROM users
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return { error: "Credenciales inválidas" };
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return { error: "Credenciales inválidas" };
    }

    const sessionData = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const cookieStore = await cookies();
    const encodedSession = await encodeSession(sessionData);

    cookieStore.set(getSessionCookieName(), encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return {
      success: true,
      user: sessionData,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Error al iniciar sesión" };
  }
}


export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(getSessionCookieName());

  if (!session) return null;

  return decodeSession(session.value);
}

// ==================== MEMBER ACTIONS ====================
export async function getMembers(): Promise<Member[]> {
  try {
    const members = await sql`
      SELECT 
        m.*,
        mp.name AS plan_name,
        s.status AS subscription_status,
        s.end_date AS subscription_end
      FROM members m
      LEFT JOIN subscriptions s 
        ON m.id = s.member_id AND s.status = 'active'
      LEFT JOIN membership_plans mp 
        ON s.plan_id = mp.id
      ORDER BY m.created_at DESC
    `;

    return members as Member[];
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
}

export async function getMemberById(id: number): Promise<Member | null> {
  try {
    const members = await sql`
      SELECT 
        m.*,
        mp.name AS plan_name,
        s.status AS subscription_status,
        s.start_date AS subscription_start,
        s.end_date AS subscription_end
      FROM members m
      LEFT JOIN subscriptions s 
        ON m.id = s.member_id AND s.status = 'active'
      LEFT JOIN membership_plans mp 
        ON s.plan_id = mp.id
      WHERE m.id = ${id}
    `;

    return (members[0] as Member) ?? null;
  } catch (error) {
    console.error("Error fetching member:", error);
    return null;
  }
}

export async function createMember(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const emergencyContact = formData.get("emergencyContact") as string;

  try {
    await sql`
      INSERT INTO members (first_name, last_name, email, phone, emergency_contact)
      VALUES (${firstName}, ${lastName}, ${email}, ${phone || null}, ${emergencyContact || null})
    `;
    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error creating member:", error);
    return { error: "Error al crear miembro" };
  }
}

export async function updateMember(id: number, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const status = formData.get("status") as string;

  try {
    await sql`
      UPDATE members 
      SET first_name = ${firstName}, 
          last_name = ${lastName}, 
          email = ${email}, 
          phone = ${phone || null},
          status = ${status || "active"}
      WHERE id = ${id}
    `;
    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating member:", error);
    return { error: "Error al actualizar miembro" };
  }
}

export async function deleteMember(id: number) {
  try {
    await sql`DELETE FROM members WHERE id = ${id}`;
    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting member:", error);
    return { error: "Error al eliminar miembro" };
  }
}

// ==================== MEMBERSHIP PLANS ====================

export async function getMembershipPlans() {
  try {
    const plans = await sql`
      SELECT * FROM membership_plans 
      WHERE is_active = true 
      ORDER BY price ASC
    `;
    return plans;
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
}

export async function createSubscription(memberId: number, planId: number) {
  try {
    const plans = await sql`SELECT * FROM membership_plans WHERE id = ${planId}`;
    if (plans.length === 0) return { error: "Plan no encontrado" };

    const plan = plans[0];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    // Deactivate existing subscriptions
    await sql`
      UPDATE subscriptions SET status = 'cancelled' 
      WHERE member_id = ${memberId} AND status = 'active'
    `;

    await sql`
      INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
      VALUES (${memberId}, ${planId}, ${startDate.toISOString()}, ${endDate.toISOString()}, 'active')
    `;

    // Record payment
    await sql`
      INSERT INTO payments (member_id, amount, payment_type, description)
      VALUES (${memberId}, ${plan.price}, 'subscription', ${`Membresia: ${plan.name}`})
    `;

    revalidateTag("members", "max");
    revalidateTag("subscriptions", "max");
    return { success: true };
  } catch (error) {
    console.error("Error creating subscription:", error);
    return { error: "Error al crear suscripcion" };
  }
}

// ==================== CLASSES ====================

export async function getClasses() {
  try {
    const classes = await sql`
      SELECT c.*, t.first_name as trainer_first_name, t.last_name as trainer_last_name
      FROM classes c
      LEFT JOIN trainers t ON c.trainer_id = t.id
      WHERE c.is_active = true
      ORDER BY c.name
    `;
    return classes;
  } catch (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
}

export async function getClassSchedule() {
  try {
    const schedule = await sql`
      SELECT cs.*, c.name as class_name, c.description, c.duration_minutes,
        t.first_name as trainer_first_name, t.last_name as trainer_last_name,
        (SELECT COUNT(*) FROM class_bookings cb WHERE cb.schedule_id = cs.id AND cb.status = 'booked') as booked_count
      FROM class_schedule cs
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN trainers t ON cs.trainer_id = t.id
      WHERE cs.start_time >= NOW()
      ORDER BY cs.start_time ASC
      LIMIT 20
    `;
    return schedule;
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return [];
  }
}

export async function bookClass(memberId: number, scheduleId: number) {
  try {
    // Check if already booked
    const existing = await sql`
      SELECT id FROM class_bookings 
      WHERE member_id = ${memberId} AND schedule_id = ${scheduleId} AND status = 'booked'
    `;
    if (existing.length > 0) {
      return { error: "Ya tienes reserva para esta clase" };
    }

    // Check capacity
    const schedule = await sql`
      SELECT cs.max_capacity, 
        (SELECT COUNT(*) FROM class_bookings cb WHERE cb.schedule_id = cs.id AND cb.status = 'booked') as booked
      FROM class_schedule cs WHERE id = ${scheduleId}
    `;
    if (schedule.length === 0) return { error: "Clase no encontrada" };
    if (schedule[0].booked >= schedule[0].max_capacity) {
      return { error: "Clase llena" };
    }

    await sql`
      INSERT INTO class_bookings (member_id, schedule_id, status)
      VALUES (${memberId}, ${scheduleId}, 'booked')
    `;

    revalidateTag("schedule", "max");
    return { success: true };
  } catch (error) {
    console.error("Error booking class:", error);
    return { error: "Error al reservar clase" };
  }
}

// ==================== TRAINERS ====================

export async function getTrainers() {
  try {
    const trainers = await sql`
      SELECT * FROM trainers WHERE is_active = true ORDER BY first_name
    `;
    return trainers;
  } catch (error) {
    console.error("Error fetching trainers:", error);
    return [];
  }
}


// ==================== TRAINER ACTIONS ====================

export async function getTrainerMembers(
  trainerUserId: number
): Promise<TrainerMember[]> {
  try {
    const members = await sql`
      SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.phone,
        m.status
      FROM trainer_members tm
      JOIN trainers t ON tm.trainer_id = t.id
      JOIN members m ON tm.member_id = m.id
      WHERE t.user_id = ${trainerUserId}
      ORDER BY m.first_name
    `;

    return members as TrainerMember[];
  } catch (error) {
    console.error("Error fetching trainer members:", error);
    return [];
  }
}


// ==================== TRAINER ↔ MEMBERS ====================

export async function assignMemberToTrainer(
  trainerId: number,
  memberId: number
) {
  try {
    // evitar duplicados
    const existing = await sql`
      SELECT id FROM trainer_members
      WHERE trainer_id = ${trainerId} AND member_id = ${memberId}
    `;

    if (existing.length > 0) {
      return { error: "El alumno ya está asignado a este entrenador" };
    }

    await sql`
      INSERT INTO trainer_members (trainer_id, member_id)
      VALUES (${trainerId}, ${memberId})
    `;

    return { success: true };
  } catch (error) {
    console.error("Error assigning member to trainer:", error);
    return { error: "Error al asignar alumno" };
  }
}

// ==================== ATTENDANCE ====================

export async function recordAttendance(memberId: number) {
  try {
    await sql`
      INSERT INTO attendance (member_id, check_in)
      VALUES (${memberId}, NOW())
    `;
    revalidateTag("attendance", "max");
    return { success: true };
  } catch (error) {
    console.error("Error recording attendance:", error);
    return { error: "Error al registrar asistencia" };
  }
}

export async function getAttendanceStats(): Promise<AttendanceStat[]> {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(DISTINCT member_id) as unique_members,
        DATE(check_in) as date
      FROM attendance
      WHERE check_in >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(check_in)
      ORDER BY date DESC
    `;
    return stats as AttendanceStat[];
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    return [];
  }
}

export async function removeMemberFromTrainer(
  trainerId: number,
  memberId: number
) {
  try {
    await sql`
      DELETE FROM trainer_members
      WHERE trainer_id = ${trainerId} AND member_id = ${memberId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Error removing member:", error);
    return { error: "Error al quitar alumno" };
  }
}



// ==================== DASHBOARD STATS ====================

export async function getDashboardStats() {
  
  try {
    const [members, activeSubscriptions, todayAttendance, revenue] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM members WHERE status = 'active'`,
        sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`,
        sql`SELECT COUNT(*) as count FROM attendance WHERE DATE(check_in) = CURRENT_DATE`,
        sql`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(payment_date) >= DATE_TRUNC('month', CURRENT_DATE)`,
      ]);

    return {
      totalMembers: Number(members[0]?.count || 0),
      activeSubscriptions: Number(activeSubscriptions[0]?.count || 0),
      todayAttendance: Number(todayAttendance[0]?.count || 0),
      monthlyRevenue: Number(revenue[0]?.total || 0),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalMembers: 0,
      activeSubscriptions: 0,
      todayAttendance: 0,
      monthlyRevenue: 0,
    };
  }
}


// ==================== TRAINER---RUTINAS ====================

export async function createRoutine(
  trainerUserId: number,
  name: string,
  description?: string
) {
  try {
    // obtener trainer_id
    const trainer = await sql`
      SELECT id FROM trainers WHERE user_id = ${trainerUserId}
    `;

    if (trainer.length === 0) {
      return { error: "Entrenador no encontrado" };
    }

    const trainerId = trainer[0].id;

    await sql`
      INSERT INTO routines (trainer_id, name, description)
      VALUES (${trainerId}, ${name}, ${description || null})
    `;

    return { success: true };
  } catch (error) {
    console.error("Error creating routine:", error);
    return { error: "Error al crear rutina" };
  }
}

// ==================== TRAINER--ASIGNAR RUTINA ====================

export async function assignRoutineToMember(
  trainerUserId: number,
  memberId: number,
  routineId: number
) {
  try {
    // validar que la rutina pertenece al trainer
    const routine = await sql`
      SELECT r.id
      FROM routines r
      JOIN trainers t ON r.trainer_id = t.id
      WHERE r.id = ${routineId} AND t.user_id = ${trainerUserId}
    `;

    if (routine.length === 0) {
      return { error: "Rutina no válida" };
    }

    // evitar duplicados
    const existing = await sql`
      SELECT id FROM member_routines
      WHERE member_id = ${memberId}
        AND routine_id = ${routineId}
    `;

    if (existing.length > 0) {
      return { error: "La rutina ya está asignada al alumno" };
    }

    await sql`
      INSERT INTO member_routines (member_id, routine_id)
      VALUES (${memberId}, ${routineId})
    `;

    return { success: true };
  } catch (error) {
    console.error("Error assigning routine:", error);
    return { error: "Error al asignar rutina" };
  }
}

// Rutinas del trainer
export async function getTrainerRoutines(trainerUserId: number) {
  return await sql`
    SELECT r.id, r.name
    FROM routines r
    JOIN trainers t ON r.trainer_id = t.id
    WHERE t.user_id = ${trainerUserId}
    ORDER BY r.name
  `;
}



// ==================== MIEMBRO → VER RUTINA ====================

export async function getMemberRoutine(
  memberUserId: number
): Promise<MemberRoutine | null> {
  try {
    // Obtener member_id desde user_id
    const memberResult = await sql`
      SELECT id FROM members WHERE user_id = ${memberUserId}
    `;

    if (memberResult.length === 0) return null;
    const memberId = Number(memberResult[0].id);

    // Obtener rutina asignada
    const routineResult = await sql`
      SELECT r.id, r.name, r.description
      FROM member_routines mr
      JOIN routines r ON mr.routine_id = r.id
      WHERE mr.member_id = ${memberId}
      LIMIT 1
    `;

    if (routineResult.length === 0) return null;

    const routine = routineResult[0];

    // Obtener ejercicios de la rutina
    const exercisesResult = await sql`
      SELECT 
        e.id,
        e.name,
        re.day,
        re.sets,
        re.reps
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      WHERE re.routine_id = ${routine.id}
      ORDER BY re.day, re.order_index
    `;

    // MAPEO EXPLÍCITO 
    const exercises: RoutineExercise[] = exercisesResult.map((row) => ({
      id: Number(row.id),
      name: row.name,
      day: Number(row.day),
      sets: Number(row.sets),
      reps: Number(row.reps),
    }));

    // RETORNO FINAL
    return {
      id: Number(routine.id),
      name: routine.name,
      description: routine.description,
      exercises,
    };
  } catch (error) {
    console.error("Error fetching member routine:", error);
    return null;
  }
}
interface RoutineExercise {
  id: number;
  name: string;
  day: number;
  sets: number;
  reps: number;
}

