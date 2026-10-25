import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { listTrainerExercises } from "./actions";
import ExerciseLibrary from "./ExerciseLibrary";

export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (!session || session.role !== "trainer") redirect("/login");
  const initial = await listTrainerExercises();
  return <ExerciseLibrary initial={initial} />;
}
