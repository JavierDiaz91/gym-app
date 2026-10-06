"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { 
  createPlanAction, 
  getPlansAction, 
  updatePlanAction, 
  deletePlanAction 
} from "@/app/actions";

interface Plan {
  id: number;
  name: string;
  price: number;
  duration_months: number;
  description?: string;
  is_active: boolean;
}

export default function MembresiasAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    const plansData = await getPlansAction();
    if (Array.isArray(plansData)) setPlans(plansData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setShowModal(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      let res;
      if (editingPlan) {
        res = await updatePlanAction(editingPlan.id, formData);
      } else {
        res = await createPlanAction(formData);
      }

      if (res?.success) {
        setShowModal(false);
        setEditingPlan(null);
        loadData();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("¿Querés desactivar este plan?")) return;

    startTransition(async () => {
      const res = await deletePlanAction(id);
      if (res?.success) {
        loadData();
      }
    });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membresías</h1>
          <p className="text-muted-foreground">
            Gestioná los planes y suscripciones de tu gimnasio
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Planes */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planes de Membresía</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-6">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando planes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? "opacity-60 bg-slate-50" : ""}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-2xl font-bold mt-2">
                      ${Number(plan.price).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenEdit(plan)}
                      className="text-slate-600 hover:text-cyan-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(plan.id)}
                      className="text-slate-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 mb-3">{plan.description || "Sin descripción"}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline">
                      {plan.duration_months} {plan.duration_months === 1 ? "mes" : "meses"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Unificado (Crear / Editar) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              {editingPlan ? "Editar Plan" : "Crear Nuevo Plan"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre del Plan</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingPlan?.name || ""}
                  placeholder="Ej: Pase Libre Mensual"
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Precio ($)</label>
                <input
                  name="price"
                  type="number"
                  required
                  defaultValue={editingPlan?.price || ""}
                  placeholder="15000"
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Duración (Meses)</label>
                <input
                  name="durationMonths"
                  type="number"
                  defaultValue={editingPlan?.duration_months || 1}
                  required
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingPlan?.description || ""}
                  placeholder="Detalles de la membresía..."
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {editingPlan && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Estado</label>
                  <select
                    name="isActive"
                    defaultValue={editingPlan.is_active ? "true" : "false"}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isPending ? "Guardando..." : editingPlan ? "Guardar Cambios" : "Crear Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}