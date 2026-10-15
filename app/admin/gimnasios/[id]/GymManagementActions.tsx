"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { assignGymSaaSPlanAction, scheduleGymSaaSPlanChangeAction, toggleGymStatusAction } from "@/app/actions";

type Plan = { id: number; name: string; status: string };
export default function GymManagementActions({
  gymId, gymName, status, planId, pendingPlanId, pendingEffectiveDate, plans,
}: {
  gymId: number;
  gymName: string;
  status: string;
  planId: number | null;
  pendingPlanId: number | null;
  pendingEffectiveDate: string | null;
  plans: Plan[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(String(planId ?? ""));
  const activePlans = plans.filter((plan) => plan.status === "active");

  async function changeStatus() {
    const next = status === "active" ? "suspended" : "active";
    const verb = next === "suspended" ? "suspender" : "reactivar";
    if (!window.confirm(`¿Confirmás que querés ${verb} "${gymName}"? La suscripción y las facturas no se modificarán.`)) return;
    setBusy(true);
    try {
      const result = await toggleGymStatusAction(gymId, next);
      if (!result.success) { toast.error(result.error || "No se pudo actualizar el gimnasio."); return; }
      toast.success(next === "active" ? "Gimnasio reactivado" : "Gimnasio suspendido");
      router.refresh();
    } catch { toast.error("Error al actualizar el gimnasio."); }
    finally { setBusy(false); }
  }

  async function changePlan() {
    const id = Number(selectedPlan);
    if (!Number.isSafeInteger(id) || id <= 0 || id === planId) return;
    const plan = activePlans.find((p) => p.id === id);
    if (pendingPlanId) { toast.error("Ya existe un cambio de plan programado."); return; }
    if (!plan || !window.confirm(`¿Asignar el plan "${plan.name}" a "${gymName}"? Esta operación puede modificar el período y el importe de futuras facturas.`)) return;
    setBusy(true);
    try {
      const result = planId ? await scheduleGymSaaSPlanChangeAction(gymId, id) : await assignGymSaaSPlanAction(gymId, id, "active");
      if (!result.success) { toast.error(result.error || "No se pudo cambiar el plan."); return; }
      toast.success(planId ? "Cambio de plan programado" : "Plan SaaS asignado");
      router.refresh();
    } catch { toast.error("Error al cambiar el plan."); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-semibold">Gestión del gimnasio</h2>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={changeStatus} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50">
          {status === "active" ? <Ban className="h-4 w-4 text-rose-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
          {status === "active" ? "Suspender gimnasio" : "Reactivar gimnasio"}
        </button>
        <Link href="/admin/facturacion" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
          <CreditCard className="h-4 w-4" /> Ir a facturación
        </Link>
        <Link href={`/admin/clientes?gym_id=${gymId}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
          <CheckCircle2 className="h-4 w-4" /> Ver administradores
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <label className="space-y-2 text-sm">
          <span className="block text-muted-foreground">Plan SaaS</span>
          <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} disabled={busy || activePlans.length === 0} className="min-w-48 rounded-lg border border-border bg-background px-3 py-2">
            <option value="">Sin plan asignado</option>
            {activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <button onClick={changePlan} disabled={busy || !!pendingPlanId || !selectedPlan || Number(selectedPlan) === planId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {planId ? "Programar cambio de plan" : "Asignar plan"}
        </button>
      </div>
      {pendingPlanId && <p className="text-sm text-amber-500">Cambio pendiente: {activePlans.find((p) => p.id === pendingPlanId)?.name || `Plan #${pendingPlanId}`} · Vigencia prevista: {pendingEffectiveDate || "próximo período"}</p>}
      <p className="text-xs text-muted-foreground">Las operaciones requieren confirmación y utilizan las acciones protegidas del SuperAdmin.</p>
    </div>
  );
}
