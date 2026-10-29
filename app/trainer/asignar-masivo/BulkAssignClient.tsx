"use client";

import { useState, useTransition } from "react";
import { assignRoutineToMultipleMembersBulk } from "@/app/actions";
import { assignTrainingPlan } from "../rutinas/planes/actions";
import { Filter, CheckSquare, Square, Dumbbell, Send, Loader2 } from "lucide-react";

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  activity_type: string | null;
  level: string | null;
  routine_id: number | null;
  activePlanIds?: number[];
}

interface Routine {
  id: number;
  name: string;
  description: string | null;
}

export default function BulkAssignClient({
  initialMembers,
  routines,
  trainingPlans,
}: {
  initialMembers: Member[];
  routines: Routine[];
  trainingPlans: { id: number; title: string; durationWeeks: number }[];
}) {
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtrado dinámico, flexible y permisivo
  const filteredMembers = initialMembers.filter((m) => {
    let matchGender = genderFilter === "all" || !m.gender;
    if (!matchGender && m.gender) {
      const g = m.gender.toLowerCase().trim();
      if (genderFilter === "female") {
        matchGender = ["female", "mujer", "femenino", "f"].includes(g);
      } else if (genderFilter === "male") {
        matchGender = ["male", "varon", "masculino", "m", "v"].includes(g);
      }
    }

    let matchActivity = activityFilter === "all" || !m.activity_type;
    if (!matchActivity && m.activity_type) {
      const dbAct = m.activity_type.toLowerCase().replace(/_/g, " ").trim();
      const selAct = activityFilter.toLowerCase().replace(/_/g, " ").trim();
      matchActivity = dbAct.includes(selAct) || selAct.includes(dbAct);
    }

    let matchLevel = levelFilter === "all" || !m.level;
    if (!matchLevel && m.level) {
      const dbLevel = m.level.toLowerCase().trim();
      const selLevel = levelFilter.toLowerCase().trim();
      matchLevel = dbLevel.includes(selLevel) || selLevel.includes(dbLevel);
    }

    return matchGender && matchActivity && matchLevel;
  });

  // Manejo de Selección
  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map((m) => m.id));
    }
  };

  const toggleSelectMember = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Helper para mostrar el género formateado
  const formatGender = (gender: string | null) => {
    if (!gender) return "Sin especificar";
    const g = gender.toLowerCase();
    if (["female", "mujer", "femenino"].includes(g)) return "Mujer";
    if (["male", "varon", "masculino"].includes(g)) return "Varón";
    return gender;
  };

  // Helper para mostrar el tipo de actividad formateado
  const formatActivity = (act: string | null) => {
    if (!act) return "Sin actividad";
    const map: Record<string, string> = {
      running_fuerza: "Running + Fuerza",
      musculacion: "Musculación / Hipertrofia",
      funcional: "Funcional",
      deporte: "Deporte de Equipo",
    };
    return map[act.toLowerCase()] || act;
  };

  const selectedPlanId = selectedRoutine.startsWith("plan:") ? Number(selectedRoutine.split(":")[1]) : null;
  const alreadyAssigned = selectedPlanId === null ? [] : selectedMembers.filter((id) =>
    initialMembers.find((m) => m.id === id)?.activePlanIds?.includes(selectedPlanId)
  );
  const eligibleMembers = selectedMembers.filter((id) => !alreadyAssigned.includes(id));

  // Enviar asignación masiva al servidor
  const handleAssign = () => {
    if (selectedMembers.length === 0) {
      setMessage({ type: "error", text: "Seleccioná al menos un alumno." });
      return;
    }
    if (!selectedRoutine) {
      setMessage({ type: "error", text: "Seleccioná un plan o una rutina de la lista." });
      return;
    }

    if (eligibleMembers.length === 0) {
      setMessage({ type: "error", text: "Todos los alumnos seleccionados ya tienen activo este plan." });
      return;
    }
    if (!window.confirm(`Se asignará el entrenamiento a ${eligibleMembers.length} alumno(s). ${alreadyAssigned.length} ya lo tienen activo y serán omitidos. ¿Confirmar?`)) return;

    startTransition(async () => {
      setMessage(null);
      const [kind, idText] = selectedRoutine.split(":");
      const selectedId = Number(idText);
      let res: { success: boolean; count?: number; error?: string };
      if (kind === "plan") {
        let count = 0;
        const failures: string[] = [];
        for (const memberId of eligibleMembers) {
          const outcome = await assignTrainingPlan(selectedId, memberId);
          if (outcome.success) count++;
          else failures.push(`Alumno #${memberId}: ${outcome.error || "Error"}`);
        }
        res = { success: failures.length === 0, count, error: failures.length ? `${count} asignados; ${failures.length} fallidos. ${failures.slice(0, 3).join("; ")}` : undefined };
      } else {
        res = await assignRoutineToMultipleMembersBulk(eligibleMembers, selectedId);
      }

      if (res.success) {
        setMessage({
          type: "success",
          text: `¡Entrenamiento asignado correctamente a ${res.count} alumno(s)!`,
        });

        setSelectedMembers([]);
        setSelectedRoutine("");
        window.location.reload();

        setTimeout(() => {
          setMessage(null);
          setGenderFilter("all");
          setActivityFilter("all");
          setLevelFilter("all");
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Ocurrió un error al asignar la rutina.",
        });
      }
    });
  };

  return (
    <div className="space-y-6 text-foreground transition-colors duration-200">
      {/* Barra de Filtros */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider text-foreground">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filtros de Segmentación</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Filtro Género */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Género</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all" className="bg-card text-card-foreground">Todos los géneros</option>
              <option value="female" className="bg-card text-card-foreground">Mujeres</option>
              <option value="male" className="bg-card text-card-foreground">Varones</option>
            </select>
          </div>

          {/* Filtro Actividad */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de Actividad</label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all" className="bg-card text-card-foreground">Todas las actividades</option>
              <option value="running_fuerza" className="bg-card text-card-foreground">Running + Fuerza</option>
              <option value="musculacion" className="bg-card text-card-foreground">Musculación / Hipertrofia</option>
              <option value="funcional" className="bg-card text-card-foreground">Funcional</option>
              <option value="deporte" className="bg-card text-card-foreground">Deporte de Equipo</option>
            </select>
          </div>

          {/* Filtro Nivel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nivel</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all" className="bg-card text-card-foreground">Todos los niveles</option>
              <option value="principiante" className="bg-card text-card-foreground">Principiante</option>
              <option value="intermedio" className="bg-card text-card-foreground">Intermedio</option>
              <option value="avanzado" className="bg-card text-card-foreground">Avanzado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Alumnos */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            {selectedMembers.length === filteredMembers.length && filteredMembers.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
            {selectedMembers.length === filteredMembers.length && filteredMembers.length > 0
              ? "Deseleccionar Todos"
              : `Seleccionar Filtrados (${filteredMembers.length})`}
          </button>

          <span className="text-xs text-muted-foreground font-medium">
            {selectedMembers.length} seleccionado(s)
          </span>
        </div>

        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground italic bg-card">
              No se encontraron alumnos con los filtros seleccionados.
            </p>
          ) : (
            filteredMembers.map((m) => {
              const isSelected = selectedMembers.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelectMember(m.id)}
                  className={`p-3.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-bold text-foreground">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatGender(m.gender)} • {formatActivity(m.activity_type)} • {m.level || "Sin nivel"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panel de Asignación */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider text-foreground">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span>Elegir plan de entrenamiento a asignar</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedRoutine}
            onChange={(e) => setSelectedRoutine(e.target.value)}
            className="flex-1 text-xs font-medium p-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" className="bg-card text-card-foreground">-- Seleccionar plan o rutina --</option>
            {trainingPlans.map((p) => (
              <option key={`plan:${p.id}`} value={`plan:${p.id}`}>{p.title} · {p.durationWeeks} semanas (plan)</option>
            ))}
            {routines.map((r) => (
              <option key={`routine:${r.id}`} value={`routine:${r.id}`}>{r.name} (rutina anterior)</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAssign}
            disabled={isPending || eligibleMembers.length === 0 || !selectedRoutine}
            className="px-6 py-3 text-xs font-extrabold text-black bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                Asignando...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-black" />
                Asignar a ({eligibleMembers.length})
              </>
            )}
          </button>
        </div>

        {selectedPlanId !== null && selectedMembers.length > 0 && (
          <p className="text-xs text-muted-foreground">{eligibleMembers.length} alumno(s) elegibles · {alreadyAssigned.length} ya tienen el plan activo y se omitirán.</p>
        )}
        <p className="text-xs text-muted-foreground">Los planes activos existentes no se reemplazan. Se solicita confirmación antes de asignar.</p>
        {message && (
          <p
            className={`text-xs p-3 rounded-xl font-medium border ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}