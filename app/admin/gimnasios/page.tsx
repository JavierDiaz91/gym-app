import {
  getGymSaaSSubscriptionsAction,
  getGymsAction,
  getSaaSPlansAction,
  getSession,
} from "@/app/actions";
import { redirect } from "next/navigation";
import AdminGymsClient from "./AdminGymsClient";
import type { ComponentProps } from "react";

type SaaSPlan = ComponentProps<typeof AdminGymsClient>["initialPlans"][number];
type SaaSSubscription = ComponentProps<typeof AdminGymsClient>["initialSubscriptions"][number];

function isSaaSPlan(row: Record<string, any>): row is SaaSPlan {
  return typeof row.id === "number" &&
    typeof row.name === "string" &&
    typeof row.status === "string" &&
    (row.monthly_price === null || typeof row.monthly_price === "number" || typeof row.monthly_price === "string");
}

function isSaaSSubscription(row: Record<string, any>): row is SaaSSubscription {
  return typeof row.gym_id === "number" &&
    typeof row.plan_id === "number" &&
    typeof row.plan_name === "string" &&
    typeof row.status === "string" &&
    (row.next_billing_date === null || typeof row.next_billing_date === "string");
}

export default async function AdminGymsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const [gymsResult, plansResult, subscriptionsResult] = await Promise.all([
    getGymsAction(),
    getSaaSPlansAction(),
    getGymSaaSSubscriptionsAction(),
  ]);

  const gyms = gymsResult.success ? gymsResult.data : [];
  const plans = (plansResult.success ? plansResult.data : []).filter(isSaaSPlan);
  const subscriptions = (subscriptionsResult.success ? subscriptionsResult.data : []).filter(isSaaSSubscription);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Gestión de Gimnasios SaaS
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administrá los tenants, sus cuentas principales y el plan SaaS contratado.
          </p>
        </div>
      </div>

      <AdminGymsClient
        initialGyms={gyms}
        initialPlans={plans}
        initialSubscriptions={subscriptions}
      />
    </div>
  );
}
