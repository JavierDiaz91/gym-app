"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TarjetaRutina, { Routine } from "./TarjetaRutina";
import FormularioNuevaRutina from "./FormularioNuevaRutina";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell, Sparkles } from "lucide-react";

interface PlanificadorClientProps {
  initialRoutines: Routine[];
}

export default function PlanificadorClient({ initialRoutines }: PlanificadorClientProps) {
  const router = useRouter();
  
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  useEffect(() => {
    setRoutines(initialRoutines);
  }, [initialRoutines]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | undefined>(undefined);

  const handleSetOpen = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedRoutine(undefined);
    }
  };

  const handleEdit = (routineId: number) => {
    const routineToEdit = routines.find((r) => r.id === routineId);
    if (routineToEdit) {
      setSelectedRoutine(routineToEdit);
      setIsFormOpen(true);
    }
  };

  const handleCreateNew = () => {
    setSelectedRoutine(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full space-y-6 text-gray-100">
      
      {/* Cabecera superior Dark & Cyan */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#14171d] p-6 rounded-2xl border border-gray-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Mis Rutinas Planificadas</h1>
            <span className="bg-[#00aeef]/10 text-[#00aeef] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#00aeef]/20">
              {routines.length} {routines.length === 1 ? "Rutina" : "Rutinas"}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Gestión, control y parametrización de tus planes de carga técnicos.
          </p>
        </div>

        <Button 
          onClick={handleCreateNew}
          className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold rounded-xl gap-2 shadow-md px-4 h-11 self-start sm:self-auto transition-all active:scale-95 text-xs border-none"
        >
          <Plus className="h-5 w-5 text-black" /> Nueva Rutina
        </Button>
      </div>

      {/* Grid de Rutinas o Estado Vacío (Empty State) */}
      {routines.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#14171d] rounded-2xl border border-gray-800/80 shadow-xl space-y-4 max-w-md mx-auto my-8">
          <div className="h-14 w-14 rounded-2xl bg-[#00aeef]/10 text-[#00aeef] flex items-center justify-center mx-auto border border-[#00aeef]/20 shadow-md">
            <Dumbbell className="h-7 w-7 text-[#00aeef]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No tienes rutinas creadas todavía</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Comienza creando tu primera plantilla de ejercicios parametrizada para asignarla a tus alumnos.
            </p>
          </div>
          <Button 
            onClick={handleCreateNew}
            variant="outline"
            className="border-gray-700 hover:border-[#00aeef]/40 bg-[#1a1e26] hover:bg-[#252b37] text-[#00aeef] rounded-xl font-semibold text-xs gap-2"
          >
            <Sparkles className="h-4 w-4 text-[#00aeef]" /> Crear primera rutina
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map((routine) => (
            <TarjetaRutina
              key={routine.id}
              routine={{
                id: routine.id,
                title: routine.title,
                notes: routine.notes,
              }}
              onEdit={() => handleEdit(routine.id)}
              onDeleteSuccess={() => {
                toast.success("Rutina eliminada de tu panel.");
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      {/* COMPONENTE FORMULARIO */}
      <FormularioNuevaRutina 
        open={isFormOpen} 
        setOpen={handleSetOpen} 
        routineToEdit={selectedRoutine}
        onSave={() => {
          if (selectedRoutine) {
            toast.success("Plan de carga actualizado correctamente 🚀");
          } else {
            toast.success("¡Nueva rutina creada y guardada con éxito! 🎉");
          }
          
          router.refresh();
        }}
      />
    </div>
  );
}