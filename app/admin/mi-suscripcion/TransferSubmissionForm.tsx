"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, CheckCircle2 } from "lucide-react";

export function TransferSubmissionForm({ invoiceId }: { invoiceId: number }) {
  const [operation, setOperation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || operation.trim().length < 4) return;
    setBusy(true);
    setMessage("");
    const body = new FormData();
    body.set("invoiceId", String(invoiceId));
    body.set("operationNumber", operation.trim());
    body.set("receipt", file);
    try {
      const response = await fetch("/api/saas/transfers", { method: "POST", body });
      const data = await response.json();
      setMessage(response.ok ? "Transferencia informada. Queda pendiente de verificación por Kivra." : data.error ?? "Error");
      if (response.ok) window.location.reload();
    } catch {
      setMessage("No se pudo enviar el comprobante.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="min-w-0 space-y-3">
      <div><p className="text-sm font-semibold">Transferencia bancaria</p><p className="mt-1 text-xs text-muted-foreground">Informá la operación y adjuntá el comprobante.</p></div>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium">Número de operación</span>
        <input
          placeholder="Ej. 123456789"
          className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          maxLength={120}
          minLength={4}
          required
        />
      </label>
      <label className="block cursor-pointer rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center transition-colors hover:border-primary hover:bg-primary/10">
        <span className="flex flex-col items-center gap-2">
          {file ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <FileUp className="h-6 w-6 text-primary" />}
          <span className="text-sm font-semibold text-foreground">{file ? "Comprobante seleccionado" : "Seleccionar comprobante"}</span>
          <span className="max-w-full break-all text-xs text-muted-foreground">{file ? file.name : "Hacé clic para elegir un archivo"}</span>
        </span>
        <input
          aria-label="Comprobante de transferencia"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="sr-only"
        />
      </label>
      <p className="text-xs text-muted-foreground">PDF, PNG o JPG · Máximo 2 MB · Una presentación por cuota.</p>
      <Button type="submit" size="sm" className="w-full" disabled={busy || !file || operation.trim().length < 4}>
        {busy ? "Enviando comprobante..." : "Enviar comprobante"}
      </Button>
      {message && <p role="status" className="text-xs">{message}</p>}
    </form>
  );
}
