import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const roles = ["admin", "trainer", "member"] as const;

export default async function ModulesPage({ searchParams }: { searchParams: Promise<{ gym?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");
  const gyms = await sql`SELECT id, name FROM public.gyms ORDER BY name, id`;
  const params = await searchParams;
  const gym = gyms.find(g => String(g.id) === params.gym) ?? gyms[0];
  const rows = gym ? await sql`
    SELECT m.code, m.name, m.category, m.is_essential, r.role,
      public.kivra_gym_module_enabled(${gym.id}::integer, m.code, r.role) AS enabled
    FROM public.saas_modules m
    JOIN public.saas_module_roles r ON r.module_code = m.code
    ORDER BY m.sort_order, r.role
  ` : [];
  const modules = rows.filter((r, i) => rows.findIndex(x => x.code === r.code) === i);
  return (
    <section className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-black tracking-tight">Módulos y funcionalidades</h1>
        <p className="text-sm text-muted-foreground">Configuración de accesos por gimnasio y rol.</p>
      </header>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Seleccionar gimnasio</h2>
        <div className="flex flex-wrap gap-2">
          {gyms.map(g => <Link key={String(g.id)} href={`/admin/modulos?gym=${g.id}`} aria-current={g.id === gym?.id ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm ${g.id === gym?.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(g.name)}</Link>)}
        </div>
        {!gym && <p className="text-sm text-muted-foreground">No hay gimnasios registrados.</p>}
      </div>
      {gym && <>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">Vista de consulta. La edición se habilitará cuando las restricciones de acceso estén integradas y verificadas.</div>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40"><tr><th scope="col" className="p-3 text-left">Módulo</th>{["Gimnasio","Entrenador","Alumno"].map(label => <th key={label} scope="col" className="p-3 text-center">{label}</th>)}</tr></thead>
            <tbody>{modules.map(m => <tr key={String(m.code)} className="border-t border-border">
              <th scope="row" className="p-3 text-left font-medium">{String(m.name)}<span className="block text-xs text-muted-foreground">{String(m.category)}{m.is_essential ? " · Esencial" : ""}</span></th>
              {roles.map(role => { const cell = rows.find(r => r.code === m.code && r.role === role); return <td key={role} className="p-3 text-center">{cell ? <span className={cell.enabled ? "text-primary" : "text-muted-foreground"}>{m.is_essential ? "Esencial" : cell.enabled ? "Habilitado" : "Deshabilitado"}</span> : "—"}</td>; })}
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}
