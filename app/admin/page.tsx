import { getDashboardStats, getGymsAction, getSession } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Ban,
  Building2,
  Dumbbell,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KpiSection } from "@/components/admin/kpi-section";

function SuperAdminDashboard({ gyms }: { gyms: any[] }) {
  const safeGyms = Array.isArray(gyms) ? gyms : [];

  const totalGyms = safeGyms.length;
  const activeGyms = safeGyms.filter((gym) => gym?.status === "active").length;
  const suspendedGyms = safeGyms.filter((gym) => gym?.status === "suspended").length;
  const totalMembers = safeGyms.reduce(
    (sum, gym) => sum + Number(gym?.total_members || 0),
    0
  );
  const totalTrainers = safeGyms.reduce(
    (sum, gym) => sum + Number(gym?.total_trainers || 0),
    0
  );

  const recentGyms = safeGyms.slice(0, 5);

  const metrics = [
    {
      label: "Gimnasios",
      value: totalGyms,
      helper: "Tenants registrados",
      icon: Building2,
    },
    {
      label: "Activos",
      value: activeGyms,
      helper: "Operando normalmente",
      icon: ShieldCheck,
    },
    {
      label: "Suspendidos",
      value: suspendedGyms,
      helper: "Requieren revisión",
      icon: Ban,
    },
    {
      label: "Miembros",
      value: totalMembers,
      helper: "En toda la plataforma",
      icon: Users,
    },
    {
      label: "Entrenadores",
      value: totalTrainers,
      helper: "En todos los gimnasios",
      icon: Dumbbell,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Kivra SaaS
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Dashboard SuperAdmin
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vista global de los gimnasios y usuarios que operan en la plataforma.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/gimnasios">
            <Building2 className="mr-2 h-4 w-4" />
            Gestionar gimnasios
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="border-border/70 bg-card/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Gimnasios registrados</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumen operativo de los tenants de Kivra.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/gimnasios">Ver todos</Link>
          </Button>
        </CardHeader>

        <CardContent>
          {recentGyms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no hay gimnasios registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Gimnasio</th>
                    <th className="pb-3 font-medium">Miembros</th>
                    <th className="pb-3 font-medium">Entrenadores</th>
                    <th className="pb-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentGyms.map((gym) => (
                    <tr key={gym.id}>
                      <td className="py-4">
                        <p className="font-medium text-foreground">{gym.name}</p>
                        <p className="text-xs text-muted-foreground">{gym.slug}</p>
                      </td>
                      <td className="py-4">{Number(gym.total_members || 0)}</td>
                      <td className="py-4">{Number(gym.total_trainers || 0)}</td>
                      <td className="py-4">
                        <span
                          className={
                            gym.status === "active"
                              ? "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500"
                              : "inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-500"
                          }
                        >
                          {gym.status === "active" ? "Activo" : "Suspendido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "superadmin") {
    const gymsResult = await getGymsAction();
    const gyms = gymsResult.success ? gymsResult.data : [];

    return <SuperAdminDashboard gyms={gyms} />;
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
              <UserCheck className="mr-2 h-4 w-4" /> Control de Asistencias
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/miembros">
              <Users className="mr-2 h-4 w-4" /> Ver Miembros
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
