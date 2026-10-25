import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { getMyTrainingPlan } from "./actions";
import MyPlanClient from "./MyPlanClient";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (!session || session.role !== "member") redirect("/login");
  let plan: Awaited<ReturnType<typeof getMyTrainingPlan>> = null;
  let error = "";
  try { plan = await getMyTrainingPlan(); } catch { error = "No se pudo cargar la planificación."; }
  return <MyPlanClient plan={plan} error={error}/>;
}
