import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, CheckCircle2 } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Para gimnasios pequeños que están comenzando a digitalizar su gestión.",
    status: "Diseño",
    features: ["Gestión de miembros", "Membresías", "Asistencias", "Panel administrativo"],
  },
  {
    name: "Profesional",
    description: "Para gimnasios con mayor operación y equipos de trabajo.",
    status: "Diseño",
    features: ["Todo Starter", "Entrenadores", "Clases", "Rutinas", "Reportes"],
  },
  {
    name: "Enterprise",
    description: "Para operaciones con necesidades avanzadas o múltiples sedes.",
    status: "Diseño",
    features: ["Todo Profesional", "Mayor escala", "Soporte prioritario", "Configuración avanzada"],
  },
];

export default async function PlanesSaaSPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Planes SaaS</h1>
        <p className="mt-1 text-muted-foreground">
          Estructura comercial que Kivra ofrecerá a los gimnasios.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
        Los planes todavía no están persistidos en base de datos. Esta pantalla define la estructura inicial sin inventar precios ni condiciones comerciales.
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className="border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Boxes className="h-5 w-5" />
                </div>
                <Badge variant="outline">{plan.status}</Badge>
              </div>
              <CardTitle className="pt-3">{plan.name}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {feature}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
