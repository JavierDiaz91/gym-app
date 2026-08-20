"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import WorkoutHistoryModal from "./WorkoutHistoryModal";

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
  sessionUserId: number | string;
}

export default function AlumnosClient({
  initialMembers,
  routines,
  sessionUserId,
}: AlumnosClientProps) {
  const router = useRouter();
  const [membersList, setMembersList] = useState<Member[]>(initialMembers);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  
  // Estado para el Modal de Historial
  const [historyMember, setHistoryMember] = useState<Member | null>(null);

  // Estados para el Modal de Asignar Rutina
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    setMembersList(initialMembers);
  }, [initialMembers]);

  const filteredMembers = membersList.filter((m) =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

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
    if (!selectedMember || !selectedRoutineId) return;

    setAssignLoading(true);
    setAssignError("");

    try {
      const res = await assignRoutineToMember(selectedMember.id, selectedRoutineId);
      setAssignLoading(false);

      if (res?.error) {
        setAssignError(res.error);
      } else {
        const foundRoutine = routines.find((r) => Number(r.id) === Number(selectedRoutineId));
        const routineTitle = foundRoutine?.title || foundRoutine?.name || foundRoutine?.nombre || "Rutina";

        setMembersList((prev) =>
          prev.map((m) => {
            if (m.id === selectedMember.id) {
              const updatedRoutines = m.routines ? [...m.routines] : [];
              if (!updatedRoutines.some((r) => Number(r.id) === Number(selectedRoutineId))) {
                updatedRoutines.push({ id: selectedRoutineId, title: routineTitle });
              }
              return {
                ...m,
                routine_id: selectedRoutineId,
                routine_name: routineTitle,
                routines: updatedRoutines,
              };
            }
            return m;
          })
        );

        setSelectedMember(null);
        setSelectedRoutineId(null);
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

      {/* Buscador de Alumnos */}
      {membersList.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00aeef]/30 focus:border-[#00aeef] text-foreground placeholder:text-muted-foreground transition-all"
          />
        </div>
      )}

      {/* Grid de Alumnos */}
      {filteredMembers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-secondary text-muted-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-foreground font-semibold text-base">No tenés alumnos vinculados</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Usá el botón de "Vincular Alumno" para sumar tu primer atleta mediante su correo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();
            const hasRoutinesArray = member.routines && member.routines.length > 0;
            const hasSingleRoutine = !!member.routine_name;

            return (
              <div
                key={member.id}
                className="bg-card border border-border hover:border-[#00aeef]/40 rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar con degradado Cyan */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00aeef] to-cyan-700 text-black font-extrabold text-sm flex items-center justify-center shadow-md">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm leading-tight">
                          {member.first_name} {member.last_name}
                        </h3>
                        <span className="inline-block mt-0.5 text-[11px] font-semibold bg-[#00aeef]/10 text-[#00aeef] px-2 py-0.5 rounded-md border border-[#00aeef]/20">
                          Activo
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === member.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-popover rounded-xl shadow-xl border border-border py-1.5 z-20">
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleRemoveMember(member.id);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Desvincular alumno</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel con Rutina Asignada e Historial */}
                  <div className="bg-secondary/50 rounded-xl p-3 space-y-2.5 border border-border mb-4">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Rutina Asignada
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        {hasRoutinesArray ? (
                          member.routines!.map((r) => (
                            <span 
                              key={r.id}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#00aeef]/10 text-[#00aeef] px-2.5 py-1 rounded-lg border border-[#00aeef]/20"
                            >
                              <Dumbbell className="w-3 h-3 text-[#00aeef]" />
                              {r.title}
                            </span>
                          ))
                        ) : hasSingleRoutine ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#00aeef]/10 text-[#00aeef] px-2.5 py-1 rounded-lg border border-[#00aeef]/20">
                            <Dumbbell className="w-3 h-3 text-[#00aeef]" />
                            {member.routine_name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin rutina asignada</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        Último entreno:
                      </span>
                      <span className="font-semibold text-foreground">
                        {member.last_workout || "Sin registros"}
                      </span>
                    </div>

                    {/* BOTÓN VER HISTORIAL DEL ALUMNO */}
                    <div className="pt-2 border-t border-border flex justify-end">
                      <button
                        type="button"
                        onClick={() => setHistoryMember(member)}
                        className="text-xs font-semibold text-[#00aeef] hover:text-[#33c0f4] flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        Ver Historial Completo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botón Asignar Rutina */}
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setSelectedRoutineId(member.routine_id || (routines[0]?.id ? Number(routines[0].id) : null));
                    setAssignError("");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-[#00aeef]/40 font-semibold py-2 rounded-xl text-xs transition-all"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-[#00aeef]" />
                  <span>Asignar Nueva Rutina</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL HISTORIAL DE ENTRENAMIENTOS */}
      <WorkoutHistoryModal
        member={historyMember}
        isOpen={!!historyMember}
        onClose={() => setHistoryMember(null)}
      />

      {/* MODAL ASIGNAR RUTINA */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 text-card-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Asignar Rutina a {selectedMember.first_name}
              </h3>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Selecciona la rutina de tu catálogo que querés asignarle a este atleta.
            </p>

            <form onSubmit={handleAssignRoutine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Rutina
                </label>
                {routines.length === 0 ? (
                  <p className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    No tenés rutinas creadas. Creá una rutina primero desde la sección Rutinas.
                  </p>
                ) : (
                  <select
                    value={selectedRoutineId || ""}
                    onChange={(e) => setSelectedRoutineId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00aeef]/30 focus:border-[#00aeef] text-foreground"
                  >
                    {routines.map((r) => (
                      <option key={r.id} value={r.id} className="bg-card text-card-foreground">
                        {r.title || r.nombre || r.name || `Rutina #${r.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                  disabled={assignLoading || routines.length === 0 || !selectedRoutineId}
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
              Ingresá el correo electrónico con el que el alumno se registró en FitZone.
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