import { getSaaSPlansAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import SaaSPlansClient from "./SaaSPlansClient";

export default async function PlanesSaaSPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const result = await getSaaSPlansAction();
  const plans = result.success && Array.isArray(result.data) ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kivra SaaS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Planes SaaS</h1>
        <p className="mt-1 text-muted-foreground">
          Administrá los planes comerciales que Kivra ofrece a los gimnasios.
        </p>
      </div>

      {!result.success && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar los planes desde la base de datos.
        </div>
      )}

      <SaaSPlansClient initialPlans={plans as any[]} />
    </div>
  );
}
