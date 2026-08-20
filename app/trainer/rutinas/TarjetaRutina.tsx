"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Edit2, Trash2, Loader2, Clock, Flame, Layers } from "lucide-react";
import { toast } from "sonner";
import { deleteRoutine } from "@/app/actions"; 

export interface Routine {
  id: number;
  title: string;
  notes?: string | any;
}

interface TarjetaRutinaProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDeleteSuccess?: () => void;
}

export default function TarjetaRutina({ routine, onEdit, onDeleteSuccess }: TarjetaRutinaProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  let ejercicios: any[] = [];
  try {
    if (typeof routine.notes === "string" && routine.notes.trim().startsWith("[")) {
      ejercicios = JSON.parse(routine.notes);
    } else if (Array.isArray(routine.notes)) {
      ejercicios = routine.notes;
    } else if (typeof routine.notes === "object" && routine.notes !== null) {
      ejercicios = [routine.notes];
    }
  } catch (e) {
    console.error("Error al procesar ejercicios:", e);
  }

  const handleDelete = async () => {
    toast.warning(`¿Eliminar "${routine.title}"?`, {
      description: "Esta acción no se puede deshacer.",
      action: {
        label: "Sí, eliminar",
        onClick: async () => {
          setIsDeleting(true);
          const toastId = toast.loading("Eliminando plantilla...");
          
          try {
            const res = await deleteRoutine(routine.id);
            if (res?.success) {
              toast.success("Rutina eliminada correctamente", { id: toastId });
              if (onDeleteSuccess) onDeleteSuccess();
              router.refresh();
            } else {
              toast.error("Error al eliminar: " + (res?.error || "Error desconocido"), { id: toastId });
            }
          } catch (err) {
            console.error(err);
            toast.error("Ocurrió un error inesperado al eliminar.", { id: toastId });
          } finally {
            setIsDeleting(false);
          }
        },
      },
      duration: 8000,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-xl hover:border-border/80 transition-all duration-200 overflow-hidden flex flex-col justify-between group relative text-card-foreground">
      
      {/* 1. Barra Acentuada Superior Cyan */}
      <div className="h-1 bg-gradient-to-r from-[#00aeef] via-[#0081b3] to-[#004e6e] w-full" />

      <div className="p-5 flex-1 flex flex-col justify-between">
        
        {/* 2. Header de la Tarjeta */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-[#00aeef] border border-border flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base tracking-tight leading-snug">
                  {routine.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    ID #{routine.id}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00aeef] bg-[#00aeef]/10 px-2 py-0.5 rounded-md border border-[#00aeef]/20">
                    <Layers className="w-3 h-3" />
                    {ejercicios.length} {ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Eliminar rutina"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>

          {/* 3. Lista Estilizada de Ejercicios */}
          <div className="space-y-2 mt-4">
            {ejercicios.length === 0 ? (
              <div className="p-6 text-center bg-secondary/50 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground italic">Sin ejercicios en esta plantilla</p>
              </div>
            ) : (
              ejercicios.map((ej, idx) => {
                const notas = ej.notas || ej.notes;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00aeef] shrink-0" />
                        {ej.nombre || "Ejercicio sin nombre"}
                      </p>
                      {notas && (
                        <p className="text-[11px] text-muted-foreground truncate pl-3.5 mt-0.5">
                          {notas}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-extrabold text-foreground bg-background px-2 py-1 rounded-lg border border-border shadow-sm">
                        {ej.series || 0}×{ej.reps || 0}
                      </span>

                      {ej.rir !== undefined && ej.rir !== "" && (
                        <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-0.5" title="RIR">
                          <Flame className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                          {ej.rir}
                        </span>
                      )}

                      {ej.pausa && (
                        <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 px-1.5 py-1 rounded-lg border border-cyan-500/20 flex items-center gap-0.5" title="Pausa">
                          <Clock className="w-2.5 h-2.5 text-cyan-500 dark:text-cyan-400" />
                          {ej.pausa}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. Botón de Acción Principal Cyan */}
        <div className="mt-5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => onEdit(routine)}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Edit2 className="w-3.5 h-3.5 text-black" />
            <span>Editar Plan de Carga</span>
          </button>
        </div>

      </div>
    </div>
  );
}