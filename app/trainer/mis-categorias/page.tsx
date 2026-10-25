import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { listTrainerCategoriesForManagement } from "../rutinas/planes/actions";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) redirect("/login");
  try {
    const categories = await listTrainerCategoriesForManagement();
    return <CategoriesClient categories={categories}/>;
  } catch {
    return <div className="mx-auto max-w-4xl rounded-xl border border-amber-500/40 p-6 text-sm">No se pudieron cargar las categorías. Revisá que la migración 010 esté aplicada en Neon.</div>;
  }
}
