"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Flame, Timer, Hash, StickyNote, CheckCircle2 } from "lucide-react";

interface ExerciseCardProps {
  displayName?: string;
  nombre?: string;
  imageUrl?: string;
  index?: number;
  routineId?: number | string;
  readOnly?: boolean;
  isReadOnly?: boolean; // Soporte para ambas convenciones de props
  bloque?: {
    series?: number | string;
    reps?: number | string;
    rir?: number | string;
    pausa?: string;
    notas?: string;
  };

  [key: string]: any;
}

export default function ExerciseCard(props: ExerciseCardProps) {
  const {
    displayName,
    nombre,
    imageUrl,
    index = 0,
    routineId,
    readOnly = false,
    isReadOnly = false,
    bloque,
  } = props;

  // Unificamos la prop por si se pasa como readOnly o isReadOnly
  const isLocked = readOnly || isReadOnly;

  // Extraer valores buscando en props directas o dentro de bloque
  const title = displayName || nombre || props.exerciseName || "Ejercicio";
  const safeIndex = typeof index === "number" && !isNaN(index) ? index : 0;

  const seriesVal = bloque?.series ?? props.series;
  const repsVal = bloque?.reps ?? props.reps;
  const rirVal = bloque?.rir ?? props.rir;
  const pausaVal = bloque?.pausa ?? props.pausa;
  const notasVal = bloque?.notas ?? props.notas ?? props.indicaciones;

  const totalSeries = Number(seriesVal) || 1;
  const storageKey = `routine_progress_${routineId || "default"}_ex_${safeIndex}`;

  const [completedSeries, setCompletedSeries] = useState<boolean[]>(() => {
    return new Array(totalSeries).fill(isLocked);
  });

  useEffect(() => {
    // Si la rutina ya fue realizada, todas las series quedan completadas
    if (isLocked) {
      setCompletedSeries(new Array(totalSeries).fill(true));
      return;
    }

    // De lo contrario, leemos el progreso activo de localStorage
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === totalSeries) {
          setCompletedSeries(parsed);
        }
      } catch (e) {
        console.error("Error al leer localStorage", e);
      }
    } else {
      setCompletedSeries(new Array(totalSeries).fill(false));
    }

    const handleReset = () => {
      setCompletedSeries(new Array(totalSeries).fill(false));
    };

    window.addEventListener("workout_reset", handleReset);
    return () => window.removeEventListener("workout_reset", handleReset);
  }, [storageKey, totalSeries, isLocked]);

  const toggleSerie = (idx: number) => {
    if (isLocked) return;

    const updated = [...completedSeries];
    updated[idx] = !updated[idx];
    setCompletedSeries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const completedCount = completedSeries.filter(Boolean).length;
  const isFullyDone = completedCount === totalSeries;

  const renderPausa = (pausaValue?: string | number) => {
    if (pausaValue === undefined || pausaValue === null) return "Sin pausa";
    const strVal = String(pausaValue).trim();
    if (strVal === "" || strVal === "0") return "Sin pausa";
    if (
      strVal.toLowerCase().includes("min") ||
      strVal.toLowerCase().includes("s") ||
      strVal.toLowerCase().includes("m")
    ) {
      return strVal;
    }
    return `${strVal} min`;
  };

  return (
    <Card className="border border-slate-700/60 bg-[#0B132B]/80 text-white shadow-xl overflow-hidden rounded-2xl mb-6">
      <div className="flex flex-col md:flex-row min-h-[220px]">
        
        {/* Panel Izquierdo: Imagen / Demostración */}
        <div className="relative w-full md:w-64 bg-[#090D16] shrink-0 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800">
          <Badge className="absolute top-4 left-4 bg-slate-900/90 text-slate-200 border border-slate-700/50 px-2.5 py-1 text-xs font-semibold rounded-md z-10">
            Ejercicio #{safeIndex + 1}
          </Badge>

          {imageUrl && imageUrl.trim() !== "" ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 mt-4">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Dumbbell className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sin demostración
              </span>
            </div>
          )}

          {/* Banner superpuesto si todas las series o la rutina entera están completadas */}
          {isFullyDone && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white font-bold z-20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <span>{isLocked ? "Realizado" : "Completado"}</span>
            </div>
          )}
        </div>

        {/* Panel Derecho: Métricas, Controles e Indicaciones */}
        <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
          <div>
            {/* Título y Contador de Series */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-slate-100">{title}</h3>
              <span className="text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                {completedCount} / {totalSeries} Series
              </span>
            </div>

            {/* Métricas del Ejercicio */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {/* Series */}
              <div className="bg-white text-slate-900 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-600" />
                  Series
                </div>
                <span className="text-xl font-extrabold">{seriesVal ?? "-"}</span>
              </div>

              {/* Reps */}
              <div className="bg-white text-slate-900 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                  Reps
                </div>
                <span className="text-xl font-extrabold">{repsVal ?? "-"}</span>
              </div>

              {/* RIR */}
              <div className="bg-white text-slate-900 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  RIR
                </div>
                <span className="text-xl font-extrabold">{rirVal ?? "-"}</span>
              </div>

              {/* Pausa */}
              <div className="bg-white text-slate-900 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <Timer className="w-3.5 h-3.5 text-blue-500" />
                  Pausa
                </div>
                <span className="text-lg font-extrabold">{renderPausa(pausaVal)}</span>
              </div>
            </div>

            {/* Marcar Series */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                {isLocked ? "Series asignadas (Modo lectura):" : "Marcar series completadas:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {completedSeries.map((isDone, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleSerie(sIdx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      isLocked
                        ? "bg-slate-800/80 text-emerald-400 border border-emerald-500/30 cursor-default opacity-90"
                        : isDone
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 cursor-pointer"
                        : "bg-white text-slate-800 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isLocked || isDone ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    Serie {sIdx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Indicaciones / Notas */}
          {notasVal && (
            <div className="flex items-start gap-3 bg-[#332e22] border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-200">
              <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">Indicaciones:</span>
                {notasVal}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}