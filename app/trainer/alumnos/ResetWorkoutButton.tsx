"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { resetTodayWorkout } from "@/app/actions";

interface ResetWorkoutButtonProps {
  memberId: number;
  routineId: number;
}

export function ResetWorkoutButton({ memberId, routineId }: ResetWorkoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const confirmed = confirm(
      "¿Estás seguro de resetear el entrenamiento de hoy para este alumno? Podrá volver a iniciarlo inmediatamente."
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await resetTodayWorkout(memberId, routineId);
      if (res.success) {
        alert("Entrenamiento reseteado con éxito.");
      } else {
        alert("Error al resetear: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={loading}
      className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      Resetear Hoy
    </Button>
  );
}