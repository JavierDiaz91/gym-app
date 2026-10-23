import { redirect } from "next/navigation";
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
  return <PlanesClient plans={plans} categories={categories} setupError={error} />;
}
