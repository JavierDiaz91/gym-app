import { getSaaSAuditLogAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BadgeDollarSign,
  Building2,
  FileCheck2,
  FilePlus2,
  Layers3,
  UserRoundCog,
} from "lucide-react";

function eventMeta(action: string) {
  switch (action) {
    case "saas_plan_created":
      return {
        label: "Plan SaaS creado",
        icon: Layers3,
      };
    case "saas_plan_updated":
      return {
        label: "Plan SaaS actualizado",
        icon: Layers3,
      };
    case "gym_status_changed":
      return { label: "Estado de gimnasio actualizado", icon: Building2 };
    case "gym_saas_plan_assigned":
      return {
        label: "Plan asignado a gimnasio",
        icon: Building2,
      };
    case "saas_invoice_generated":
      return {
        label: "Factura SaaS generada",
        icon: FilePlus2,
      };
    case "saas_invoice_paid":
      return {
        label: "Factura SaaS pagada",
        icon: FileCheck2,
      };
    default:
      return {
        label: action.replaceAll("_", " "),
        icon: Activity,
      };
  }
}

function detailText(event: any) {
  const details = event?.details || {};

  if (event.action === "saas_plan_created" || event.action === "saas_plan_updated") {
    return details.name
      ? `${details.name} · ${details.status || "sin estado"}`
      : "Plan SaaS";
  }

  if (event.action === "gym_status_changed") {
    const states: Record<string, string> = { active: "Activo", suspended: "Suspendido" };
    return [details.gymName || event.gym_name, states[details.previousStatus] || details.previousStatus, "→", states[details.newStatus] || details.newStatus].filter(Boolean).join(" ");
  }

  if (event.action === "gym_saas_plan_assigned") {
    return [details.gymName, details.planName, details.status]
      .filter(Boolean)
      .join(" · ");
  }

  if (event.action === "saas_invoice_generated") {
    const amount =
      details.amount != null
        ? "$" + Number(details.amount).toLocaleString("es-AR")
        : null;

    return [details.gymName, details.planName, amount]
      .filter(Boolean)
      .join(" · ");
  }

  if (event.action === "saas_invoice_paid") {
    const amount =
      details.amount != null
        ? "$" + Number(details.amount).toLocaleString("es-AR")
        : null;

    return [event.gym_name, amount].filter(Boolean).join(" · ");
  }

  return event.gym_name || event.entity_type || "Evento de plataforma";
}

export default async function ActividadSaaSPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const result = await getSaaSAuditLogAction(100);
  const events = result.success && Array.isArray(result.data) ? result.data : [];

  const planEvents = events.filter((event: any) =>
    ["saas_plan_created", "saas_plan_updated", "gym_saas_plan_assigned", "gym_status_changed"].includes(
      event.action
    )
  ).length;

  const billingEvents = events.filter((event: any) =>
    ["saas_invoice_generated", "saas_invoice_paid"].includes(event.action)
  ).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kivra SaaS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Actividad</h1>
        <p className="mt-1 text-muted-foreground">
          Historial de acciones administrativas realizadas sobre la plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Activity className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">{events.length}</p>
            <p className="text-sm text-muted-foreground">Eventos recientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Layers3 className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">{planEvents}</p>
            <p className="text-sm text-muted-foreground">Planes y asignaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">{billingEvents}</p>
            <p className="text-sm text-muted-foreground">Facturación</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Historial de auditoría
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!result.success ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              No se pudo cargar el historial de actividad.
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no hay actividad registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const meta = eventMeta(event.action);
                const Icon = meta.icon;

                return (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="font-medium">{meta.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {detailText(event)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserRoundCog className="h-3.5 w-3.5" />
                            {event.actor_email || "Usuario del sistema"}
                          </span>
                          {event.gym_name && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {event.gym_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left text-xs text-muted-foreground sm:text-right">
                      <p>
                        {new Date(event.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1">
                        {new Date(event.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
