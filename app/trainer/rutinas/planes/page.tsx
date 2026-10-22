import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { listTrainingPlans } from "./actions";
import PlanesClient from "./PlanesClient";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) redirect("/login");
  let plans: Awaited<ReturnType<typeof listTrainingPlans>> = [];
  let error: string | undefined;
  try { plans = await listTrainingPlans(); }
  catch { error = "El módulo requiere aplicar primero las migraciones 007 y 008 en Neon."; }
  return <PlanesClient plans={plans} setupError={error} />;
}
