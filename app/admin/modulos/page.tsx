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
  async function saveClasses(formData: FormData) {
    "use server";
    const actor = await getSession();
    if (!actor || actor.role !== "superadmin") throw new Error("Sin permisos");
    const gymId = Number(formData.get("gym"));
    if (!Number.isSafeInteger(gymId) || gymId <= 0) throw new Error("Gimnasio inválido");
    const values = roles.map(role => formData.get(role));
    if (values.some(value => value !== "true" && value !== "false")) throw new Error("Configuración inválida");
    await sql`SELECT public.kivra_set_gym_module(${gymId}::integer, 'classes', 'admin', ${values[0] === "true"}::boolean, ${actor.id}::integer),
      public.kivra_set_gym_module(${gymId}::integer, 'classes', 'trainer', ${values[1] === "true"}::boolean, ${actor.id}::integer),
      public.kivra_set_gym_module(${gymId}::integer, 'classes', 'member', ${values[2] === "true"}::boolean, ${actor.id}::integer)`;
    revalidatePath("/admin", "layout");
    revalidatePath("/trainer", "layout");
    revalidatePath("/miembro", "layout");
    redirect(`/admin/modulos?gym=${gymId}&saved=1`);
  }
  const modules = rows.filter((r, i) => rows.findIndex(x => x.code === r.code) === i);
  return (
    <section className="space-y-6">
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
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">Configuración piloto: Clases y reservas. Los demás módulos permanecen en consulta.</div>
        {params.saved === "1" && <p role="status" className="text-sm text-primary">Configuración guardada correctamente.</p>}
        <form action={saveClasses} className="space-y-4">
        <input type="hidden" name="gym" value={String(gym.id)} />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-border p-3">Módulos <strong className="block text-xl">{modules.length}</strong></div>
          <div className="rounded-lg border border-border p-3">Accesos activos <strong className="block text-xl">{rows.filter(r => r.enabled).length}</strong></div>
          <div className="rounded-lg border border-border p-3">Esenciales <strong className="block text-xl">{modules.filter(r => r.is_essential).length}</strong></div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40"><tr><th scope="col" className="p-3 text-left">Módulo</th>{["Gimnasio","Entrenador","Alumno"].map(label => <th key={label} scope="col" className="p-3 text-center">{label}</th>)}</tr></thead>
            <tbody>{modules.map(m => <tr key={String(m.code)} className="border-t border-border">
              <th scope="row" className="p-3 text-left font-medium">{String(m.name)}<span className="block text-xs text-muted-foreground">{String(m.category)}{m.is_essential ? " · Esencial" : ""}</span></th>
              {roles.map(role => { const cell = rows.find(r => r.code === m.code && r.role === role); return <td key={role} className="p-3 text-center">{cell ? m.is_essential ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="size-3" /> Esencial</span> : m.code === "classes" ? <select key={String(gym.id)+role+String(cell.enabled)} name={role} aria-label={`Clases: ${role}`} defaultValue={String(cell.enabled)} className="rounded-md border border-primary/40 bg-background px-2 py-2 text-sm"><option value="true">Habilitado</option><option value="false">Deshabilitado</option></select> : <span className="text-muted-foreground">{cell.enabled ? "Habilitado" : "Deshabilitado"}</span> : "—"}</td>; })}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2"><button type="reset" className="rounded-lg border border-border px-4 py-2 text-sm">Restablecer</button><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></div>
        </form>
      </>}
    </section>
  );
}
