import { getDashboardStats, getSession } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KpiSection } from "@/components/admin/kpi-section";

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // El superadmin administra la plataforma SaaS y no pertenece a un tenant.
  // Su entrada principal es la gestión global de gimnasios.
  if (session.role === "superadmin") {
    redirect("/admin/gimnasios");
  }

  if (session.role !== "admin" || session.gymId == null) {
    redirect("/login");
  }

  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Resumen general del gimnasio en tiempo real
        </p>
      </div>

      <KpiSection stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/admin/asistencias">
              <UserCheck className="w-4 h-4 mr-2" /> Control de Asistencias
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/miembros">
              <Users className="w-4 h-4 mr-2" /> Ver Miembros
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
