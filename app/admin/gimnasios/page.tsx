import { getGymsAction, getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import AdminGymsClient from "./AdminGymsClient";

export default async function AdminGymsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Esta pantalla es exclusiva del superadmin global de Kivra.
  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const res = await getGymsAction();
  const gyms = res.success ? res.data : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Gestión de Gimnasios SaaS
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administrá los tenants activos y asigná sus cuentas principales.
          </p>
        </div>
      </div>

      <AdminGymsClient initialGyms={gyms} />
    </div>
  );
}
