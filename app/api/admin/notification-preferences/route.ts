import { NextResponse } from "next/server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function tenant() {
  const session = await getSession();
  if (session?.role !== "admin" || session.gymId == null) return null;
  const [gym] = await sql`SELECT id FROM gyms WHERE id = ${session.gymId} AND status IS DISTINCT FROM 'suspended'`;
  return gym ? session.gymId : null;
}
const keys = ["new_members", "membership_expiring", "membership_expired", "payments_received", "classes_full"] as const;
export async function GET() {
  try {
    const id = await tenant();
    if (id == null) return NextResponse.json({error:"Acceso denegado"}, {status:403});
    const [row] = await sql`SELECT new_members, membership_expiring, membership_expired, payments_received, classes_full, expiration_days FROM gym_notification_preferences WHERE gym_id = ${id}`;
    return NextResponse.json(row ?? {new_members:true,membership_expiring:true,membership_expired:true,payments_received:true,classes_full:true,expiration_days:3}, {headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"No se pudieron cargar las preferencias"}, {status:500});
  }
}
export async function PUT(request: Request) {
  try {
    const id = await tenant();
    if (id == null) return NextResponse.json({error:"Acceso denegado"}, {status:403});
    if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error:"Origen inválido"}, {status:403});
    const body = await request.json().catch(() => null);
    if (!body || !keys.every(k => typeof body[k] === "boolean") || !Number.isInteger(body.expiration_days) || body.expiration_days < 1 || body.expiration_days > 30) return NextResponse.json({error:"Preferencias inválidas"}, {status:400});
    await sql`INSERT INTO gym_notification_preferences (gym_id,new_members,membership_expiring,membership_expired,payments_received,classes_full,expiration_days)
      VALUES (${id},${body.new_members},${body.membership_expiring},${body.membership_expired},${body.payments_received},${body.classes_full},${body.expiration_days})
      ON CONFLICT (gym_id) DO UPDATE SET new_members=EXCLUDED.new_members,membership_expiring=EXCLUDED.membership_expiring,membership_expired=EXCLUDED.membership_expired,payments_received=EXCLUDED.payments_received,classes_full=EXCLUDED.classes_full,expiration_days=EXCLUDED.expiration_days,updated_at=NOW()`;
    return NextResponse.json({success:true});
  } catch {
    return NextResponse.json({error:"No se pudieron guardar las preferencias"}, {status:500});
  }
}
