import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, ShieldCheck, Globe2 } from "lucide-react";

export default async function ConfiguracionKivraPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Configuración Kivra</h1>
        <p className="mt-1 text-muted-foreground">
          Parámetros globales de la plataforma. Separados de la configuración de cada gimnasio.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="pt-3 text-lg">Identidad de plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Producto</span>
              <span className="font-medium">Kivra</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tagline</span>
              <span className="text-right font-medium">Gestión inteligente para gimnasios.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="pt-3 text-lg">Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El SuperAdmin opera sin gym_id y los administradores de gimnasio quedan aislados por tenant.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Globe2 className="h-5 w-5 text-primary" />
            <CardTitle className="pt-3 text-lg">Entorno</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La edición persistente de dominio, soporte, emails e integraciones globales todavía no está implementada.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
