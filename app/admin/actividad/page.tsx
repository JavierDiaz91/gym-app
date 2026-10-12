import { getGymsAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Building2, ShieldCheck } from "lucide-react";

export default async function ActividadSaaSPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  const gymsResult = await getGymsAction();
  const gyms = gymsResult.success && Array.isArray(gymsResult.data) ? gymsResult.data : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Actividad</h1>
        <p className="mt-1 text-muted-foreground">
          Estado operativo actual de los tenants de la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actividad disponible
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gyms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay gimnasios registrados.</p>
          ) : (
            gyms.map((gym: any) => (
              <div key={gym.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{gym.name}</p>
                    <p className="text-xs text-muted-foreground">{gym.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{gym.status === "active" ? "Activo" : "Suspendido"}</span>
                </div>
              </div>
            ))
          )}

          <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            El historial de auditoría todavía no existe en base de datos. En una próxima etapa podremos registrar altas, suspensiones, cambios de plan y acciones administrativas.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
