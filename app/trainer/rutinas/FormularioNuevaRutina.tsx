"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Dumbbell, Flame, Clock, Clipboard, Save, Loader2, Image as ImageIcon, X } from "lucide-react";
import { saveOrUpdateRoutine, getExercisesList } from "@/app/actions";

interface Ejercicio {
  nombre: string;
  series: number;
  reps: string;
  rir: string;
  pausa: string;
  notas?: string;
  image_url?: string;
}

interface EjercicioOption {
  id: number;
  name: string;
  muscle_group?: string;
  image_url?: string;
}

interface FormularioNuevaRutinaProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  routineToEdit?: {
    id: number;
    title: string;
    notes?: string | any;
  };
  onSave?: () => void;
}

export default function FormularioNuevaRutina({ open, setOpen, routineToEdit, onSave }: FormularioNuevaRutinaProps) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [dbExercises, setDbExercises] = useState<EjercicioOption[]>([]);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      getExercisesList()
        .then((data) => {
          const formatted: EjercicioOption[] = (data || []).map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || item.nombre || ""),
            muscle_group: item.muscle_group ? String(item.muscle_group) : undefined,
            image_url: item.image_url ? String(item.image_url) : undefined,
          }));
          setDbExercises(formatted);
        })
        .catch((err) => console.error("Error al obtener ejercicios:", err));
    }
  }, [open]);

  useEffect(() => {
    if (routineToEdit) {
      setTitulo(routineToEdit.title);
      try {
        const parsed = typeof routineToEdit.notes === "string" ? JSON.parse(routineToEdit.notes) : routineToEdit.notes;
        setEjercicios(parsed || []);
      } catch (e) {
        console.error("Error parseando ejercicios en el formulario", e);
        setEjercicios([]);
      }
    } else {
      setTitulo("");
      setEjercicios([]);
    }
  }, [routineToEdit, open]);

  const agregarEjercicio = () => {
    setEjercicios([
      ...ejercicios,
      { nombre: "", series: 4, reps: "10", rir: "2", pausa: "2 min", notas: "", image_url: "" }
    ]);
  };

  const eliminarEjercicio = (index: number) => {
    setEjercicios(ejercicios.filter((_, i) => i !== index));
  };

  const handleEjercicioChange = (index: number, field: keyof Ejercicio, value: any) => {
    const nuevosEjercicios = [...ejercicios];
    
    if (field === "nombre") {
      const match = dbExercises.find(
        (ex) => ex.name.toLowerCase().trim() === String(value).toLowerCase().trim()
      );
      
      if (match && match.image_url) {
        nuevosEjercicios[index] = {
          ...nuevosEjercicios[index],
          [field]: value,
          image_url: match.image_url,
        };
        setEjercicios(nuevosEjercicios);
        return;
      }
    }

    nuevosEjercicios[index] = { ...nuevosEjercicios[index], [field]: value };
    setEjercicios(nuevosEjercicios);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      alert("Por favor, ingresa un título para la rutina.");
      return;
    }

    setIsPending(true);
    try {
      const res = await saveOrUpdateRoutine(
        titulo,
        JSON.stringify(ejercicios),
        routineToEdit?.id
      );

      if (res.success) {
        setOpen(false);
        if (onSave) onSave();
        router.refresh();
      } else {
        alert(`Error al guardar: ${res.error}`);
      }
    } catch (err) {
      console.error("Error inesperado en el cliente:", err);
      alert("Ocurrió un error inesperado al intentar guardar los cambios.");
    } finally {
      setIsPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <datalist id="lista-ejercicios">
        {dbExercises.map((ej) => (
          <option key={ej.id} value={ej.name}>
            {ej.muscle_group ? `(${ej.muscle_group})` : ""}
          </option>
        ))}
      </datalist>

      <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-card-foreground">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#00aeef]/10 text-[#00aeef] flex items-center justify-center border border-[#00aeef]/20 shadow-md">
              <Dumbbell className="h-5 w-5 text-[#00aeef]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight text-foreground">
                {routineToEdit ? "Editar Plan de Carga" : "Nuevo Plan de Carga"}
              </h3>
              <p className="text-xs text-muted-foreground">Modifica las variables de volumen e intensidad del alumno.</p>
            </div>
          </div>
          <button 
            type="button"
            disabled={isPending}
            onClick={() => setOpen(false)} 
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título de la Rutina</label>
            <input 
              type="text" 
              required
              disabled={isPending}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#00aeef] focus:ring-1 focus:ring-[#00aeef] transition-all disabled:opacity-50"
              placeholder="Ej. Torso Fuerza / Pierna Hipertrofia"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ejercicios Configurados</label>
              <Button 
                type="button" 
                disabled={isPending}
                onClick={agregarEjercicio} 
                size="sm" 
                className="bg-[#00aeef]/10 hover:bg-[#00aeef]/20 text-[#00aeef] border border-[#00aeef]/30 rounded-xl text-xs gap-1.5 font-bold transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir Ejercicio
              </Button>
            </div>

            <div className="space-y-3">
              {ejercicios.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-2xl text-xs text-muted-foreground italic bg-muted/30">
                  No hay ejercicios agregados. Haz clic en "Añadir Ejercicio" para comenzar.
                </div>
              ) : (
                ejercicios.map((ej, index) => (
                  <div key={index} className="bg-muted/40 rounded-xl p-4 border border-border space-y-3 relative group hover:border-border/80 transition-colors">
                    <button 
                      type="button" 
                      disabled={isPending}
                      onClick={() => eliminarEjercicio(index)} 
                      className="absolute top-4 right-4 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                      title="Eliminar ejercicio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pr-8">
                      
                      {/* NOMBRE */}
                      <div className="md:col-span-4 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nombre</span>
                        <input 
                          type="text" 
                          list="lista-ejercicios"
                          required 
                          disabled={isPending}
                          placeholder="Buscar o escribir..."
                          value={ej.nombre} 
                          onChange={(e) => handleEjercicioChange(index, "nombre", e.target.value)} 
                          className="w-full px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border rounded-lg focus:outline-none focus:border-[#00aeef] disabled:opacity-50" 
                        />
                      </div>

                      {/* SERIES */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Series</span>
                        <input 
                          type="number" 
                          required 
                          disabled={isPending}
                          value={ej.series} 
                          onChange={(e) => handleEjercicioChange(index, "series", parseInt(e.target.value) || 0)} 
                          className="w-full px-2.5 py-1.5 text-xs text-center font-black text-foreground bg-background border border-border rounded-lg focus:outline-none focus:border-[#00aeef] disabled:opacity-50" 
                        />
                      </div>

                      {/* REPS */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reps</span>
                        <input 
                          type="text" 
                          required 
                          disabled={isPending}
                          value={ej.reps} 
                          onChange={(e) => handleEjercicioChange(index, "reps", e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-center font-black text-foreground bg-background border border-border rounded-lg focus:outline-none focus:border-[#00aeef] disabled:opacity-50" 
                        />
                      </div>

                      {/* RIR */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-0.5 justify-center">
                          <Flame className="h-3 w-3 text-amber-500 dark:text-amber-400" /> RIR
                        </span>
                        <input 
                          type="text" 
                          required 
                          disabled={isPending}
                          value={ej.rir} 
                          onChange={(e) => handleEjercicioChange(index, "rir", e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-center font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg focus:outline-none focus:border-amber-400 disabled:opacity-50" 
                        />
                      </div>

                      {/* PAUSA */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-0.5 justify-center">
                          <Clock className="h-3 w-3 text-cyan-500 dark:text-cyan-400" /> Pausa
                        </span>
                        <input 
                          type="text" 
                          required 
                          disabled={isPending}
                          value={ej.pausa} 
                          onChange={(e) => handleEjercicioChange(index, "pausa", e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-center font-black text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg focus:outline-none focus:border-cyan-400 disabled:opacity-50" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* NOTAS TÉCNICAS */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Clipboard className="h-3 w-3 text-muted-foreground" /> Notas Técnicas
                        </span>
                        <input 
                          type="text" 
                          disabled={isPending}
                          value={ej.notas || ""} 
                          onChange={(e) => handleEjercicioChange(index, "notas", e.target.value)} 
                          className="w-full px-3 py-1.5 text-xs text-foreground bg-background border border-border rounded-lg focus:outline-none focus:border-[#00aeef] placeholder:text-muted-foreground/60 disabled:opacity-50" 
                          placeholder="Ej. Controlar la fase excéntrica 3 segundos / Barra al pecho"
                        />
                      </div>

                      {/* URL DE LA IMAGEN / GIF */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-muted-foreground" /> URL Imagen/GIF (Opcional)
                        </span>
                        <input 
                          type="text" 
                          disabled={isPending}
                          value={ej.image_url || ""} 
                          onChange={(e) => handleEjercicioChange(index, "image_url", e.target.value)} 
                          className="w-full px-3 py-1.5 text-xs text-foreground bg-background border border-border rounded-lg focus:outline-none focus:border-[#00aeef] placeholder:text-muted-foreground/60 disabled:opacity-50" 
                          placeholder="https://... (dejar vacío si usa la del catálogo)"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              disabled={isPending}
              onClick={() => setOpen(false)} 
              className="border-border text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-xl text-xs font-semibold h-10 px-4 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold rounded-xl text-xs h-10 px-5 gap-2 shadow-md disabled:opacity-50 cursor-pointer border-none"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-black" /> Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}