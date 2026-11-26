import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.gymId) return NextResponse.json({error:"No autorizado"},{status:401});
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Origen inválido"},{status:403});
    const [user] = await sql`SELECT id FROM public.users WHERE id=${session.id} AND gym_id=${session.gymId} AND role='admin' AND session_version=${session.sessionVersion}`;
    if (!user) return NextResponse.json({error:"Sesión inválida"},{status:401});
    const length = Number(request.headers.get("content-length"));
    if (length > 2300000) return NextResponse.json({error:"El comprobante supera 2 MiB"},{status:413});
    const form = await request.formData();
    const invoiceId = Number(form.get("invoiceId"));
    const operation = String(form.get("operation") || "").trim();
    const file = form.get("receipt");
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0 || operation.length < 4 || operation.length > 120 || !(file instanceof File) || file.size < 1 || file.size > 2097152 || !["application/pdf","image/png","image/jpeg"].includes(file.type)) return NextResponse.json({error:"Revisá el número de operación y el archivo PDF, PNG o JPEG (máximo 2 MiB)."},{status:400});
    const hex = Buffer.from(await file.arrayBuffer()).toString("hex");
    await sql`SELECT public.submit_kivra_saas_transfer_with_receipt(${invoiceId}::integer,${session.gymId}::integer,${session.id}::integer,${operation}::text,${hex}::text,${file.type}::text)`;
    return NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"No se pudo informar la transferencia. Verificá que la factura esté pendiente, el archivo sea válido y no exista otro comprobante en revisión."},{status:409});
  }
}
