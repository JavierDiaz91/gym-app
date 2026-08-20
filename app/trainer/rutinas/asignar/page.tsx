"use client";

import { useEffect, useState } from "react";
import { assignRoutineToMember, getTrainerMembers, getTrainerRoutines } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { UserCheck, Dumbbell, Link2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AsignarRutinaPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [memberId, setMemberId] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch("/api/session");
        const session = await sessionRes.json();

        const [m, r] = await Promise.all([
          getTrainerMembers(session.id),
          getTrainerRoutines(session.id),
        ]);

        setMembers(m || []);
        setRoutines(r || []);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        toast.error("No se pudieron cargar los alumnos o las rutinas.");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, []);

  async function handleAssign() {
    if (!memberId || !routineId) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Asignando rutina al alumno...");

    try {
      const sessionRes = await fetch("/api/session");
      const session = await sessionRes.json();

      const result = await assignRoutineToMember(
  Number(memberId),
  Number(routineId)
);

      if (result?.error) {
        toast.error("Error: " + result.error, { id: toastId });
      } else {
        // Buscar nombres para dar un mensaje súper claro en el Toast
        const selectedMember = members.find((m) => String(m.id) === String(memberId));
        const memberName = selectedMember 
          ? `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`.trim() 
          : "el alumno";

        toast.success(`¡Rutina asignada a ${memberName} con éxito! 🚀`, { id: toastId });
        
        // Limpiamos los campos
        setMemberId("");
        setRoutineId("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al asignar la rutina.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      
      {/* Banner / Cabecera */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Asignación de Planes Técnico-Tácticos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Vincular una rutina planificada directamente al perfil de un alumno.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta Principal de Formulario */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Selección de Parámetros
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Elige el atleta y la plantilla que ejecutará en su app.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {isLoadingData ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-slate-400">Cargando alumnos y rutinas...</p>
            </div>
          ) : (
            <>
              {/* Selector 1: Alumno */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Alumno Destino
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                >
                  <option value="">-- Seleccionar un alumno --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} {m.email ? `(${m.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector 2: Rutina */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                  Plantilla de Rutina
                </label>
                <select
                  value={routineId}
                  onChange={(e) => setRoutineId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                >
                  <option value="">-- Seleccionar rutina planificada --</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title || r.name || `Rutina #${r.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón de Acción */}
              <div className="pt-2">
                <Button
                  onClick={handleAssign}
                  disabled={!memberId || !routineId || isSubmitting}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Asignando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar y Asignar Rutina</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}