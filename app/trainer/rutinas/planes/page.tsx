import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/app/actions";
import { listTrainingPlans, listEnabledTrainingCategories } from "./actions";
import PlanesClient from "./PlanesClient";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) redirect("/login");
  let plans: Awaited<ReturnType<typeof listTrainingPlans>> = [];
  let error: string | undefined;
  let categories: Awaited<ReturnType<typeof listEnabledTrainingCategories>> = [];
  try { [plans,categories] = await Promise.all([listTrainingPlans(),listEnabledTrainingCategories()]); }
  catch { error = "El módulo requiere aplicar primero las migraciones 007 y 009 en Neon."; }
  return <div className="space-y-4"><div className="flex justify-end"><Link href="/trainer/rutinas/legacy" className="rounded-lg border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Ver rutinas anteriores (compatibilidad)</Link></div><PlanesClient plans={plans} categories={categories} setupError={error} /></div>;
}
