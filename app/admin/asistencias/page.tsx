"use client";

import { useState, useTransition } from "react";
import { registerAttendanceAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Search, UserCheck } from "lucide-react";

type CheckInResult = {
  accessGranted: boolean;
  message: string;
  member: {
    id: number;
    name: string;
    plan: string;
    expiration: string;
  };
} | null;

export default function AsistenciasPage() {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<CheckInResult>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setErrorMsg("");
    startTransition(async () => {
      const res = await registerAttendanceAction(identifier);
      if (res.success && res.member) {
        setResult({
          accessGranted: res.accessGranted ?? false,
          message: res.message ?? "",
          member: res.member,
        });
        setIdentifier(""); // Limpiar input para la siguiente persona
      } else {
        setResult(null);
        setErrorMsg(res.error || "No se encontró el usuario");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Control de Asistencias</h1>
        <p className="text-muted-foreground">
          Ingresá el email o nombre del alumno para registrar su ingreso.
        </p>
      </div>

      {/* Formulario de Búsqueda Rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Registrador de Ingreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ID o Email del Miembro..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10 text-lg h-12"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" disabled={isPending} className="h-12 px-6">
              {isPending ? "Validando..." : "Ingresar"}
            </Button>
          </form>
          {errorMsg && <p className="text-destructive mt-2 text-sm font-medium">{errorMsg}</p>}
        </CardContent>
      </Card>

      {/* Resultado Visual de la Validación */}
      {result && (
        <Card
          className={`border-2 transition-all ${
            result.accessGranted
              ? "border-green-500/50 bg-green-500/10"
              : "border-red-500/50 bg-red-500/10"
          }`}
        >
          <CardContent className="pt-6 flex items-start gap-4">
            {result.accessGranted ? (
              <CheckCircle2 className="w-12 h-12 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500 shrink-0" />
            )}
            <div className="space-y-1 flex-1">
              <h2
                className={`text-2xl font-bold ${
                  result.accessGranted ? "text-green-500" : "text-red-500"
                }`}
              >
                {result.message}
              </h2>
              <p className="text-xl font-semibold text-foreground">{result.member.name}</p>
              <div className="text-sm text-muted-foreground pt-2 flex justify-between max-w-sm">
                <span>
                  <strong>Plan:</strong> {result.member.plan}
                </span>
                <span>
                  <strong>Vencimiento:</strong> {result.member.expiration}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}