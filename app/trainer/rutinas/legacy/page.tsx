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
      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Nuevo planificador multideporte</p><p className="text-sm text-muted-foreground">Plantillas por disciplina, objetivo, nivel y público.</p></div><Link href="/trainer/rutinas/planes" className="rounded-lg bg-primary px-4 py-2 font-semibold text-black">Abrir planificador</Link></div>
      <PlanificadorClient initialRoutines={routines} />
    </div>
  );
}