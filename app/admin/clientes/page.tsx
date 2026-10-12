import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, ShieldCheck, UsersRound } from "lucide-react";

export default async function ClientesAdministradoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  const admins = await sql`
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.updated_at,
      u.gym_id,
      g.name AS gym_name,
      g.status AS gym_status
    FROM users u
    LEFT JOIN gyms g ON g.id = u.gym_id
    WHERE u.role = 'admin'
    ORDER BY u.created_at DESC
  `;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Clientes / Administradores</h1>
        <p className="mt-1 text-muted-foreground">
          Cuentas administradoras asociadas a cada gimnasio de la plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <UsersRound className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">{admins.length}</p>
            <p className="text-sm text-muted-foreground">Administradores registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Building2 className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">
              {new Set(admins.map((a: any) => a.gym_id).filter(Boolean)).size}
            </p>
            <p className="text-sm text-muted-foreground">Gimnasios con administrador</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold">
              {admins.filter((a: any) => a.gym_status === "active").length}
            </p>
            <p className="text-sm text-muted-foreground">Admins en gimnasios activos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administradores por gimnasio</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay administradores registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3">Administrador</th>
                    <th className="pb-3">Gimnasio</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {admins.map((admin: any) => (
                    <tr key={admin.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{admin.email}</span>
                        </div>
                      </td>
                      <td className="py-4">{admin.gym_name || "Sin gimnasio asociado"}</td>
                      <td className="py-4">
                        <Badge variant="outline">
                          {admin.gym_status === "active"
                            ? "Activo"
                            : admin.gym_status === "suspended"
                            ? "Suspendido"
                            : "Sin tenant"}
                        </Badge>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {admin.created_at
                          ? new Date(admin.created_at).toLocaleDateString("es-AR")
                          : "-"}
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
