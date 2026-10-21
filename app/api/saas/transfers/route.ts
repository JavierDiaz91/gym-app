import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 2 * 1024 * 1024;
const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);

function signatureMatches(buffer: Buffer, mime: string) {
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217;
  return false;
}

export async function POST(request: NextRequest) {
  const cookie = (await cookies()).get("session")?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;
  if (!session || session.role !== "admin" || session.gymId == null) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 8192) {
    return NextResponse.json({ error: "El comprobante supera 2 MB" }, { status: 413 });
  }
  try {
    const form = await request.formData();
    const invoiceId = Number(form.get("invoiceId"));
    const operation = form.get("operationNumber");
    const file = form.get("receipt");
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0 ||
        typeof operation !== "string" || operation.trim().length < 4 ||
        operation.trim().length > 120 ||
        !(file instanceof File) || !allowed.has(file.type) ||
        file.size < 8 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Comprobante, operación o factura inválidos" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(bytes, file.type)) {
      return NextResponse.json({ error: "El archivo no coincide con el formato declarado" }, { status: 400 });
    }
    // One atomic DB function checks gym ownership, invoice status, and
    // unique invoice submission. Server timestamps determine 48-hour grant.
    const [result] = await sql`
      SELECT public.submit_kivra_saas_transfer_with_receipt(
        ${invoiceId}, ${session.gymId}, ${session.id},
        ${operation.trim()}, ${bytes.toString("hex")}, ${file.type}
      ) AS id
    `;
    return NextResponse.json({ success: true, submissionId: String(result.id) }, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "Ya se informó una transferencia para esta factura. Las 48 horas no se reinician." }, { status: 409 });
    }
    console.error("Kivra receipt submission failed", error);
    return NextResponse.json({ error: "No se pudo registrar la transferencia" }, { status: 500 });
  }
}
