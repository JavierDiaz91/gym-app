import {getSession} from "@/app/actions";
import {sql} from "@/lib/db";
import {redirect} from "next/navigation";
import MemberClasses from "@/components/member/MemberClasses";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await getSession();if(!session||session.role!=="member"||session.gymId==null)redirect("/login");
 const [m]=await sql`SELECT id FROM members WHERE user_id=${session.id} AND gym_id=${session.gymId} LIMIT 1`;
 if(!m)return <p>No encontramos tu perfil de alumno.</p>;
 const schedules=await sql`SELECT s.id,s.day_of_week AS day,to_char(s.start_time,'HH24:MI') AS start,to_char(s.end_time,'HH24:MI') AS "end",s.room,c.name,c.capacity,t.first_name||' '||t.last_name AS trainer FROM class_schedule s JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id WHERE t.gym_id=${session.gymId} AND s.is_active=true AND c.is_active=true ORDER BY s.day_of_week,s.start_time`;
 const bookings=await sql`SELECT b.id,b.schedule_id,to_char(b.booking_date,'YYYY-MM-DD') AS date FROM class_bookings b JOIN class_schedule s ON s.id=b.schedule_id JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id WHERE b.member_id=${m.id} AND t.gym_id=${session.gymId} AND b.status='confirmed' AND b.booking_date>=CURRENT_DATE ORDER BY b.booking_date`;
 const occupancy=await sql`SELECT b.schedule_id,to_char(b.booking_date,'YYYY-MM-DD') AS date,count(*)::int AS occupied FROM class_bookings b JOIN class_schedule s ON s.id=b.schedule_id JOIN classes c ON c.id=s.class_id JOIN trainers t ON t.id=c.trainer_id WHERE t.gym_id=${session.gymId} AND b.status='confirmed' AND b.booking_date>=CURRENT_DATE AND b.booking_date<CURRENT_DATE+35 GROUP BY b.schedule_id,b.booking_date`;
 const memberships=await sql`SELECT to_char(s.start_date,'YYYY-MM-DD') AS start,to_char(s.end_date,'YYYY-MM-DD') AS "end",p.access_mode AS mode,coalesce(s.entries_remaining,0)::int AS entries FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id AND p.gym_id=${session.gymId} WHERE s.member_id=${m.id} AND s.status IN ('active','scheduled') AND s.payment_status='paid' AND s.end_date>CURRENT_DATE`;
 return <MemberClasses schedules={schedules.map(r=>({id:Number(r.id),day:Number(r.day),start:String(r.start),end:String(r.end),room:String(r.room||""),name:String(r.name),capacity:Number(r.capacity),trainer:String(r.trainer)}))} bookings={bookings.map(r=>({id:Number(r.id),scheduleId:Number(r.schedule_id),date:String(r.date)}))} occupancy={occupancy.map(r=>({scheduleId:Number(r.schedule_id),date:String(r.date),occupied:Number(r.occupied)}))} memberships={memberships.map(r=>({start:String(r.start),end:String(r.end),mode:String(r.mode),entries:Number(r.entries)}))}/>;
}