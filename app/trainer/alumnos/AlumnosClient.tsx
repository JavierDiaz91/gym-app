"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  UserPlus, 
  Dumbbell, 
  Calendar, 
  MoreVertical, 
  UserX, 
  Search,
  Users,
  X,
  History
} from "lucide-react";
import { assignMemberToTrainer, removeMemberFromTrainer, assignRoutineToMember } from "@/app/actions";
import { assignTrainingPlan } from "../rutinas/planes/actions";

interface RoutineItem {
  id: number;
  title: string;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  status?: string;
  routine_id?: number;
  routine_name?: string;
  routines?: RoutineItem[];
  last_workout_at?: string;
  last_workout?: string;
  training_plan_title?: string;
  training_plans?: { assignmentId: number; title: string; sourcePlanId: number }[];
}

interface Routine {
  id: number;
  name?: string;
  nombre?: string;
  title?: string;
  description?: string;
  [key: string]: any;
}

interface AlumnosClientProps {
  initialMembers: Member[];
  routines: Routine[];
  trainingPlans: { id: number; title: string; durationWeeks: number }[];
  sessionUserId: number | string;
}

export default function AlumnosClient({
  initialMembers,
  routines,
  trainingPlans,
  sessionUserId,
}: AlumnosClientProps) {
  const router = useRouter();
  const [membersList, setMembersList] = useState<Member[]>(initialMembers);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "with" | "without">("all");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  
  // Estado para el Modal de Historial

  // Estados para el Modal de Asignar Rutina
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    setMembersList(initialMembers);
  }, [initialMembers]);

  const filteredMembers = membersList.filter((m) => {
    const matchesName = `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase());
    const hasPlan = (m.training_plans?.length || 0) > 0;
    return matchesName && (planFilter === "all" || (planFilter === "with" ? hasPlan : !hasPlan));
  });
  const withPlanCount = membersList.filter((m) => (m.training_plans?.length || 0) > 0).length;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setLoading(true);
    setErrorMsg("");

    const res = await assignMemberToTrainer(emailInput, sessionUserId);
    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setIsAddOpen(false);
      setEmailInput("");
      router.refresh();
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("¿Seguro que querés desvincular a este alumno?")) return;
    
    const res = await removeMemberFromTrainer(memberId);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const handleAssignRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedAssignment) return;

    setAssignLoading(true);
    setAssignError("");

    try {
      const [kind, id] = selectedAssignment.split(":");
      const res = kind === "plan"
        ? await assignTrainingPlan(Number(id), selectedMember.id)
        : await assignRoutineToMember(selectedMember.id, Number(id));
      setAssignLoading(false);

      if (res?.error) {
        setAssignError(res.error);
      } else {
        const foundRoutine = routines.find((r) => kind === "routine" && Number(r.id) === Number(id));
        const routineTitle = foundRoutine?.title || foundRoutine?.name || foundRoutine?.nombre || "Rutina";

        setMembersList((prev) =>
          prev.map((m) => {
            if (m.id === selectedMember.id) {
              if (kind === "plan") return m;
              const updatedRoutines = m.routines ? [...m.routines] : [];
              if (!updatedRoutines.some((r) => Number(r.id) === Number(id))) {
                updatedRoutines.push({ id: Number(id), title: routineTitle });
              }
              return {
                ...m,
                routine_id: Number(id),
                routine_name: routineTitle,
                routines: updatedRoutines,
              };
            }
            return m;
          })
        );

        setSelectedMember(null);
        setSelectedRoutineId(null);
        setSelectedAssignment("");
        router.refresh();
      }
    } catch (err: any) {
      setAssignLoading(false);
      setAssignError(err?.message || "Ocurrió un error al asignar la rutina.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-foreground transition-colors">
      
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Mis Alumnos</h1>
            <span className="bg-[#00aeef]/10 text-[#00aeef] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#00aeef]/20">
              {membersList.length} {membersList.length === 1 ? "Atleta" : "Atletas"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Administrá tus atletas asignados y vinculales sus rutinas de entrenamiento.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all duration-200 active:scale-95 text-xs"
        >
          <UserPlus className="w-4 h-4 text-black" />
          <span>Vincular Alumno</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Alumnos vinculados</p><p className="mt-1 text-2xl font-bold">{membersList.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Con plan asignado</p><p className="mt-1 text-2xl font-bold text-[#00aeef]">{withPlanCount}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Sin plan asignado</p><p className="mt-1 text-2xl font-bold">{membersList.length - withPlanCount}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Buscar alumnos" type="search" placeholder="Buscar alumnos por nombre..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00aeef]/30 text-foreground" />
        </div>
        <select aria-label="Filtrar por plan" value={planFilter} onChange={(e) => setPlanFilter(e.target.value as "all" | "with" | "without")}
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          <option value="all">Todos los alumnos</option>
          <option value="with">Con plan asignado</option>
          <option value="without">Sin plan asignado</option>
        </select>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-semibold">{membersList.length ? "No hay alumnos con esos filtros" : "Todavía no tenés alumnos vinculados"}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{membersList.length ? "Probá con otro nombre o filtro." : "Vinculá un alumno para empezar a gestionar sus planes."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();
            const plans = member.training_plans || [];
            const currentPlan = plans[0];
            return (
              <article key={member.id} className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm hover:border-[#00aeef]/30 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00aeef]/15 text-[#00aeef] font-extrabold">{initials}</div>
                    <div>
                      <h2 className="text-lg font-bold">{member.first_name} {member.last_name}</h2>
                      <p className="text-xs text-muted-foreground">Alumno vinculado · {member.status === "inactive" ? "Inactivo" : "Activo"}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button aria-label={`Opciones de ${member.first_name}`} onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)} className="rounded-lg p-2 hover:bg-secondary"><MoreVertical className="h-5 w-5" /></button>
                    {activeMenuId === member.id && (
                      <div className="absolute right-0 z-20 w-48 rounded-xl border border-border bg-popover p-2 shadow-xl">
                        <button onClick={() => {setActiveMenuId(null); handleRemoveMember(member.id);}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10"><UserX className="h-4 w-4" />Desvincular alumno</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan de entrenamiento</p>
                    {currentPlan ? (
                      <>
                        <Link href={`/trainer/alumnos/${member.id}/progreso?plan=${currentPlan.assignmentId}`} className="font-semibold text-[#00aeef] hover:underline">{currentPlan.title}</Link>
                        <p className="mt-1 text-xs text-muted-foreground">Asignación #{currentPlan.assignmentId}{plans.length > 1 ? ` · ${plans.length} planes asignados` : ""}</p>
                        {plans.length > 1 && <div className="mt-3 flex flex-wrap gap-2">{plans.slice(1).map((p) => <Link key={p.assignmentId} href={`/trainer/alumnos/${member.id}/progreso?plan=${p.assignmentId}`} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-[#00aeef]/40">{p.title} · #{p.assignmentId}</Link>)}</div>}
                      </>
                    ) : <p className="text-sm text-muted-foreground">Sin plan asignado. Podés asignar uno desde esta ficha.</p>}
                    {(member.routines?.length || 0) > 0 && <p className="mt-3 text-xs text-muted-foreground">Rutinas anteriores: {member.routines?.map((r) => r.title).join(", ")}</p>}
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último entrenamiento</p>
                    <p className="mt-2 text-sm font-semibold">{member.last_workout || "Sin registros"}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Consultá la evolución y el historial desde los accesos inferiores.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => {setSelectedMember(member);setSelectedRoutineId(member.routine_id || null);setSelectedAssignment("");setAssignError("");}}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00aeef] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#0098d4]"><Dumbbell className="h-4 w-4" />Asignar plan o rutina</button>
                  <Link href={`/trainer/alumnos/${member.id}/progreso`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary"><Dumbbell className="h-4 w-4" />Ver progreso</Link>
                  <Link href={`/trainer/alumnos/${member.id}/progreso/historial`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary"><History className="h-4 w-4" />Historial</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL HISTORIAL DE ENTRENAMIENTOS */}

      {/* MODAL ASIGNAR RUTINA */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 text-card-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Asignar entrenamiento a {selectedMember.first_name}
              </h3>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Seleccioná un plan publicado o una rutina anterior para este alumno.
            </p>

            <form onSubmit={handleAssignRoutine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Plan o rutina
                </label>
                {routines.length === 0 && trainingPlans.length === 0 ? (
                  <p className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">No hay rutinas ni planes publicados disponibles.</p>
                ) : (
                  <select value={selectedAssignment} onChange={(e) => setSelectedAssignment(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground">
                    <option value="">Seleccioná una rutina o plan</option>
                    {trainingPlans.map((p) => <option key={`plan:${p.id}`} value={`plan:${p.id}`}>{p.title} · {p.durationWeeks} semanas (plan)</option>)}
                    {routines.map((r) => <option key={`routine:${r.id}`} value={`routine:${r.id}`}>{r.title || r.nombre || r.name || `Rutina #${r.id}`} (rutina)</option>)}
                  </select>
                )}
              </div>

              {selectedAssignment.startsWith("plan:") && selectedMember.training_plans?.some((p) => p.sourcePlanId === Number(selectedAssignment.split(":")[1])) && (
                <p className="text-xs text-amber-600">Este alumno ya tiene activo el plan seleccionado. No se permite duplicarlo.</p>
              )}

              {assignError && (
                <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
                  {assignError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !selectedAssignment || (selectedAssignment.startsWith("plan:") && !!selectedMember.training_plans?.some((p) => p.sourcePlanId === Number(selectedAssignment.split(":")[1])))}
                  className="px-4 py-2 text-xs font-extrabold bg-[#00aeef] hover:bg-[#0098d4] text-black rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {assignLoading ? "Asignando..." : "Confirmar Asignación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR ALUMNO */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 text-card-foreground">
            <h3 className="text-lg font-bold text-foreground">Vincular nuevo alumno</h3>
            <p className="text-xs text-muted-foreground">
              Ingresá el correo electrónico con el que el alumno se registró en Kivra.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00aeef]/30 focus:border-[#00aeef] text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setErrorMsg("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-extrabold bg-[#00aeef] hover:bg-[#0098d4] text-black rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Vinculando..." : "Vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
