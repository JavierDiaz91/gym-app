"use client";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export default function PrintButton() {
  return <div className="flex flex-wrap gap-3">
    <Link href="/admin/mi-suscripcion" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"><ArrowLeft className="h-4 w-4" />Volver</Link>
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Printer className="h-4 w-4" />Imprimir / Guardar como PDF</button>
  </div>;
}
