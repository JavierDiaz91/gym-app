import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getTrainerRoutines } from "@/app/actions";
import PlanificadorClient from "../PlanificadorClient";
import { Routine } from "../TarjetaRutina";

export const dynamic = "force-dynamic";

export default async function RutinasPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer") {
    redirect("/login");
  }

  const serverRoutines = await getTrainerRoutines(session.id);

  const routines: Routine[] = (serverRoutines || []).map((row: any) => ({
    id: Number(row.id),
    title: row.title || "Sin título",
    notes: typeof row.notes === "string" ? row.notes : JSON.stringify(row.notes || []),
  }));

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 md:p-6 transition-colors duration-200">
      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Panel entrenador · Rutinas rápidas</p><h1 className="mt-1 text-xl font-bold">Crear rutinas</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Armá rutinas individuales con ejercicios, series, repeticiones, RIR, descansos y notas técnicas. Ideal para preparar entrenamientos puntuales sin organizar un programa de varias semanas.</p></div><Link href="/trainer/rutinas/planes" className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">Ir al planificador deportivo →</Link></div>
      <PlanificadorClient initialRoutines={routines} />
    </div>
  );
}