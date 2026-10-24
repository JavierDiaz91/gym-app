import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { getTrainingPlan, listTrainerPlanMembers, listExerciseImages } from "../actions";
import PlanEditor from "./PlanEditor";
import { listTrainerExercises } from "@/app/trainer/ejercicios/actions";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "trainer") redirect("/login");
  const { id } = await params;
  if (!/^\d+$/.test(id)) redirect("/trainer/rutinas/planes");
  const [plan, members, exercises] = await Promise.all([getTrainingPlan(Number(id)), listTrainerPlanMembers(), listTrainerExercises()]);
  return <PlanEditor plan={plan} members={members} exercises={exercises}/>;
}
