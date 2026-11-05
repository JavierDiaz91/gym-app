"use server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function currentMember() {
 const session=await getSession();
 if(!session||session.role!=="member"||session.gymId==null) throw new Error("Sin permisos");
 const [member]=await sql`SELECT id FROM members WHERE user_id=${session.id} AND gym_id=${session.gymId} LIMIT 1`;
 if(!member) throw new Error("No se encontró tu perfil de alumno");
 return {memberId:Number(member.id),gymId:session.gymId};
}
function validDate(date:string) {
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+"T12:00:00Z"));
}
export async function bookMyClass(scheduleId:number,date:string) {
 try {
  const {memberId,gymId}=await currentMember();
  if(!Number.isSafeInteger(scheduleId)||scheduleId<=0||!validDate(date)) return {error:"Horario o fecha inválidos"};
  const [r]=await sql`SELECT * FROM public.book_gym_class_member(${scheduleId},${memberId},${date}::date,${gymId})`;
  if(r?.result_code==="NO_MEMBERSHIP")return {error:"Necesitás una membresía pagada y vigente para la fecha de la clase."};
  if(r?.result_code==="MEMBER_INACTIVE")return {error:"Tu perfil de alumno no está activo."};
  if(r?.result_code==="FULL")return {error:"No quedan cupos disponibles."};
  if(r?.result_code==="ALREADY_BOOKED")return {error:"Ya tenés una reserva para esta clase."};
  if(r?.result_code!=="BOOKED")return {error:"No se pudo confirmar la reserva."};
  revalidatePath("/miembro/clases");
  return {success:true};
 }catch(e){console.error("Member class booking",e);return {error:"No se pudo reservar. Verificá que la migración esté aplicada y que el horario sea válido."};}
}
export async function cancelMyClass(bookingId:number) {
 try {
  const {memberId,gymId}=await currentMember();
  if(!Number.isSafeInteger(bookingId)||bookingId<=0)return {error:"Reserva inválida"};
  const rows=await sql`UPDATE class_bookings b SET status='cancelled'
   WHERE b.id=${bookingId} AND b.member_id=${memberId}
   AND b.status='confirmed' AND b.booking_date>=CURRENT_DATE
   AND EXISTS(SELECT 1 FROM class_schedule s JOIN classes c ON c.id=s.class_id
    JOIN trainers t ON t.id=c.trainer_id WHERE s.id=b.schedule_id AND t.gym_id=${gymId})
   RETURNING b.id`;
  if(!rows.length)return {error:"No se encontró una reserva vigente para cancelar."};
  revalidatePath("/miembro/clases");return {success:true};
 }catch(e){console.error("Member class cancellation",e);return {error:"No se pudo cancelar la reserva."};}
}
