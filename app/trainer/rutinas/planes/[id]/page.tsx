import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { getTrainingPlan, listTrainerPlanMembers } from "../actions";
import PlanEditor from "./PlanEditor";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "trainer") redirect("/login");
  const { id } = await params;
  if (!/^\d+$/.test(id)) redirect("/trainer/rutinas/planes");
  const [plan, members] = await Promise.all([getTrainingPlan(Number(id)), listTrainerPlanMembers()]);
  return <PlanEditor plan={plan} members={members}/>;
}
