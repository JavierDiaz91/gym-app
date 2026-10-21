import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookie = (await cookies()).get("session")?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const [receipt] = await sql`
    SELECT encode(receipt_content, 'base64') AS encoded, receipt_mime
    FROM public.saas_transfer_submissions
    WHERE id = ${Number(id)} AND receipt_content IS NOT NULL
  `;
  if (!receipt || !["application/pdf", "image/png", "image/jpeg"].includes(String(receipt.receipt_mime))) {
    return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  }
  const bytes = Buffer.from(String(receipt.encoded), "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": String(receipt.receipt_mime),
      "Content-Disposition": "attachment; filename=\"comprobante-kivra\"",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox"
    }
  });
}
