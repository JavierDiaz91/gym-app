import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") return NextResponse.json({error:"No autorizado"},{status:403,headers});
    const [user] = await sql`SELECT id FROM public.users WHERE id=${session.id} AND role='superadmin'`;
    if (!user) return NextResponse.json({error:"No autorizado"},{status:403,headers});
    const id = Number(request.nextUrl.searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({error:"Identificador inválido"},{status:400,headers});
    const [receipt] = await sql`SELECT receipt_mime, encode(receipt_content,'hex') AS receipt_hex FROM public.saas_transfer_submissions WHERE id=${id} AND receipt_content IS NOT NULL`;
    const extensions: Record<string,string> = {"application/pdf":"pdf","image/png":"png","image/jpeg":"jpg"};
    const mime = String(receipt?.receipt_mime ?? "");
    const extension = extensions[mime];
    if (!receipt || !extension || !receipt.receipt_hex) return NextResponse.json({error:"Comprobante no disponible"},{status:404,headers});
    const bytes = Uint8Array.from(Buffer.from(String(receipt.receipt_hex),"hex"));
    return new NextResponse(bytes, {headers:{...headers,"Content-Type":mime,"Content-Disposition":`inline; filename="transferencia-${id}.${extension}"`,"Content-Security-Policy":"default-src 'none'; sandbox"}});
  } catch {
    return NextResponse.json({error:"No se pudo recuperar el comprobante"},{status:500,headers});
  }
}
