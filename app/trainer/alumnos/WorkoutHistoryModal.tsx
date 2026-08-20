"use client";

import { useState, useEffect } from "react";
import { getMemberWorkoutHistory } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarCheck2, Loader2, Dumbbell, History } from "lucide-react";

interface WorkoutLog {
  id: number;
  routine_title: string;
  completed_at: string;
  notes?: string | null;
}

interface WorkoutHistoryModalProps {
  member: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkoutHistoryModal({
  member,
  isOpen,
  onClose,
}: WorkoutHistoryModalProps) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);

 useEffect(() => {
  if (isOpen && member) {
    setLoading(true);
    getMemberWorkoutHistory(member.id)
      .then((data: any[]) => {
        // Formateamos los logs para garantizar que routine_title y completed_at existan
        const formattedLogs = data.map((log) => ({
          id: Number(log.id),
          routine_title: String(log.routine_title || "Rutina de Entrenamiento"),
          completed_at: String(log.completed_at),
          details: log.details,
        }));
        setLogs(formattedLogs);
      })
      .catch((err) => {
        console.error("Error al cargar historial:", err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }
}, [isOpen, member]);

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Historial de {member.first_name} {member.last_name}
            </DialogTitle>
          </div>
          <p className="text-xs text-gray-500">
            Últimos entrenamientos completados por el atleta.
          </p>
        </DialogHeader>

        <div className="mt-4 max-h-[380px] overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs">Cargando registros...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl p-6 space-y-2">
              <Dumbbell className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">Sin entrenamientos registrados</p>
              <p className="text-xs text-gray-400">
                El alumno aún no completó ninguna sesión.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const dateObj = new Date(log.completed_at);
              const formattedDate = dateObj.toLocaleDateString("es-AR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {log.routine_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>{formattedDate} — {formattedTime} hs</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}