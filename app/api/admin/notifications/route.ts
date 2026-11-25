import { NextResponse } from "next/server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
export const dynamic = "force-dynamic";
async function tenant() {
 const s = await getSession();
 if (s?.role !== "admin" || s.gymId == null) return null;
 const [g] = await sql`SELECT id FROM gyms WHERE id=${s.gymId} AND status IS DISTINCT FROM 'suspended'`;
 return g ? s.gymId : null;
}
export async function GET() {
 try {
 const id = await tenant();
 if (id == null) return NextResponse.json({error:"Acceso denegado"},{status:403});
 const [items, counts] = await Promise.all([
 sql`SELECT id::text, event_type,title,message,action_url,read_at,created_at FROM gym_notifications WHERE gym_id=${id} ORDER BY created_at DESC,id DESC LIMIT 100`,
 sql`SELECT count(*)::integer AS unread FROM gym_notifications WHERE gym_id=${id} AND read_at IS NULL`
 ]);
 return NextResponse.json({items,unread:counts[0].unread},{headers:{"Cache-Control":"no-store"}});
 } catch {return NextResponse.json({error:"No se pudieron cargar las notificaciones"},{status:500});}
}
export async function PATCH(request: Request) {
 try {
 const id = await tenant();
 if (id == null || request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error:"Acceso denegado"},{status:403});
 const b = await request.json().catch(()=>null);
 if (b?.all === true) await sql`UPDATE gym_notifications SET read_at=NOW() WHERE gym_id=${id} AND read_at IS NULL`;
 else if (typeof b?.id === "string" && /^[1-9][0-9]{0,18}$/.test(b.id)) await sql`UPDATE gym_notifications SET read_at=NOW() WHERE gym_id=${id} AND id=${b.id}::bigint AND read_at IS NULL`;
 else return NextResponse.json({error:"Solicitud inválida"},{status:400});
 return NextResponse.json({success:true});
 } catch {return NextResponse.json({error:"No se pudo actualizar la notificación"},{status:500});}
}
