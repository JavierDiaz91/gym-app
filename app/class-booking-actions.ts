"use server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireStaff() {
 const session=await getSession();
 if(!session||session.gymId==null||!["admin","trainer"].includes(session.role)) throw new Error("Sin permisos");
 return session;
}
export async function getClassBookings(scheduleId:number, date:string) {
 const session=await requireStaff();
 if(!Number.isSafeInteger(scheduleId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))) throw new Error("Fecha u horario inválido");
 const [schedule]=await sql`SELECT s.id,c.name,c.capacity,t.user_id
 FROM class_schedule s JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id
 WHERE s.id=${scheduleId} AND t.gym_id=${session.gymId} AND (${session.role==="admin"} OR t.user_id=${session.id})`;
 if(!schedule) throw new Error("Horario no disponible");
 const rows=await sql`SELECT b.id,b.member_id,m.first_name,m.last_name,b.status
 FROM class_bookings b JOIN members m ON m.id=b.member_id
 WHERE b.schedule_id=${scheduleId} AND b.booking_date=${date} AND b.status='confirmed' AND m.gym_id=${session.gymId}
 ORDER BY m.last_name,m.first_name`;
 const members=await sql`SELECT id,first_name,last_name FROM members WHERE gym_id=${session.gymId} ORDER BY last_name,first_name`;
 return {name:String(schedule.name),capacity:Number(schedule.capacity),bookings:rows.map(r=>({id:Number(r.id),memberId:Number(r.member_id),name:`${r.first_name} ${r.last_name}`})),members:members.map(m=>({id:Number(m.id),name:`${m.first_name} ${m.last_name}`}))};
}
export async function reserveGymClass(scheduleId:number,memberId:number,date:string) {
 const session=await requireStaff();
 if(!Number.isSafeInteger(scheduleId)||!Number.isSafeInteger(memberId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))) return {error:"Datos inválidos"};
 if(session.role==="trainer"){
  const allowed=await sql`SELECT 1 FROM class_schedule s JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id WHERE s.id=${scheduleId} AND t.gym_id=${session.gymId} AND t.user_id=${session.id}`;
  if(!allowed.length)return {error:"No tenés permiso para esta clase"};
 }
 try{
 const [result]=await sql`SELECT * FROM public.book_gym_class(${scheduleId},${memberId},${date}::date,${session.gymId})`;
 if(result?.result_code==="FULL")return {error:"No quedan cupos disponibles"};
 if(result?.result_code==="ALREADY_BOOKED")return {error:"El alumno ya está inscripto"};
 revalidatePath("/admin/clases");revalidatePath("/trainer/clases");return {success:true};
 }catch(e){console.error("Class booking failed",e);return {error:"No se pudo reservar. Verificá la fecha y que la migración esté aplicada."}}
}
export async function cancelGymClassBooking(bookingId:number) {
 const session=await requireStaff();
 if(!Number.isSafeInteger(bookingId))return {error:"Reserva inválida"};
 const rows=await sql`UPDATE class_bookings b SET status='cancelled'
 WHERE b.id=${bookingId} AND b.status='confirmed' AND b.booking_date>=CURRENT_DATE
 AND EXISTS(SELECT 1 FROM class_schedule s JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id
 WHERE s.id=b.schedule_id AND t.gym_id=${session.gymId} AND (${session.role==="admin"} OR t.user_id=${session.id}))
 RETURNING b.id`;
 if(!rows.length)return {error:"Reserva no encontrada o sin permisos"};
 revalidatePath("/admin/clases");revalidatePath("/trainer/clases");return {success:true};
}
