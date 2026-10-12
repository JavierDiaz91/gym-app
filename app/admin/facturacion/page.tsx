import { getGymsAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, CircleDollarSign } from "lucide-react";

export default async function FacturacionSaaSPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  const gymsResult = await getGymsAction();
  const gyms = gymsResult.success && Array.isArray(gymsResult.data) ? gymsResult.data : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="mt-1 text-muted-foreground">
          Control de suscripciones y cobros de los gimnasios hacia Kivra.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <Building2 className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">{gyms.length}</p>
            <p className="text-sm text-muted-foreground">Clientes potencialmente facturables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">—</p>
            <p className="text-sm text-muted-foreground">Ingresos SaaS todavía no implementados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Estado de facturación SaaS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">Módulo preparado para la siguiente etapa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Falta definir y crear el modelo de suscripciones SaaS, precios, vencimientos y comprobantes antes de mostrar datos reales.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
