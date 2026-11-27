import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

const roles = ["admin", "trainer", "member"] as const;

export default async function ModulesPage({ searchParams }: { searchParams: Promise<{ gym?: string; saved?: string }> }) {
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
  async function saveModules(formData: FormData) {
    "use server";
    const actor = await getSession();
    if (!actor || actor.role !== "superadmin") throw new Error("Sin permisos");
    const gymId = Number(formData.get("gym"));
    if (!Number.isSafeInteger(gymId) || gymId <= 0) throw new Error("Gimnasio inválido");
    const editable = await sql`SELECT r.module_code, r.role FROM public.saas_module_roles r JOIN public.saas_modules m ON m.code = r.module_code WHERE NOT m.is_essential`;
    const changes = editable.map(row => ({ module_code: String(row.module_code), role: String(row.role), enabled: formData.get(`${row.module_code}:${row.role}`) === "true" }));
    for (const row of editable) {
      const values = formData.getAll(`${row.module_code}:${row.role}`);
      if (values.length > 1 || values.some(value => value !== "true")) throw new Error("Configuración inválida");
    }
    await sql`SELECT public.kivra_set_gym_module(${gymId}::integer, x.module_code, x.role, x.enabled, ${actor.id}::integer)
      FROM jsonb_to_recordset(${JSON.stringify(changes)}::jsonb) AS x(module_code text, role text, enabled boolean)`;
    revalidatePath("/admin", "layout");
    revalidatePath("/trainer", "layout");
    revalidatePath("/miembro", "layout");
    redirect(`/admin/modulos?gym=${gymId}&saved=1`);
  }
  const modules = rows.filter((r, i) => rows.findIndex(x => x.code === r.code) === i);
  return (
    <section className="space-y-4 pb-24">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-black tracking-tight">Módulos y funcionalidades</h1>
        <p className="text-sm text-muted-foreground">Configuración de accesos por gimnasio y rol.</p>
      </header>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Seleccionar gimnasio</h2>
        <form method="get" className="flex flex-wrap gap-2">
          <select name="gym" defaultValue={String(gym?.id ?? "")} aria-label="Gimnasio" className="min-w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {gyms.map(g => <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>)}
          </select>
          <button className="rounded-lg border border-primary px-4 py-2 text-sm text-primary">Seleccionar</button>
        </form>
        {!gym && <p className="text-sm text-muted-foreground">No hay gimnasios registrados.</p>}
      </div>
      {gym && <>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">Configuración de módulos por rol. Los módulos esenciales permanecen protegidos.</div>
        {params.saved === "1" && <p role="status" className="text-sm text-primary">Configuración guardada correctamente.</p>}
        <form action={saveModules} className="space-y-4">
        <input type="hidden" name="gym" value={String(gym.id)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-border p-3">Módulos <strong className="block text-xl">{modules.length}</strong></div>
          <div className="rounded-lg border border-border p-3">Accesos activos <strong className="block text-xl">{rows.filter(r => r.enabled).length}</strong></div>
          <div className="rounded-lg border border-border p-3">Esenciales <strong className="block text-xl">{modules.filter(r => r.is_essential).length}</strong></div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40"><tr><th scope="col" className="p-3 text-left">Módulo</th>{["Gimnasio","Entrenador","Alumno"].map(label => <th key={label} scope="col" className="px-3 py-2 text-center">{label}</th>)}</tr></thead>
            <tbody>{modules.map(m => <tr key={String(m.code)} className="border-t border-border">
              <th scope="row" className="px-3 py-2 text-left font-medium">{String(m.name)}<span className="block text-xs text-muted-foreground">{String(m.category)}{m.is_essential ? " · Esencial" : ""}</span></th>
              {roles.map(role => { const cell = rows.find(r => r.code === m.code && r.role === role); const editable = !m.is_essential; return <td key={role} className="px-3 py-2 text-center">{cell ? m.is_essential ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="size-3" /> Esencial</span> : <label className={`inline-flex items-center gap-2 whitespace-nowrap ${editable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`} title={editable ? undefined : "Integración de permisos pendiente"}>
                <input key={String(gym.id)+role+String(cell.enabled)} type="checkbox" role="switch" name={editable ? `${m.code}:${role}` : undefined} disabled={!editable} value="true" defaultChecked={cell.enabled === true} aria-label={`${m.name}: ${role}`} className="peer sr-only" />
                <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full border border-border bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-transform peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-5 peer-checked:after:bg-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2" />
                <span className="text-xs text-muted-foreground peer-checked:hidden">Deshabilitado</span><span className="hidden text-xs font-medium text-primary peer-checked:inline">Habilitado</span>
              </label> : "—"}</td>; })}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card p-3 pr-16 shadow-lg"><span className="mr-auto text-xs text-muted-foreground">Los cambios se aplican al gimnasio seleccionado.</span><button type="reset" className="rounded-lg border border-border px-4 py-2 text-sm">Restablecer</button><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></div>
        </form>
      </>}
    </section>
  );
}
