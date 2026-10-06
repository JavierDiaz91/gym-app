"use client";

import { useState, useRef } from "react";
import { processCheckInAction } from "@/app/actions";
import { CheckCircle2, XCircle, UserCheck, Search, Loader2 } from "lucide-react";

export function CheckInWidget() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || loading) return;

    setLoading(true);
    setResult(null);

    const response = await processCheckInAction(identifier.trim());
    setResult(response);
    setLoading(false);
    setIdentifier("");
    
    // Devolvemos el foco al input para permitir escaneos continuos
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <UserCheck className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg tracking-tight">Control de Asistencia / Recepción</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            ref={inputRef}
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Ingresar Email, ID de socio o Nombre..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !identifier.trim()}
          className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2 shadow-sm cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Marcar Entrada"}
        </button>
      </form>

      {/* RESULTADO DEL CHECK-IN */}
      {result && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 border ${
            result.success
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/15 border-destructive/30 text-destructive dark:text-red-400"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 text-sm">
            <p className="font-semibold text-base leading-tight">{result.message}</p>
            {result.member && (
              <div className="opacity-90 space-y-0.5 text-xs sm:text-sm">
                <p><strong>Miembro:</strong> {result.member.name}</p>
                <p><strong>Plan:</strong> {result.member.plan}</p>
                {result.member.endDate && (
                  <p>
                    <strong>Vencimiento:</strong>{" "}
                    {new Date(result.member.endDate).toLocaleDateString("es")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}