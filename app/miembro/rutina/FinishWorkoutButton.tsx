"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logWorkout } from "@/app/actions";
import { CheckCircle } from "lucide-react";

export function FinishWorkoutButton({ routineId }: { routineId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleFinish = () => {
    startTransition(async () => {
      const res = await logWorkout(routineId, { completedAt: new Date().toISOString() });
      if (res.success) {
        router.refresh(); // <--- Fuerza el re-render de la Server Page
      } else {
        alert(res.error || "No se pudo finalizar el entrenamiento");
      }
    });
  };

  return (
    <button
      onClick={handleFinish}
      disabled={isPending}
      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
    >
      <CheckCircle className="w-5 h-5" />
      {isPending ? "Guardando..." : "Finalizar y Guardar Entrenamiento"}
    </button>
  );
}