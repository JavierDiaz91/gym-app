// app/miembro/rutina/FinishWorkoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { logWorkout } from "@/app/actions";
import { useRouter } from "next/navigation";

export function FinishWorkoutButton({ routineId }: { routineId: number }) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await logWorkout(routineId, { status: "completed", date: new Date().toISOString() });
      if (res.success) {
        setCompleted(true);
        
        // 1. Limpiamos las claves del localStorage (tanto la nueva convención como la anterior)
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("routine_progress_") || key.startsWith("exercise_completed_")) {
            localStorage.removeItem(key);
          }
        });

        // 2. Disparamos el evento personalizado para notificar a ExerciseCard que limpie el estado local
        window.dispatchEvent(new Event("workout_reset"));

        setTimeout(() => {
          router.push("/miembro");
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 font-medium flex items-center justify-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ¡Entrenamiento guardado con éxito! Redirigiendo...
      </div>
    );
  }

  return (
    <Button
      onClick={handleFinish}
      disabled={loading}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl shadow-sm text-base flex items-center justify-center gap-2 cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Guardando en la base de datos...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-5 h-5" />
          Finalizar y Guardar Entrenamiento
        </>
      )}
    </Button>
  );
}