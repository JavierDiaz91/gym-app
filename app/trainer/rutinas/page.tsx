import { redirect } from "next/navigation";
import { getSession, getTrainerRoutines } from "@/app/actions";
import PlanificadorClient from "./PlanificadorClient";
import { Routine } from "./TarjetaRutina";

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
      <PlanificadorClient initialRoutines={routines} />
    </div>
  );
}