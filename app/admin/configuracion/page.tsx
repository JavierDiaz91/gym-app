import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session || session.role !== "admin" || !Number.isSafeInteger(session.gymId) || session.gymId <= 0) {
    redirect("/login");
  }

  return <ConfiguracionClient gymId={session.gymId} />;
}
