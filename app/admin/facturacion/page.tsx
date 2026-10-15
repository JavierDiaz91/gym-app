import { getSaaSBillingOverviewAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import SaaSBillingClient from "./SaaSBillingClient";

export default async function FacturacionSaaSPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const result = await getSaaSBillingOverviewAction();

  const subscriptions =
    result.success && Array.isArray(result.subscriptions)
      ? result.subscriptions
      : [];

  const invoices =
    result.success && Array.isArray(result.invoices)
      ? result.invoices
      : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kivra SaaS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="mt-1 text-muted-foreground">
          Control de suscripciones y cobros de los gimnasios hacia Kivra.
        </p>
      </div>

      {!result.success && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar la facturación SaaS.
        </div>
      )}

      <SaaSBillingClient
        initialSubscriptions={subscriptions as any[]}
        initialInvoices={invoices as any[]}
      />
    </div>
  );
}
