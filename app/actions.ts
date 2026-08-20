"use server";

import { sql } from "@/lib/db";
import { revalidateTag, revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Member } from "./types/member";
import { AttendanceStat } from "./types/attendance";
import { TrainerMember } from "./types/trainer";
import { MemberRoutine } from "@/app/types/routine";



// INTERFACES LOCALES
interface RoutineExercise {
  id: number;
  name: string;
  day: number;
  sets: number;
  reps: number;
}

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

    // Parsear Nombre y Apellido de forma limpia
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ""; // Si no hay apellido, queda vacío sin fallar

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
        ${firstName},
        ${lastName},
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
    cookieStore.set("session", JSON.stringify(sessionData), {
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
  cookieStore.delete("session");
  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies(); 
  const session = cookieStore.get("session");

  if (!session) return null;

  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
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
      SELECT 
        t.id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        t.phone, 
        t.specialization, 
        t.bio, 
        t.is_active 
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.first_name ASC
    `;

    return trainers.map((trainer: any) => ({
      id: Number(trainer.id),
      first_name: trainer.first_name || "Sin nombre",
      last_name: trainer.last_name || "",
      email: trainer.email || `${trainer.first_name?.toLowerCase() || "trainer"}@gym.com`,
      phone: trainer.phone || undefined,
      specialization: trainer.specialization || undefined,
      bio: trainer.bio || undefined,
      is_active: trainer.is_active === null || trainer.is_active === undefined ? true : Boolean(trainer.is_active),
    }));

  } catch (error) {
    console.error("Error fetching trainers:", error);
    return [];
  }
}
// ==================== TRAINER ↔ MEMBERS ====================

export async function assignMemberToTrainer(email: string, sessionUserId: number | string) {
  try {
    // 1. Buscamos el ID del entrenador correspondiente al usuario logueado
    const trainerResult = await sql`
      SELECT id FROM trainers WHERE user_id = ${sessionUserId} LIMIT 1
    `;

    if (trainerResult.length === 0) {
      return { error: "No se encontró un perfil de entrenador asociado a tu usuario." };
    }

    const trainerId = trainerResult[0].id;

    // 2. Actualizamos el alumno buscando el id de usuario a través de la tabla 'users'
    const result = await sql`
      UPDATE members
      SET 
        trainer_id = ${trainerId},
        routine_id = NULL -- Reseteamos la rutina previa para que arranque limpio
      WHERE user_id = (
        SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
      )
      RETURNING id, first_name, last_name;
    `;

    if (result.length === 0) {
      return { error: "No se encontró ningún alumno registrado con ese correo electrónico." };
    }

    revalidatePath("/trainer/alumnos");
    return { success: true };
  } catch (error) {
    console.error("Error al vincular alumno:", error);
    return { error: "Ocurrió un error al vincular el alumno." };
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

// ==================== TRAINER---RUTINAS (ÚNICA Y CORREGIDA) ====================

// 2. GUARDAR O ACTUALIZAR RUTINA
export async function saveOrUpdateRoutine(
  title: string,
  notes: string,
  routineId?: number
) {
  const session = await getSession();
  if (!session || session.role !== "trainer") {
    return { error: "No autorizado. Debes ser un entrenador." };
  }

  try {
    const trainerResult = await sql`
      SELECT id FROM trainers WHERE user_id = ${session.id}
    `;

    if (trainerResult.length === 0) {
      return { error: "Tu usuario no tiene un perfil de entrenador registrado." };
    }

    const realTrainerId = trainerResult[0].id;

    if (routineId) {
      // MODO EDICIÓN
      const updateResult = await sql`
        UPDATE routines 
        SET title = ${title}, notes = ${notes}
        WHERE id = ${Number(routineId)} AND trainer_id = ${realTrainerId}
        RETURNING id;
      `;

      if (updateResult.length === 0) {
        return { error: "La rutina no existe o no tienes permisos para editarla." };
      }
    } else {
      // MODO CREACIÓN (Insertamos con is_archived = false por defecto)
      await sql`
        INSERT INTO routines (title, notes, trainer_id, is_archived)
        VALUES (${title}, ${notes}, ${realTrainerId}, FALSE);
      `;
    }

    revalidatePath("/trainer/rutinas");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en saveOrUpdateRoutine:", error);
    return { error: error.message || "Error al procesar la rutina." };
  }
}

// 1. OBTENER RUTINAS
export async function getTrainerRoutines(userId: number) {
  try {
    // Buscamos primero el realTrainerId a partir del session.id
    const trainerResult = await sql`
      SELECT id FROM trainers WHERE user_id = ${userId}
    `;

    if (trainerResult.length === 0) return [];

    const realTrainerId = trainerResult[0].id;

    // Traemos las rutinas asignadas a ese trainer_id que no estén archivadas
    const routines = await sql`
      SELECT id, title, notes 
      FROM routines 
      WHERE trainer_id = ${realTrainerId}
        AND (is_archived IS FALSE OR is_archived IS NULL)
      ORDER BY id DESC
    `;

    return routines;
  } catch (error) {
    console.error("❌ Error en getTrainerRoutines:", error);
    return [];
  }
}

export async function getTrainerMembers(userId: number) {
  try {
    const trainerRes = await sql`
      SELECT id FROM trainers WHERE user_id = ${userId} LIMIT 1
    `;
    if (!trainerRes.length) return [];
    const trainerId = trainerRes[0].id;

    const res = await sql`
      SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.phone,
        m.status,
        m.routine_id,
        r.title AS routine_name,
        (
          SELECT wl.completed_at 
          FROM workout_logs wl 
          WHERE wl.member_id = m.id 
          ORDER BY wl.completed_at DESC 
          LIMIT 1
        ) AS last_workout_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', r_sub.id,
                'title', r_sub.title
              )
            )
            FROM member_routines mr
            JOIN routines r_sub ON mr.routine_id = r_sub.id
            WHERE (mr.member_id = m.id OR mr.member_id = m.user_id)
              AND (mr.is_active = true OR mr.is_active IS NULL)
              AND (r_sub.is_archived IS FALSE OR r_sub.is_archived IS NULL)
          ),
          '[]'::json
        ) AS routines
      FROM members m
      LEFT JOIN routines r ON m.routine_id = r.id
      WHERE m.trainer_id = ${trainerId}
      ORDER BY m.id DESC
    `;

    return res;
  } catch (error) {
    console.error("Error al obtener alumnos:", error);
    return [];
  }
}

export async function assignRoutineToMember(
  memberIdOrUserId: number,
  routineId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener el ID real de la tabla 'members'
    const memberRes = await sql`
      SELECT id FROM members 
      WHERE id = ${memberIdOrUserId} OR user_id = ${memberIdOrUserId}
      LIMIT 1;
    `;

    if (!memberRes || memberRes.length === 0) {
      return { success: false, error: "El alumno no existe en la base de datos." };
    }

    const realMemberId = Number(memberRes[0].id);

    // 2. Insertar o activar en member_routines
    const existing = await sql`
      SELECT id FROM member_routines 
      WHERE member_id = ${realMemberId} AND routine_id = ${routineId}
      LIMIT 1;
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO member_routines (member_id, routine_id, is_active)
        VALUES (${realMemberId}, ${routineId}, true);
      `;
    } else {
      await sql`
        UPDATE member_routines 
        SET is_active = true 
        WHERE member_id = ${realMemberId} AND routine_id = ${routineId};
      `;
    }

    // 3. Revalidar las rutas afectadas
    revalidatePath("/trainer/alumnos");
    revalidatePath("/miembro");
    revalidatePath("/miembro/rutina");

    return { success: true };
  } catch (error) {
    console.error("Error al asignar rutina:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al asignar rutina" 
    };
  }
}
// ==================== MIEMBRO → VER RUTINA ====================

export async function getMemberRoutines(memberUserId: number) {
  try {
    // 1. Obtener el id de la tabla 'members'
    const memberResult = await sql`
      SELECT id FROM members WHERE user_id = ${memberUserId}
    `;

    if (memberResult.length === 0) return [];
    const memberId = Number(memberResult[0].id);

    // 2. Traer las rutinas asignadas en la tabla pivote que NO estén archivadas
    const routinesResult = await sql`
      SELECT r.id, r.title, r.notes, mr.id as assignment_id
      FROM member_routines mr
      JOIN routines r ON mr.routine_id = r.id
      WHERE mr.member_id = ${memberId}
        AND (r.is_archived IS FALSE OR r.is_archived IS NULL)
      ORDER BY mr.id DESC
    `;

    if (routinesResult.length === 0) return [];

    // 3. Mapear y parsear los ejercicios de cada rutina
    const routines = routinesResult.map((routine) => {
      let exercises = [];
      try {
        if (typeof routine.notes === "string" && routine.notes.trim().startsWith("[")) {
          exercises = JSON.parse(routine.notes);
        } else if (Array.isArray(routine.notes)) {
          exercises = routine.notes;
        }
      } catch (e) {
        console.error(`Error parseando ejercicios de rutina #${routine.id}:`, e);
      }

      return {
        id: Number(routine.id),
        title: routine.title || "Sin título",
        exercises: exercises,
        exercise_count: exercises.length,
      };
    });

    return routines;
  } catch (error) {
    console.error("Error fetching member routines:", error);
    return [];
  }
}


// ==================== TRAINER STATS ====================

export async function getTrainerStats(userId: number) {
  try {
    // 1. Obtener el ID real de la tabla trainers
    const trainerRes = await sql`
      SELECT id FROM trainers WHERE user_id = ${userId} LIMIT 1
    `;

    if (!trainerRes || trainerRes.length === 0) {
      return { totalAlumnos: 0, totalRutinas: 0 };
    }

    const realTrainerId = trainerRes[0].id;

    // 2. Consultar conteo de alumnos y rutinas activas asociadas al entrenador
    const [alumnosRes, rutinasRes] = await Promise.all([
      sql`
        SELECT COUNT(*)::int as count 
        FROM members 
        WHERE trainer_id = ${realTrainerId}
      `,
      sql`
        SELECT COUNT(*)::int as count 
        FROM routines 
        WHERE trainer_id = ${realTrainerId} 
          AND (is_archived IS FALSE OR is_archived IS NULL)
      `,
    ]);

    return {
      totalAlumnos: Number(alumnosRes[0]?.count || 0),
      totalRutinas: Number(rutinasRes[0]?.count || 0),
    };
  } catch (error) {
    console.error("❌ Error en getTrainerStats:", error);
    return {
      totalAlumnos: 0,
      totalRutinas: 0,
    };
  }
}


export async function logWorkout(routineId: number, details: any) {
  const session = await getSession();

  if (!session || session.role !== "member") {
    return { success: false, error: "No autorizado" };
  }

  try {
    // 1. Obtener el id de miembro correspondiente al usuario logueado
    const memberRes = await sql`
      SELECT id FROM members WHERE user_id = ${session.id} LIMIT 1
    `;

    if (memberRes.length === 0) {
      return { success: false, error: "Miembro no encontrado" };
    }

    const memberId = memberRes[0].id;

    // 2. Insertar el registro en workout_logs asegurando el timestamp
    await sql`
      INSERT INTO workout_logs (member_id, routine_id, completed_at, details)
      VALUES (${memberId}, ${routineId}, NOW(), ${JSON.stringify(details)})
    `;

    // Revalidamos ambas rutas para que el profesor vea el cambio al instante
    revalidatePath("/miembro");
    revalidatePath("/trainer/alumnos");
    
    return { success: true };
  } catch (error) {
    console.error("Error al guardar el entrenamiento:", error);
    return { success: false, error: "Error de servidor al registrar el entrenamiento" };
  }
}

export async function getCurrentUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_user_id")?.value; // 👈 Ajustá el nombre de tu cookie

    if (!userIdCookie) return null;
    return Number(userIdCookie);
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);
    return null;
  }
}

export async function getMemberRoutinesWithStatus(userId: number) {
  try {
    // 1. Buscamos al miembro verificando que TENGA ENTRENADOR ASIGNADO y routine_id
    const memberRes = await sql`
      SELECT id, routine_id, trainer_id 
      FROM members 
      WHERE user_id = ${userId} 
        AND trainer_id IS NOT NULL 
        AND routine_id IS NOT NULL 
      LIMIT 1
    `;

    if (!memberRes.length) {
      return [];
    }

    const member = memberRes[0];

    // 2. Traemos la rutina asignada (sin r.description)
    const routines = await sql`
  SELECT 
    r.id,
    r.title,
    COALESCE(
      (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id), 0
    ) as exercise_count
  FROM routines r
  WHERE r.id = ${member.routine_id}
`;

    if (!routines.length) return [];

    // 3. Verificamos si la completó hoy
    const todayLog = await sql`
  SELECT id FROM workout_logs 
  WHERE member_id = ${member.id} 
    AND routine_id = ${member.routine_id}
    AND completed_at >= CURRENT_DATE
  LIMIT 1
`;

    const completedToday = todayLog.length > 0;

    return routines.map((r) => ({
      id: Number(r.id),
      title: String(r.title || "Rutina Asignada"),
      exercise_count: Number(r.exercise_count || 0),
      completedToday,
    }));
  } catch (error) {
    console.error("Error en getMemberRoutinesWithStatus:", error);
    return [];
  }
}
function formatWorkoutTime(dateStringOrObject: string | Date): string {
  if (!dateStringOrObject) return "";
  
  const date = new Date(dateStringOrObject);

  // Formateamos usando la zona horaria de Argentina en 24hs
  const timeFormatted = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Usar 24h (ej: 21:36)
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);

  return `${timeFormatted} hs`;
}


export async function getMemberRoutineData(routineId: number) {
  try {
    // 1. Traemos la rutina
    const routineRes = await sql`
      SELECT id, title, notes FROM routines WHERE id = ${routineId} LIMIT 1
    `;

    if (!routineRes.length) return null;
    const routine = routineRes[0];

    // 2. Traemos todos los ejercicios con sus imágenes de la DB
    const dbExercises = await sql`
      SELECT name, image_url, muscle_group, equipment FROM exercises
    `;

    // Map para buscar rápido por nombre en minúsculas (ignora espacios/mayúsculas)
    const exerciseMap = new Map(
      dbExercises.map((e) => [e.name.toLowerCase().trim(), e])
    );

    // 3. Parseamos los bloques/ejercicios guardados en notes
    let parsedBlocks = [];
    try {
      if (typeof routine.notes === "string" && routine.notes.trim().startsWith("[")) {
        parsedBlocks = JSON.parse(routine.notes);
      } else if (Array.isArray(routine.notes)) {
        parsedBlocks = routine.notes;
      }
    } catch (e) {
      parsedBlocks = [];
    }

    // 4. Enriquecemos cada bloque con la imagen de la tabla 'exercises'
    const enrichedBlocks = parsedBlocks.map((block: any) => {
      const blockName = (block.nombre || block.name || "").toLowerCase().trim();
      const match = exerciseMap.get(blockName);

      return {
        ...block,
        // Si hay coincidencia en la DB usa esa imagen, si no la que traía o una por defecto
        image_url: match?.image_url || block.image_url || block.imagen || "/placeholder-exercise.jpg",
        muscle_group: match?.muscle_group || block.muscle_group,
        equipment: match?.equipment || block.equipment,
      };
    });

    return {
      id: Number(routine.id),
      title: routine.title || "Sin Título",
      bloques: enrichedBlocks,
    };
  } catch (error) {
    console.error("Error al obtener la rutina:", error);
    return null;
  }
}

// app/actions.ts

export async function getExercisesList() {
  try {
    const exercises = await sql`
      SELECT id, name, muscle_group 
      FROM exercises 
      ORDER BY name ASC
    `;
    return exercises;
  } catch (error) {
    console.error("Error al obtener lista de ejercicios:", error);
    return [];
  }
}

export async function deleteRoutine(routineId: number) {
  try {
    const id = Number(routineId);

    // 1. Quitar la rutina activa a todos los alumnos que la tengan asignada
    await sql`
      UPDATE members 
      SET routine_id = NULL 
      WHERE routine_id = ${id}
    `;

    // 2. Limpiar las asignaciones en la tabla pivote
    await sql`
      DELETE FROM member_routines 
      WHERE routine_id = ${id}
    `;

    // 3. Ocultar la rutina (Soft Delete para no romper historial de workout_logs viejos)
    await sql`
      UPDATE routines 
      SET is_archived = TRUE 
      WHERE id = ${id}
    `;

    // 4. Revalidar para actualizar el Dashboard del Profe y del Alumno al instante
    revalidatePath("/trainer/rutinas");
    revalidatePath("/trainer/alumnos");
    revalidatePath("/trainer");
    revalidatePath("/miembro");

    return { success: true };
  } catch (error: any) {
    console.error("Error al archivar rutina:", error);
    return { success: false, error: error.message };
  }
}

// app/actions.ts

export async function resetTodayWorkout(memberId: number, routineId: number) {
  try {
    await sql`
      DELETE FROM workout_logs 
      WHERE member_id = ${memberId} 
        AND routine_id = ${routineId} 
        AND DATE(completed_at) = CURRENT_DATE
    `;

    revalidatePath("/miembro");
    revalidatePath("/trainer/alumnos");

    return { success: true };
  } catch (error: any) {
    console.error("Error al reiniciar entrenamiento:", error);
    return { success: false, error: error.message };
  }
}

export async function removeMemberFromTrainer(memberId: number) {
  try {
    await sql`
      UPDATE members 
      SET trainer_id = NULL, routine_id = NULL 
      WHERE id = ${memberId}
    `;

    revalidatePath("/trainer/alumnos");
    revalidatePath("/miembro");
    return { success: true };
  } catch (error) {
    console.error("Error al desvincular:", error);
    return { error: "No se pudo desvincular al alumno." };
  }
}
export async function getMemberWorkoutHistory(memberId: number) {
  try {
    const history = await sql`
      SELECT 
        wl.id,
        wl.completed_at,
        wl.details,
        r.title as routine_title
      FROM workout_logs wl
      LEFT JOIN routines r ON r.id = wl.routine_id
      WHERE wl.member_id = ${memberId}
      ORDER BY wl.completed_at DESC
    `;

    return history;
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return [];
  }
}

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  const userId = session?.user?.id || session?.id || session?.userId;
  if (!userId) return { error: "No autorizado" };

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const emergencyContact = formData.get("emergencyContact") as string;

  try {
    // Actualizamos la tabla members
    await sql`
      UPDATE members
      SET 
        first_name = ${firstName},
        last_name = ${lastName},
        phone = ${phone},
        emergency_contact = ${emergencyContact}
      WHERE user_id = ${userId} OR id = ${userId}
    `;

    revalidatePath("/miembro/perfil");
    return { success: "Datos actualizados correctamente" };
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return { error: "Error al guardar los datos" };
  }
}

export async function updateAvatar(imageUrl: string) {
  const session = await getSession();
  const userId = session?.user?.id || session?.id || session?.userId;
  if (!userId) return { error: "No autorizado" };

  try {
    await sql`
      UPDATE members
      SET avatar_url = ${imageUrl}
      WHERE user_id = ${userId} OR id = ${userId}
    `;
    revalidatePath("/miembro/perfil");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar avatar:", error);
    return { error: "No se pudo actualizar la foto" };
  }
}

export async function updatePassword(prevState: any, formData: FormData) {
  "use server";

  const session = await getSession();
  const userId = session?.user?.id || session?.id || session?.userId;
  if (!userId) return { error: "No autorizado" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Todos los campos son obligatorios" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas nuevas no coinciden" };
  }

  try {
    const userResult = await sql`
      SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1
    `;
    const user = Array.isArray(userResult) ? userResult[0] : (userResult as any).rows?.[0];

    if (!user) {
      return { error: "Usuario no encontrado" };
    }

    // Comprobar si está encriptada con bcrypt o si es texto plano
    let isValid = false;
    if (user.password_hash.startsWith("$2a$") || user.password_hash.startsWith("$2b$")) {
      isValid = await bcrypt.compare(currentPassword, user.password_hash);
    } else {
      isValid = user.password_hash === currentPassword;
    }

    if (!isValid) {
      return { error: "La contraseña actual es incorrecta" };
    }

    // Encriptar la nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users
      SET password_hash = ${newHash}
      WHERE id = ${userId}
    `;

    revalidatePath("/miembro/perfil");
    return { success: "¡Contraseña actualizada con éxito!" };
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return { error: "Error interno al actualizar la contraseña" };
  }
}

// En app/actions.ts

export async function getTrainerMembersAndRoutines(userId: number) {
  try {
    // 1. Obtener el ID del entrenador correspondiente al usuario
    const trainerRes = await sql`
      SELECT id FROM trainers WHERE user_id = ${userId} LIMIT 1
    `;

    if (!trainerRes || trainerRes.length === 0) {
      return { members: [], routines: [] };
    }

    const trainerId = trainerRes[0].id;

    // 2. Traer SOLO los miembros asociados a este entrenador
    const membersRes = await sql`
      SELECT 
        m.id,
        m.full_name,
        m.gender,
        m.activity_type,
        m.level,
        m.routine_id
      FROM members m
      WHERE m.trainer_id = ${trainerId}
      ORDER BY m.full_name ASC
    `;

    // Normalizar los nombres para adaptarlos a la interfaz del cliente (first_name, last_name)
    const members = membersRes.map((m: any) => {
      const parts = (m.full_name || "").trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      return {
        id: m.id,
        first_name: firstName,
        last_name: lastName,
        gender: m.gender,
        activity_type: m.activity_type,
        level: m.level,
        routine_id: m.routine_id,
      };
    });

    // 3. Traer SOLO las rutinas no archivadas de este entrenador
    const routinesRes = await sql`
      SELECT id, name, description 
      FROM routines 
      WHERE trainer_id = ${trainerId}
        AND (is_archived IS FALSE OR is_archived IS NULL)
      ORDER BY created_at DESC
    `;

    return {
      members,
      routines: routinesRes,
    };
  } catch (error) {
    console.error("Error al obtener miembros y rutinas del entrenador:", error);
    return { members: [], routines: [] };
  }
}

// ==================== ASIGNACIÓN MASIVA DE RUTINAS ====================

export async function assignRoutineToMultipleMembersBulk(
  memberIds: number[],
  routineId: number
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!memberIds || memberIds.length === 0 || !routineId) {
    return { success: false, count: 0, error: "Datos inválidos" };
  }

  try {
    // 1. Obtener los IDs reales de la tabla 'members' para los IDs seleccionados
    const realMembersRes = await sql`
      SELECT id FROM members 
      WHERE id = ANY(${memberIds}::int[]) OR user_id = ANY(${memberIds}::int[]);
    `;

    const realMemberIds = Array.isArray(realMembersRes) 
      ? realMembersRes.map((m: any) => Number(m.id)) 
      : (realMembersRes as any).rows?.map((m: any) => Number(m.id)) || [];

    if (realMemberIds.length === 0) {
      return { success: false, count: 0, error: "No se encontraron alumnos válidos." };
    }

    // 2. Insertar en member_routines evitando duplicados (ON CONFLICT DO NOTHING)
    for (const mId of realMemberIds) {
      await sql`
        INSERT INTO member_routines (member_id, routine_id)
        VALUES (${mId}, ${routineId})
        ON CONFLICT DO NOTHING;
      `;
    }

    // 3. Actualizar la columna 'routine_id' direct en members
    await sql`
      UPDATE members
      SET routine_id = ${routineId},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${realMemberIds}::int[]);
    `;

    // 4. Revalidar vistas
    revalidatePath("/trainer");
    revalidatePath("/trainer/alumnos");
    revalidatePath("/miembro");

    return { success: true, count: realMemberIds.length };
  } catch (error) {
    console.error("Error en asignación masiva bulk:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Error al procesar asignación masiva",
    };
  }
}