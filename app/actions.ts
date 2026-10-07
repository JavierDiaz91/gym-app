"use server";

import { sql } from "@/lib/db";
import { revalidateTag, revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Member } from "./types/member";
import { AttendanceStat } from "./types/attendance";
import { TrainerMember } from "./types/trainer";
import { MemberRoutine } from "@/app/types/routine";
import { createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/session";



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
    const emailRaw = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string | null;
    const gymIdRaw = formData.get("gym_id") as string | null;

    if (!emailRaw || !password || !name) {
      return { error: "Todos los campos son requeridos" };
    }

    if (!gymIdRaw) {
      return { error: "No se especificó un gimnasio válido. Por favor escaneá el QR del gimnasio." };
    }

    // 1️⃣ Normalizar email
    const email = emailRaw.trim().toLowerCase();
    const gymId = parseInt(gymIdRaw, 10);

    // 2️⃣ Verificar si YA TIENE CREDENCIALES (en la tabla users)
    const existingUser = await sql`
      SELECT id FROM users WHERE LOWER(TRIM(email)) = ${email}
    `;
    if (existingUser.length > 0) {
      return { error: "El email ya está registrado. Por favor iniciá sesión." };
    }

    // Parsear Nombre y Apellido
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // 3️⃣ Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Crear usuario en la tabla 'users'
    const userResult = await sql`
      INSERT INTO users (email, password_hash, role, gym_id)
      VALUES (${email}, ${hashedPassword}, 'member', ${gymId})
      RETURNING id
    `;
    const userId = userResult[0].id;

    // 5️⃣ REVISAR SI EL ADMIN YA LE HABÍA CREADO LA FICHA EN 'members'
    const existingMember = await sql`
      SELECT id FROM members 
      WHERE LOWER(TRIM(email)) = ${email} AND gym_id = ${gymId}
    `;

    if (existingMember.length > 0) {
      // VINCULAR CON EL LEGAJO EXISTENTE DEL ADMIN
      await sql`
        UPDATE members 
        SET 
          user_id = ${userId},
          phone = COALESCE(NULLIF(${phone}, ''), phone)
        WHERE id = ${existingMember[0].id}
      `;
    } else {
      // CREAR FICHA NUEVA SI NO EXISTÍA
      await sql`
        INSERT INTO members (
          user_id,
          gym_id,
          first_name,
          last_name,
          email,
          phone,
          status,
          join_date
        )
        VALUES (
          ${userId},
          ${gymId},
          ${firstName},
          ${lastName},
          ${email},
          ${phone || null},
          'active',
          NOW()
        )
      `;
    }

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

    // 1. Agregamos gym_id a la consulta SQL
    const users = await sql`
      SELECT id, email, password_hash, role, gym_id
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
      id: Number(user.id),
      email: String(user.email),
      role: user.role,
      gymId: user.gym_id == null ? null : Number(user.gym_id),
    };

    const token = await createSessionToken(sessionData);
    const cookieStore = await cookies();
    cookieStore.set("session", token, sessionCookieOptions);

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

  return verifySessionToken(session.value);
}

async function requireTenantSession() {
  const session = await getSession();

  if (!session || session.gymId == null) {
    throw new Error("Sesión inválida o sin gimnasio asociado.");
  }

  return session;
}

// ==================== MEMBER ACTIONS ====================

export async function getMembers(query: string = ""): Promise<Member[]> {
  try {
    const session = await requireTenantSession();
    const searchTerm = `%${query.trim()}%`;

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
      WHERE m.gym_id = ${session.gymId}
        AND (
          ${query === ''} OR 
          m.first_name ILIKE ${searchTerm} OR 
          m.last_name ILIKE ${searchTerm} OR 
          m.email ILIKE ${searchTerm}
        )
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
    const session = await requireTenantSession();

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
        AND m.gym_id = ${session.gymId}
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
  const emailRaw = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const emergencyContact = formData.get("emergencyContact") as string;
  const planIdRaw = formData.get("planId") as string;

  const session = await requireTenantSession();
  const gymId = session.gymId;

  // 1. Normalizar email (sin espacios y en minúsculas)
  const email = emailRaw ? emailRaw.trim().toLowerCase() : "";

  if (!email) {
    return { error: "El email es obligatorio" };
  }

  try {
    // 2. Validar que no exista ya un miembro con ese correo
    const existingMember = await sql`
      SELECT id FROM members 
      WHERE LOWER(TRIM(email)) = ${email} AND gym_id = ${gymId}
    `;

    if (existingMember.length > 0) {
      return { error: "Ya existe un socio registrado con este correo electrónico." };
    }

    // 3. Insertar el miembro con el email sanitizado
    const [member] = await sql`
      INSERT INTO members (gym_id, first_name, last_name, email, phone, emergency_contact, status)
      VALUES (${gymId}, ${firstName}, ${lastName}, ${email}, ${phone || null}, ${emergencyContact || null}, 'active')
      RETURNING id
    `;

    // 4. Si seleccionó un plan, crear la suscripción inicial
    if (planIdRaw && planIdRaw !== "") {
      const planId = Number(planIdRaw);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await sql`
        INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
        VALUES (${member.id}, ${planId}, ${startDate.toISOString()}, ${endDate.toISOString()}, 'active')
      `;
    }

    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error creating member:", error);
    return { error: "Error al crear miembro" };
  }
}

//Actualizar miembro
export async function updateMember(id: number, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const emailRaw = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const status = formData.get("status") as string;

  // 1. Normalizar email
  const email = emailRaw ? emailRaw.trim().toLowerCase() : "";

  if (!email) {
    return { error: "El email no puede estar vacío" };
  }

  try {
    const session = await requireTenantSession();

    // 2. Actualizar únicamente dentro del gimnasio autenticado
    const [updatedMember] = await sql`
      UPDATE members 
      SET first_name = ${firstName}, 
          last_name = ${lastName}, 
          email = ${email}, 
          phone = ${phone || null},
          status = ${status || "active"}
      WHERE id = ${id}
        AND gym_id = ${session.gymId}
      RETURNING user_id
    `;

    if (!updatedMember) {
      return { error: "Miembro no encontrado." };
    }

    // 3. Sincronizar email en 'users' si el socio ya tiene credenciales creadas
    if (updatedMember?.user_id) {
      await sql`
        UPDATE users 
        SET email = ${email}, updated_at = NOW()
        WHERE id = ${updatedMember.user_id}
          AND gym_id = ${session.gymId}
      `;
    }

    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating member:", error);
    return { error: "Error al actualizar miembro" };
  }
}

//Eliminar miembro
export async function deleteMember(id: number) {
  try {
    const session = await requireTenantSession();

    const [member] = await sql`
      SELECT user_id
      FROM members
      WHERE id = ${id}
        AND gym_id = ${session.gymId}
    `;

    if (!member) {
      return { error: "Miembro no encontrado." };
    }

    await sql`
      DELETE FROM members
      WHERE id = ${id}
        AND gym_id = ${session.gymId}
    `;

    if (member.user_id) {
      await sql`
        DELETE FROM users
        WHERE id = ${member.user_id}
          AND gym_id = ${session.gymId}
      `;
    }

    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting member:", error);
    return { error: "Error al eliminar miembro. Verifica que no tenga pagos o asistencias registradas." };
  }
}

// ==================== MEMBERSHIP PLANS ====================

export async function getMembershipPlans() {
  try {
    const session = await requireTenantSession();

    const plans = await sql`
      SELECT * FROM membership_plans 
      WHERE is_active = true
        AND gym_id = ${session.gymId}
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
    const session = await requireTenantSession();

    const [member] = await sql`
      SELECT id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
    `;

    if (!member) return { error: "Miembro no encontrado" };

    const plans = await sql`
      SELECT *
      FROM membership_plans
      WHERE id = ${planId}
        AND gym_id = ${session.gymId}
        AND is_active = true
    `;

    if (plans.length === 0) return { error: "Plan no encontrado" };

    const plan = plans[0];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    await sql`
      UPDATE subscriptions
      SET status = 'cancelled'
      WHERE member_id = ${memberId}
        AND status = 'active'
    `;

    await sql`
      INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
      VALUES (${memberId}, ${planId}, ${startDate.toISOString()}, ${endDate.toISOString()}, 'active')
    `;

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
    const session = await requireTenantSession();

    const classes = await sql`
      SELECT
        c.*,
        t.first_name AS trainer_first_name,
        t.last_name AS trainer_last_name
      FROM classes c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.is_active = true
        AND t.gym_id = ${session.gymId}
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
    const session = await requireTenantSession();

    const schedule = await sql`
      SELECT
        cs.*,
        c.name AS class_name,
        c.description,
        c.duration_minutes,
        t.first_name AS trainer_first_name,
        t.last_name AS trainer_last_name,
        (
          SELECT COUNT(*)
          FROM class_bookings cb
          WHERE cb.schedule_id = cs.id
            AND cb.status = 'booked'
        ) AS booked_count
      FROM class_schedule cs
      JOIN classes c ON cs.class_id = c.id
      JOIN trainers t ON COALESCE(cs.trainer_id, c.trainer_id) = t.id
      WHERE cs.start_time >= NOW()
        AND t.gym_id = ${session.gymId}
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
    const session = await requireTenantSession();

    const [member] = await sql`
      SELECT id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
      LIMIT 1
    `;

    if (!member) return { error: "Miembro no encontrado" };

    const schedule = await sql`
      SELECT
        cs.id,
        cs.max_capacity,
        (
          SELECT COUNT(*)
          FROM class_bookings cb
          WHERE cb.schedule_id = cs.id
            AND cb.status = 'booked'
        ) AS booked
      FROM class_schedule cs
      JOIN classes c ON cs.class_id = c.id
      JOIN trainers t ON COALESCE(cs.trainer_id, c.trainer_id) = t.id
      WHERE cs.id = ${scheduleId}
        AND t.gym_id = ${session.gymId}
      LIMIT 1
    `;

    if (schedule.length === 0) return { error: "Clase no encontrada" };

    const existing = await sql`
      SELECT id
      FROM class_bookings
      WHERE member_id = ${memberId}
        AND schedule_id = ${scheduleId}
        AND status = 'booked'
    `;

    if (existing.length > 0) {
      return { error: "Ya tienes reserva para esta clase" };
    }

    if (Number(schedule[0].booked) >= Number(schedule[0].max_capacity)) {
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
    const session = await requireTenantSession();

    const trainers = await sql`
      SELECT
        t.id,
        t.first_name,
        t.last_name,
        u.email,
        t.specialization,
        t.bio,
        t.is_active
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      WHERE t.gym_id = ${session.gymId}
      ORDER BY t.first_name ASC
    `;

    return trainers.map((trainer: any) => ({
      id: Number(trainer.id),
      first_name: trainer.first_name || "Sin nombre",
      last_name: trainer.last_name || "",
      email: trainer.email || "",
      specialization: trainer.specialization || undefined,
      bio: trainer.bio || undefined,
      is_active:
        trainer.is_active === null || trainer.is_active === undefined
          ? true
          : Boolean(trainer.is_active),
    }));
  } catch (error) {
    console.error("Error fetching trainers:", error);
    return [];
  }
}

// ==================== TRAINER ↔ MEMBERS ====================

export async function assignMemberToTrainer(email: string, sessionUserId: number | string) {
  try {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Buscamos el ID y el gym_id del entrenador
    const trainerResult = await sql`
      SELECT id, gym_id FROM trainers WHERE user_id = ${sessionUserId} LIMIT 1
    `;

    if (trainerResult.length === 0) {
      return { error: "No se encontró un perfil de entrenador asociado a tu usuario." };
    }

    const { id: trainerId, gym_id: trainerGymId } = trainerResult[0];

    // 2. Buscamos el usuario por email Y validamos que sea de su mismo gym
    const userResult = await sql`
      SELECT id FROM users 
      WHERE LOWER(email) = ${cleanEmail} 
        AND gym_id = ${trainerGymId}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return { error: "No se encontró ningún alumno registrado en tu gimnasio con ese correo." };
    }

    const userId = userResult[0].id;

    // 3. Verificamos si el alumno ya existe en la tabla members
    const memberResult = await sql`
      SELECT id FROM members WHERE user_id = ${userId} LIMIT 1
    `;

    if (memberResult.length === 0) {
      // Si el usuario existe pero no tiene fila en 'members', la creamos
      await sql`
        INSERT INTO members (user_id, trainer_id, first_name, last_name)
        VALUES (${userId}, ${trainerId}, 'Alumno', 'Registrado')
      `;
    } else {
      // Si ya existe en 'members', actualizamos el trainer_id
      await sql`
        UPDATE members
        SET 
          trainer_id = ${trainerId},
          routine_id = NULL
        WHERE user_id = ${userId}
      `;
    }

    revalidatePath("/trainer/alumnos");
    return { success: true };
  } catch (error) {
    console.error("Error al vincular alumno:", error);
    return { error: "Ocurrió un error al vincular el alumno." };
  }
}

export async function createTrainer(formData: FormData) {
  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const specialization = formData.get("specialization") as string;
  const bio = formData.get("bio") as string;

  if (!firstName || !lastName || !email || !password) {
    return { error: "Nombre, apellido, correo y contraseña son obligatorios." };
  }

  try {
    const session = await requireTenantSession();
    const gymId = session.gymId;
    // 1. Encriptamos la clave con bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Insertamos el hash en la columna password_hash
    const userResult = await sql`
      INSERT INTO users (email, password_hash, role, gym_id)
      VALUES (${email.toLowerCase()}, ${hashedPassword}, 'trainer', ${gymId})
      RETURNING id
    `;

    if (userResult.length === 0) {
      return { error: "No se pudo crear el usuario base." };
    }

    const userId = userResult[0].id;

    // 3. Insertamos el perfil del entrenador
    await sql`
      INSERT INTO trainers (user_id, first_name, last_name, specialization, bio, is_active, gym_id)
      VALUES (${userId}, ${firstName.trim()}, ${lastName.trim()}, ${specialization || null}, ${bio || null}, true, ${gymId})
    `;

    revalidatePath("/admin/entrenadores");
    return { success: true };
  } catch (error: any) {
    console.error("Error al crear entrenador:", error);
    if (error?.code === "23505") {
      return { error: "Ya existe un usuario registrado con este correo electrónico." };
    }
    return { error: "Ocurrió un error al intentar crear el entrenador." };
  }
}

// ==================== ATTENDANCE ====================

export async function recordAttendance(memberId: number) {
  try {
    const session = await requireTenantSession();

    const [member] = await sql`
      SELECT id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
    `;

    if (!member) return { error: "Miembro no encontrado" };

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
    const session = await requireTenantSession();

    const stats = await sql`
      SELECT
        COUNT(*) AS total_visits,
        COUNT(DISTINCT a.member_id) AS unique_members,
        DATE(a.check_in) AS date
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      WHERE a.check_in >= NOW() - INTERVAL '30 days'
        AND m.gym_id = ${session.gymId}
      GROUP BY DATE(a.check_in)
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
    const session = await requireTenantSession();

    const [members, activeSubscriptions, todayAttendance, revenue] =
      await Promise.all([
        sql`
          SELECT COUNT(*) AS count
          FROM members
          WHERE status = 'active'
            AND gym_id = ${session.gymId}
        `,
        sql`
          SELECT COUNT(*) AS count
          FROM subscriptions s
          JOIN members m ON s.member_id = m.id
          WHERE s.status = 'active'
            AND m.gym_id = ${session.gymId}
        `,
        sql`
          SELECT COUNT(*) AS count
          FROM attendance a
          JOIN members m ON a.member_id = m.id
          WHERE DATE(a.check_in) = CURRENT_DATE
            AND m.gym_id = ${session.gymId}
        `,
        sql`
          SELECT COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          JOIN members m ON p.member_id = m.id
          WHERE DATE(p.payment_date) >= DATE_TRUNC('month', CURRENT_DATE)
            AND m.gym_id = ${session.gymId}
        `,
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

  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  // Extraer la ID de la sesión de manera segura
  const currentUserId = session.id || session.userId || session.user?.id;

  try {
    // 1. Obtener el id de miembro correspondiente al usuario logueado
    const memberRes = await sql`
      SELECT id FROM members WHERE user_id = ${currentUserId} LIMIT 1
    `;

    if (memberRes.length === 0) {
      return { success: false, error: "Miembro no encontrado" };
    }

    const memberId = memberRes[0].id;

    // 2. Insertar el registro en workout_logs
    await sql`
      INSERT INTO workout_logs (member_id, routine_id, completed_at, details)
      VALUES (${memberId}, ${routineId}, NOW(), ${JSON.stringify(details)})
    `;

    // 3. Revalidar TODAS las rutas afectadas para purgar el caché de Next.js
    revalidatePath("/miembro");
    revalidatePath("/miembro/rutina");
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


const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_URL}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function getApiAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    throw new Error("Sesión requerida para acceder a la API.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// app/actions.ts
export async function getGymStatusAction(gymId: number | string) {
  if (!gymId) return null;

  try {
    const res = await fetch(apiUrl(`/gyms/${gymId}`), {
      method: "GET",
      headers: await getApiAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const result = await res.json();
    
    // Si tu API devuelve { data: { status: "suspended" } }, retornamos directamente 'data'
    return result.data || result; 
  } catch (error) {
    console.error("Error al obtener estado del gimnasio:", error);
    return null;
  }
}

// app/actions.ts

export async function createGymAction(formData: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const response = await fetch(apiUrl("/gyms"), {
      method: "POST",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Error al crear gimnasio" };
    }

    return { success: true, data: result.data || result };
  } catch (error) {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}
export async function toggleGymStatusAction(gymId: number, newStatus: string) {
  try {
    const res = await fetch(apiUrl(`/gyms/${gymId}/status`), {
      method: "PATCH",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      // Invalida la caché del Server Component para esta ruta
      revalidatePath("/admin/gimnasios");
    }

    return data;
  } catch (error) {
    return { success: false, error: "Error al actualizar estado" };
  }
}



export async function getGymsAction() {
  try {
    const res = await fetch(apiUrl("/gyms"), {
      method: "GET",
      headers: await getApiAuthHeaders(),
      cache: "no-store", // Garantiza datos frescos de los gimnasios
    });

    if (!res.ok) {
      return { success: false, data: [] };
    }

    const data = await res.json();
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error("Error al obtener gimnasios:", error);
    return { success: false, data: [] };
  }
}

export async function processCheckInAction(identifier: string) {
  const session = await getSession();
  const gymId = session?.gymId;

  if (!gymId) {
    return { success: false, message: "Sesión inválida o gimnasio no detectado" };
  }

  try {
    const res = await fetch(apiUrl("/attendance/check-in"), {
      method: "POST",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify({ identifier }),
      cache: "no-store",
    });

    return await res.json();
  } catch (error) {
    console.error("Error en processCheckInAction:", error);
    return { success: false, message: "Error al conectar con el servidor" };
  }
}

//Gestionar planes 
export async function getPlansAction() {
  const session = await getSession();
  const gymId = session?.gymId;
  if (!gymId) return [];

  try {
    const res = await fetch(apiUrl("/memberships/plans"), {
      headers: await getApiAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    console.error("Error al obtener planes:", error);
    return [];
  }
}


//Creacion de planes
export async function createPlanAction(formData: FormData) {
  const session = await getSession();
  const gymId = session?.gymId; 

  const name = formData.get("name") as string;
  const price = formData.get("price");
  const durationMonths = formData.get("durationMonths");
  const description = formData.get("description") as string;

  try {
    const res = await fetch(apiUrl("/memberships/plans"), {
      method: "POST",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify({ name, price, durationMonths, description }),
    });

    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch {
      console.error("Respuesta inesperada del servidor (no es JSON):", text);
      return { success: false, error: "Respuesta no válida del servidor" };
    }
  } catch (error) {
    console.error("Error al crear plan:", error);
    return { success: false, error: "Error de conexión" };
  }
}

//Editar, eliminar y actualizar planes
export async function updatePlanAction(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const price = formData.get("price");
  const durationMonths = formData.get("durationMonths");
  const description = formData.get("description") as string;
  const isActive = formData.get("isActive") === "true";

  try {
    const res = await fetch(apiUrl(`/memberships/plans/${id}`), {
      method: "PUT",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify({ name, price, durationMonths, description, isActive }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error al actualizar plan:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function deletePlanAction(id: number) {
  try {
    const res = await fetch(apiUrl(`/memberships/plans/${id}`), {
      method: "DELETE",
      headers: await getApiAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    console.error("Error al desactivar plan:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// Actualizar estado del miembro (active, suspended, inactive)
export async function updateMemberStatusAction(memberId: number, status: string) {
  try {
    const session = await requireTenantSession();

    const result = await sql`
      UPDATE members 
      SET status = ${status}, updated_at = NOW() 
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
      RETURNING id
    `;

    if (result.length === 0) {
      return { error: "Miembro no encontrado" };
    }

    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { error: "Error al cambiar el estado del miembro" };
  }
}

export async function deleteMemberAction(memberId: number) {
  try {
    const session = await requireTenantSession();

    const [member] = await sql`
      SELECT id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
    `;

    if (!member) {
      return { error: "Miembro no encontrado" };
    }

    await sql`
      DELETE FROM subscriptions
      WHERE member_id = ${memberId}
    `;

    await sql`
      DELETE FROM members
      WHERE id = ${memberId}
        AND gym_id = ${session.gymId}
    `;

    revalidateTag("members", "max");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar miembro:", error);
    return { error: "Error al eliminar el miembro" };
  }
}

export async function updateMemberAction(
  id: number,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    plan_id?: number;
  }
) {
  try {
    const session = await requireTenantSession();

    const updated = await sql`
      UPDATE members
      SET 
        first_name = ${data.first_name},
        last_name = ${data.last_name},
        email = ${data.email},
        phone = ${data.phone},
        updated_at = NOW()
      WHERE id = ${id}
        AND gym_id = ${session.gymId}
      RETURNING id
    `;

    if (updated.length === 0) {
      return { success: false, error: "Miembro no encontrado" };
    }

    if (data.plan_id) {
      const [plan] = await sql`
        SELECT id
        FROM membership_plans
        WHERE id = ${data.plan_id}
          AND gym_id = ${session.gymId}
          AND is_active = true
      `;

      if (!plan) {
        return { success: false, error: "Plan no encontrado" };
      }

      await sql`
        UPDATE subscriptions 
        SET status = 'cancelled' 
        WHERE member_id = ${id}
          AND status = 'active'
      `;

      await sql`
        INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
        VALUES (
          ${id},
          ${data.plan_id},
          NOW(),
          NOW() + INTERVAL '30 days',
          'active'
        )
      `;
    }

    revalidatePath("/admin/miembros");
    return { success: true };
  } catch (error) {
    console.error("Error updating member:", error);
    return { success: false, error: "Error al actualizar los datos del miembro" };
  }
}


// Registros de miembros (vía QR)
export async function registerMemberAction(formData: FormData) {
  const emailRaw = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const gymIdParam = formData.get("gymId") as string;

  // Normalizar email para evitar fallas por espacios o mayúsculas
  const email = emailRaw ? emailRaw.trim().toLowerCase() : "";
  const gymId = Number(gymIdParam);

  if (!gymId || isNaN(gymId)) {
    return { success: false, error: "Gimnasio no especificado o inválido" };
  }

  try {
    // 1. Verificar si la cuenta de usuario (login) ya existe
    const existingUser = await sql`SELECT id FROM users WHERE LOWER(email) = ${email}`;
    if (existingUser.length > 0) {
      return { success: false, error: "El email ya se encuentra registrado" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 2. Crear credenciales en la tabla 'users'
    const [newUser] = await sql`
      INSERT INTO users (email, password_hash, role, gym_id, created_at, updated_at)
      VALUES (${email}, ${passwordHash}, 'member', ${gymId}, NOW(), NOW())
      RETURNING id
    `;

    // 3. BUSCAR si el admin ya le creó un legajo previo en 'members' sin user_id
const existingMember = await sql`
  SELECT id FROM members 
  WHERE LOWER(TRIM(email)) = ${email} 
    AND gym_id = ${gymId}
  ORDER BY created_at ASC
  LIMIT 1
`;

if (existingMember.length > 0) {
  // ---- CASO A: VINCULAR FICHA EXISTENTE
  await sql`
    UPDATE members 
    SET 
      user_id = ${newUser.id},
      phone = COALESCE(NULLIF(${phone}, ''), phone),
      updated_at = NOW()
    WHERE id = ${existingMember[0].id}
  `;
} else {
  // ---- CASO B: CREAR FICHA NUEVA ----
  await sql`
    INSERT INTO members (user_id, gym_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (${newUser.id}, ${gymId}, ${firstName}, ${lastName}, ${email}, ${phone}, 'active', NOW(), NOW())
  `;
}

    return { success: true };
  } catch (error) {
    console.error("Error en el registro:", error);
    return { success: false, error: "Error al registrar la cuenta" };
  }
}

export async function assignMembershipAction(memberId: number, membershipId: number) {
  try {
    const res = await fetch(apiUrl(`/members/${memberId}/memberships`), {
      method: "POST",
      headers: await getApiAuthHeaders(),
      body: JSON.stringify({ membership_id: membershipId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Error al asignar la membresía" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error de conexión" };
  }
}




export async function createSuperAdminSeed() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    // Eliminamos registros previos para evitar duplicados
    await sql`DELETE FROM users WHERE LOWER(email) = 'diazjavier769@gmail.com'`;

    // Insertamos el usuario con el hash generado por tu mismo entorno
    await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES ('diazjavier769@gmail.com', ${hashedPassword}, 'superadmin')
    `;

    return { success: true, message: "Usuario superadmin creado correctamente." };
  } catch (error) {
    console.error("Error al crear seed:", error);
    return { error: "No se pudo crear el usuario." };
  }
}


//Funcion para registrar asistencia de alumnos
export async function registerAttendanceAction(memberIdentifier: string) {
  try {
    const session = await getSession();
    const gymId = session?.gymId || 1;
    const cleanInput = memberIdentifier.trim();
    const isNumber = /^\d+$/.test(cleanInput);
    const searchTerm = `%${cleanInput.toLowerCase()}%`;

    // 1. Búsqueda inteligente adaptada al tipo de dato
    const members = isNumber
      ? await sql`
          SELECT 
            m.id,
            m.first_name,
            m.last_name,
            m.status,
            mp.name AS plan_name,
            s.end_date AS subscription_end,
            s.status AS subscription_status
          FROM members m
          LEFT JOIN subscriptions s 
            ON m.id = s.member_id AND s.status = 'active'
          LEFT JOIN membership_plans mp 
            ON s.plan_id = mp.id
          WHERE m.gym_id = ${gymId}
            AND m.id = ${parseInt(cleanInput, 10)}
          LIMIT 1
        `
      : await sql`
          SELECT 
            m.id,
            m.first_name,
            m.last_name,
            m.status,
            mp.name AS plan_name,
            s.end_date AS subscription_end,
            s.status AS subscription_status
          FROM members m
          LEFT JOIN subscriptions s 
            ON m.id = s.member_id AND s.status = 'active'
          LEFT JOIN membership_plans mp 
            ON s.plan_id = mp.id
          WHERE m.gym_id = ${gymId}
            AND (
              LOWER(m.email) = LOWER(${cleanInput})
              OR LOWER(m.first_name) LIKE ${searchTerm}
              OR LOWER(m.last_name) LIKE ${searchTerm}
              OR LOWER(m.first_name || ' ' || m.last_name) LIKE ${searchTerm}
            )
          ORDER BY m.id DESC
          LIMIT 1
        `;

    if (members.length === 0) {
      return { success: false, error: "Miembro no encontrado" };
    }

    const member = members[0];
    const now = new Date();
    const isSubscriptionValid = member.subscription_end && new Date(member.subscription_end) >= now;

    // 2. Determinar estado de acceso
    let accessGranted = false;
    let message = "";

    if (member.status !== "active") {
      const statusTranslation: Record<string, string> = {
        suspended: "Suspendido",
        inactive: "Inactivo",
      };
      const statusLabel = statusTranslation[member.status] || member.status;

      message = `Acceso Denegado: Miembro ${statusLabel}`;
    } else if (!isSubscriptionValid) {
      message = "Acceso Denegado: Membresía vencida o no asignada";
    } else {
      accessGranted = true;
      message = "Acceso Permitido";
    }

    // 3. Registrar únicamente si el acceso es permitido
    if (accessGranted) {
      await sql`
        INSERT INTO attendance (member_id, check_in)
        VALUES (${member.id}, NOW())
      `;
    }

    revalidatePath("/admin/asistencias");

    return {
      success: true,
      accessGranted,
      message,
      member: {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        plan: member.plan_name ?? "Sin plan",
        expiration: member.subscription_end
          ? new Date(member.subscription_end).toLocaleDateString("es-AR")
          : "-",
      },
    };
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    return { success: false, error: "Error interno al procesar el ingreso" };
  }
}

//Registrar pagos e historial de pagos
export async function createPayment(formData: FormData) {
  const memberId = Number(formData.get("memberId"));
  const planId = Number(formData.get("planId"));
  const amount = Number(formData.get("amount"));
  const paymentMethod = formData.get("paymentMethod") as string;
  const transactionId = (formData.get("transactionId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  try {
    // 1. Activar el estado del socio en la tabla 'members' (por si estaba suspendido o inactivo)
    await sql`
      UPDATE members
      SET status = 'active'
      WHERE id = ${memberId}
    `;

    // 2. Buscar si el socio ya tiene una suscripción registrada
    const existingSub = await sql`
      SELECT id FROM subscriptions WHERE member_id = ${memberId} LIMIT 1
    `;

    let subscriptionId: number;

    if (existingSub.length > 0) {
      // Actualizar la suscripción existente: plan, vigencia de 30 días y estado activo
      subscriptionId = existingSub[0].id;
      await sql`
        UPDATE subscriptions 
        SET plan_id = ${planId},
            start_date = NOW(),
            end_date = NOW() + INTERVAL '30 days',
            status = 'active'
        WHERE id = ${subscriptionId}
      `;
    } else {
      // Crear nueva suscripción activa si no tenía ninguna
      const newSub = await sql`
        INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
        VALUES (${memberId}, ${planId}, NOW(), NOW() + INTERVAL '30 days', 'active')
        RETURNING id
      `;
      subscriptionId = newSub[0].id;
    }

    // 3. Insertar el cobro en la tabla 'payments'
    await sql`
      INSERT INTO payments (
        member_id, 
        subscription_id, 
        amount, 
        payment_method, 
        transaction_id, 
        status, 
        notes, 
        payment_date
      )
      VALUES (
        ${memberId}, 
        ${subscriptionId}, 
        ${amount}, 
        ${paymentMethod}, 
        ${transactionId}, 
        'completed', 
        ${notes}, 
        NOW()
      )
    `;

    // Revalidar las rutas necesarias para reflejar los cambios en la UI
    revalidatePath("/admin/pagos");
    revalidatePath("/admin/miembros");
    revalidatePath("/admin/reportes");
    
    return { success: true };
  } catch (error) {
    console.error("Error exacto al registrar cobro:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error de base de datos al registrar el pago." 
    };
  }
}

export async function getPaymentsHistory() {
  try {
    const payments = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.status,
        p.payment_date,
        p.notes,
        m.first_name,
        m.last_name,
        COALESCE(m.dni, 'Sin DNI') as dni,
        mp.name as plan_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN membership_plans mp ON s.plan_id = mp.id
      ORDER BY p.payment_date DESC
      LIMIT 100
    `;
    return payments;
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    return [];
  }
}