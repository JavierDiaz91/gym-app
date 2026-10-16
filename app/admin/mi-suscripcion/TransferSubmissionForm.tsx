"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-lg border p-3">
      <p className="text-xs font-semibold">Informar transferencia</p>
      <input
        aria-label="Número de operación"
        placeholder="Número de operación"
        className="w-full rounded border bg-background p-2 text-sm"
        value={operation}
        onChange={(e) => setOperation(e.target.value)}
        maxLength={120}
        minLength={4}
        required
      />
      <input
        aria-label="Comprobante de transferencia"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        required
        className="block w-full text-xs"
      />
      <p className="text-xs text-muted-foreground">PDF, PNG o JPG; máximo 2 MB. Solo una presentación por cuota.</p>
      <Button type="submit" size="sm" variant="outline" disabled={busy || !file || operation.trim().length < 4}>
        {busy ? "Enviando..." : "Enviar comprobante"}
      </Button>
      {message && <p role="status" className="text-xs">{message}</p>}
    </form>
  );
}
