"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { createSaaSPlanAction, updateSaaSPlanAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanStatus = "draft" | "active" | "archived";

type SaaSPlan = {
  id: number;
  name: string;
  description: string | null;
  monthly_price: number | string | null;
  max_members: number | null;
  max_trainers: number | null;
  status: PlanStatus;
};

type PlanForm = {
  name: string;
  description: string;
  monthlyPrice: string;
  maxMembers: string;
  maxTrainers: string;
  status: PlanStatus;
};

const emptyForm: PlanForm = {
  name: "",
  description: "",
  monthlyPrice: "",
  maxMembers: "",
  maxTrainers: "",
  status: "draft",
};

function toForm(plan: SaaSPlan): PlanForm {
  return {
    name: plan.name,
    description: plan.description || "",
    monthlyPrice: plan.monthly_price == null ? "" : String(plan.monthly_price),
    maxMembers: plan.max_members == null ? "" : String(plan.max_members),
    maxTrainers: plan.max_trainers == null ? "" : String(plan.max_trainers),
    status: plan.status,
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function StatusBadge({ status }: { status: PlanStatus }) {
  if (status === "active") {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Activo</Badge>;
  }

  if (status === "archived") {
    return <Badge className="border-zinc-500/20 bg-zinc-500/10 text-zinc-400">Archivado</Badge>;
  }

  return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-500">Borrador</Badge>;
}

export default function SaaSPlansClient({ initialPlans }: { initialPlans: SaaSPlan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<SaaSPlan[]>(initialPlans);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(
    () => plans.filter((plan) => plan.status === "active").length,
    [plans]
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsCreating(true);
  }

  function startEdit(plan: SaaSPlan) {
    setIsCreating(false);
    setEditingId(plan.id);
    setForm(toForm(plan));
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setForm(emptyForm);
  }

  async function savePlan() {
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      monthlyPrice: parseOptionalNumber(form.monthlyPrice),
      maxMembers: parseOptionalNumber(form.maxMembers),
      maxTrainers: parseOptionalNumber(form.maxTrainers),
      status: form.status,
    };

    const result = isCreating
      ? await createSaaSPlanAction(payload)
      : await updateSaaSPlanAction(editingId as number, payload);

    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "No se pudo guardar el plan.");
      return;
    }

    const saved = result.data as SaaSPlan;

    if (isCreating) {
      setPlans((current) => [...current, saved].sort((a, b) => a.id - b.id));
    } else {
      setPlans((current) => current.map((plan) => (plan.id === saved.id ? saved : plan)));
    }

    toast.success(isCreating ? "Plan creado." : "Plan actualizado.");
    cancelEdit();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Planes totales</p>
            <p className="mt-3 text-3xl font-bold">{plans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="mt-3 text-3xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">En borrador</p>
            <p className="mt-3 text-3xl font-bold">
              {plans.filter((plan) => plan.status === "draft").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={startCreate} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      {isCreating && (
        <PlanEditor
          title="Nuevo plan SaaS"
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={savePlan}
          onCancel={cancelEdit}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) =>
          editingId === plan.id ? (
            <PlanEditor
              key={plan.id}
              title={`Editar ${plan.name}`}
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={savePlan}
              onCancel={cancelEdit}
            />
          ) : (
            <Card key={plan.id} className="border-border/70">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <StatusBadge status={plan.status} />
                </div>

                <CardTitle className="pt-3">{plan.name}</CardTitle>
                <p className="min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description || "Sin descripción"}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Precio mensual</p>
                    <p className="mt-1 font-semibold">
                      {plan.monthly_price == null
                        ? "Sin definir"
                        : `$${Number(plan.monthly_price).toLocaleString("es-AR")}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Miembros</p>
                    <p className="mt-1 font-semibold">
                      {plan.max_members == null ? "Sin límite" : plan.max_members}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Entrenadores</p>
                    <p className="mt-1 font-semibold">
                      {plan.max_trainers == null ? "Sin límite" : plan.max_trainers}
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => startEdit(plan)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar plan
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

function PlanEditor({
  title,
  form,
  setForm,
  saving,
  onSave,
  onCancel,
}: {
  title: string;
  form: PlanForm;
  setForm: React.Dispatch<React.SetStateAction<PlanForm>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Ej: Profesional"
          />
        </div>

        <div className="space-y-2">
          <Label>Descripción</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Descripción breve del plan"
          />
        </div>

        <div className="space-y-2">
          <Label>Precio mensual</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.monthlyPrice}
            onChange={(e) => setForm((current) => ({ ...current, monthlyPrice: e.target.value }))}
            placeholder="Sin definir"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Máx. miembros</Label>
            <Input
              type="number"
              min="0"
              value={form.maxMembers}
              onChange={(e) => setForm((current) => ({ ...current, maxMembers: e.target.value }))}
              placeholder="Sin límite"
            />
          </div>
          <div className="space-y-2">
            <Label>Máx. entrenadores</Label>
            <Input
              type="number"
              min="0"
              value={form.maxTrainers}
              onChange={(e) => setForm((current) => ({ ...current, maxTrainers: e.target.value }))}
              placeholder="Sin límite"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((current) => ({ ...current, status: e.target.value as PlanStatus }))
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="archived">Archivado</option>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} disabled={saving || !form.name.trim()} className="flex-1">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
