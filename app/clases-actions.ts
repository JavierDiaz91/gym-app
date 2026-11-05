"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function context() {
  const session = await getSession();
  if (!session || session.gymId == null || !["admin", "trainer"].includes(session.role)) throw new Error("Sin permisos");
  const trainer = session.role === "trainer" ? (await sql`SELECT id FROM trainers WHERE user_id = ${session.id} AND gym_id = ${session.gymId} AND is_active = true LIMIT 1`)[0] : null;
  if (session.role === "trainer" && !trainer) throw new Error("Entrenador no asociado al gimnasio");
  return { gymId: session.gymId, role: session.role, trainerId: trainer ? Number(trainer.id) : null };
}

export async function listGymClasses() {
  const ctx = await context();
  const rows = await sql`
    SELECT c.id,c.name,c.description,c.trainer_id,c.capacity,c.duration_minutes,c.difficulty,c.category,c.is_active,
           t.first_name,t.last_name
    FROM classes c JOIN trainers t ON t.id=c.trainer_id
    WHERE t.gym_id=${ctx.gymId} AND (${ctx.role === "admin"} OR t.id=${ctx.trainerId})
    ORDER BY c.name
  `;
  const schedules = await sql`
    SELECT s.id,s.class_id,s.day_of_week,s.start_time::text AS start_time,s.end_time::text AS end_time,s.room,s.is_active
    FROM class_schedule s JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id
    WHERE t.gym_id=${ctx.gymId} AND (${ctx.role === "admin"} OR t.id=${ctx.trainerId})
    ORDER BY s.day_of_week,s.start_time
  `;
  const trainers = await sql`SELECT id,first_name,last_name FROM trainers WHERE gym_id=${ctx.gymId} AND is_active=true AND (${ctx.role === "admin"} OR id=${ctx.trainerId}) ORDER BY first_name`;
  return { classes: rows.map(r=>({...r,id:Number(r.id),trainer_id:Number(r.trainer_id),capacity:Number(r.capacity),duration_minutes:Number(r.duration_minutes)})), schedules: schedules.map(r=>({...r,id:Number(r.id),class_id:Number(r.class_id)})), trainers:trainers.map(r=>({...r,id:Number(r.id)})),role:ctx.role };
}

export async function saveGymClass(data: {id?:number;name:string;description:string;trainerId:number;capacity:number;duration:number;category:string;difficulty:string}) {
  const ctx=await context();
  const name=data.name.trim();
  if (!name || name.length>100 || !Number.isInteger(data.capacity) || data.capacity<1 || data.capacity>1000 || !Number.isInteger(data.duration) || data.duration<5 || data.duration>480 || !["beginner","intermediate","advanced"].includes(data.difficulty)) return {error:"Revisá los datos de la clase"};
  const trainerId=ctx.role==="trainer" ? ctx.trainerId! : data.trainerId;
  const trainer=await sql`SELECT id FROM trainers WHERE id=${trainerId} AND gym_id=${ctx.gymId} AND is_active=true`;
  if (!trainer.length) return {error:"Entrenador inválido"};
  if (data.id) {
    const result=await sql`
      UPDATE classes c SET name=${name},description=${data.description.trim()},trainer_id=${trainerId},capacity=${data.capacity},duration_minutes=${data.duration},category=${data.category.trim()},difficulty=${data.difficulty},updated_at=NOW()
      WHERE c.id=${data.id} AND EXISTS (SELECT 1 FROM trainers t WHERE t.id=c.trainer_id AND t.gym_id=${ctx.gymId} AND (${ctx.role==="admin"} OR t.id=${ctx.trainerId}))
      RETURNING c.id`;
    if (!result.length) return {error:"Clase no encontrada o sin permisos"};
  } else {
    await sql`INSERT INTO classes (name,description,trainer_id,capacity,duration_minutes,category,difficulty,is_active) VALUES (${name},${data.description.trim()},${trainerId},${data.capacity},${data.duration},${data.category.trim()},${data.difficulty},true)`;
  }
  revalidatePath("/admin/clases");revalidatePath("/trainer/clases");
  return {success:true};
}

export async function saveGymSchedule(data:{id?:number;classId:number;day:number;start:string;end:string;room:string}) {
  const ctx=await context();
  if (!Number.isInteger(data.day) || data.day<0 || data.day>6 || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(data.start) || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(data.end) || data.end<=data.start) return {error:"Horario inválido"};
  const own=await sql`SELECT c.id FROM classes c JOIN trainers t ON t.id=c.trainer_id WHERE c.id=${data.classId} AND t.gym_id=${ctx.gymId} AND (${ctx.role==="admin"} OR t.id=${ctx.trainerId})`;
  if (!own.length) return {error:"Clase no disponible"};
  if(data.id) {
    const updated=await sql`UPDATE class_schedule s SET class_id=${data.classId},day_of_week=${data.day},start_time=${data.start},end_time=${data.end},room=${data.room.trim()} WHERE s.id=${data.id} AND EXISTS(SELECT 1 FROM classes c JOIN trainers t ON t.id=c.trainer_id WHERE c.id=s.class_id AND t.gym_id=${ctx.gymId} AND (${ctx.role==="admin"} OR t.id=${ctx.trainerId})) RETURNING s.id`;
    if(!updated.length) return {error:"Horario no encontrado"};
  } else {
    await sql`INSERT INTO class_schedule (class_id,day_of_week,start_time,end_time,room,is_active) VALUES (${data.classId},${data.day},${data.start},${data.end},${data.room.trim()},true)`;
  }
  revalidatePath("/admin/clases");revalidatePath("/trainer/clases");return {success:true};
}

export async function setGymClassActive(id:number,active:boolean) {
  const ctx=await context();
  if(ctx.role!=="admin") return {error:"Solo el administrador puede cambiar el estado"};
  const rows=await sql`UPDATE classes c SET is_active=${active},updated_at=NOW() WHERE c.id=${id} AND EXISTS(SELECT 1 FROM trainers t WHERE t.id=c.trainer_id AND t.gym_id=${ctx.gymId}) RETURNING c.id`;
  if(!rows.length)return {error:"Clase no encontrada"};
  revalidatePath("/admin/clases");revalidatePath("/trainer/clases");return {success:true};
}
