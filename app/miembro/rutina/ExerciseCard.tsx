"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Flame, Timer, Hash, StickyNote, CheckCircle2 } from "lucide-react";

interface ExerciseCardProps {
  displayName: string;
  imageUrl?: string;
  index: number;
  routineId?: number | string;
  readOnly?: boolean;
  bloque: {
    series?: number | string;
    reps?: number | string;
    rir?: number | string;
    pausa?: string;
    notas?: string;
  };
}

export default function ExerciseCard({
  displayName,
  imageUrl,
  index,
  routineId,
  bloque,
  readOnly = false,
}: ExerciseCardProps) {
  const totalSeries = Number(bloque.series) || 1;
  const storageKey = `routine_progress_${routineId || "default"}_ex_${index}`;

  const [completedSeries, setCompletedSeries] = useState<boolean[]>(() => {
    return new Array(totalSeries).fill(readOnly);
  });

  useEffect(() => {
    if (readOnly) {
      setCompletedSeries(new Array(totalSeries).fill(true));
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === totalSeries) {
          setCompletedSeries(parsed);
        }
      } catch (e) {
        console.error("Error al leer el progreso de localStorage", e);
      }
    }

    const handleReset = () => {
      setCompletedSeries(new Array(totalSeries).fill(false));
    };

    window.addEventListener("workout_reset", handleReset);
    return () => window.removeEventListener("workout_reset", handleReset);
  }, [storageKey, totalSeries, readOnly]);

  const toggleSerie = (idx: number) => {
    if (readOnly) return;

    const updated = [...completedSeries];
    updated[idx] = !updated[idx];
    setCompletedSeries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const completedCount = completedSeries.filter(Boolean).length;
  const isFullyDone = completedCount === totalSeries;

  // Helper para renderizar pausa de tiempo sin errores
  const renderPausa = (pausaValue?: string) => {
    if (!pausaValue || pausaValue.trim() === "" || pausaValue === "0") {
      return "Sin pausa";
    }
    if (pausaValue.toLowerCase().includes("s") || pausaValue.toLowerCase().includes("m")) {
      return pausaValue;
    }
    return `${pausaValue}s`;
  };

  return (
    <Card
      className={`border-gray-200 shadow-xs overflow-hidden transition-all duration-200 ${
        isFullyDone ? "border-emerald-500 bg-emerald-50/20" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Imagen del ejercicio / Placeholder sin foto */}
        <div className="relative w-full md:w-52 h-48 md:h-auto bg-slate-900 shrink-0 flex items-center justify-center overflow-hidden">
          {imageUrl && imageUrl.trim() !== "" ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Dumbbell className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sin demostración
              </span>
            </div>
          )}

          <Badge className="absolute top-3 left-3 bg-black/70 text-white backdrop-blur-xs border-none text-xs">
            Ejercicio #{index + 1}
          </Badge>
          
          {isFullyDone && (
            <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center gap-2 text-white font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span>Completado</span>
            </div>
          )}
        </div>

        {/* Info y Métricas */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
              <Badge
                variant={isFullyDone ? "default" : "outline"}
                className={isFullyDone ? "bg-emerald-600 text-white" : ""}
              >
                {completedCount} / {totalSeries} Series
              </Badge>
            </div>

            {/* Grilla de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {/* Series */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-0.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-600" />
                  Series
                </div>
                <span className="text-base font-bold text-gray-900">
                  {bloque.series || "-"}
                </span>
              </div>

              {/* Reps */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-0.5">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                  Reps
                </div>
                <span className="text-base font-bold text-gray-900">
                  {bloque.reps || "-"}
                </span>
              </div>

              {/* RIR */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-0.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  RIR
                </div>
                <span className="text-base font-bold text-gray-900">
                  {bloque.rir ?? "-"}
                </span>
              </div>

              {/* Pausa */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-0.5">
                  <Timer className="w-3.5 h-3.5 text-blue-500" />
                  Pausa
                </div>
                <span className="text-base font-bold text-gray-900">
                  {renderPausa(bloque.pausa)}
                </span>
              </div>
            </div>

            {/* Check de Series */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-600">
                Marcar series completadas:
              </p>
              <div className="flex flex-wrap gap-2">
                {completedSeries.map((isDone, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggleSerie(sIdx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      readOnly
                        ? "opacity-60 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-200"
                        : isDone
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs cursor-pointer"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        isDone ? "text-white" : "text-gray-400"
                      }`}
                    />
                    Serie {sIdx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Indicaciones / Notas */}
          {bloque.notas && (
            <div className="flex items-start gap-2.5 bg-amber-50/70 p-3 rounded-xl border border-amber-100 text-xs text-amber-900">
              <StickyNote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5 text-amber-950">
                  Indicaciones:
                </span>
                {bloque.notas}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}