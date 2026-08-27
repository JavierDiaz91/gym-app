"use client";

import { useState } from "react";
import { Building2, Plus, Search, ShieldCheck, Ban, Users, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { createGymAction, toggleGymStatusAction } from "@/app/actions";

export default function AdminGymsClient({ initialGyms }: { initialGyms: any[] }) {
  // Aseguramos que el estado inicial siempre sea un Array
  const [gyms, setGyms] = useState<any[]>(Array.isArray(initialGyms) ? initialGyms : []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPasswordHash: "",
  });

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().trim().replace(/[\s\W-]+/g, "-");
    setForm((prev) => ({ ...prev, name, slug }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Registrando gimnasio...");

    const res = await createGymAction(form);
    setIsSubmitting(false);

    if (res?.success) {
      toast.success("¡Gimnasio creado con éxito!", { id: toastId });
      setIsModalOpen(false);
      setForm({ name: "", slug: "", adminEmail: "", adminPasswordHash: "" });
      setGyms((prev) => [res.data.gym, ...prev]);
    } else {
      toast.error(res?.error || "Error al registrar gimnasio", { id: toastId });
    }
  };

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const res = await toggleGymStatusAction(id, newStatus);

    if (res?.success) {
      toast.success(`Gimnasio ${newStatus === "active" ? "activado" : "suspendido"}`);
      setGyms((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status: newStatus } : g))
      );
    } else {
      toast.error("Error al cambiar estado");
    }
  };

  // Filtrado seguro validando que gyms sea un Array y que g no sea undefined
  const filteredGyms = (Array.isArray(gyms) ? gyms : []).filter(
    (g) =>
      g?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g?.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda y Acción */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:border-[#00aeef]"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Gimnasio</span>
        </button>
      </div>

      {/* Tabla de Gimnasios */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="p-4">Gimnasio</th>
                <th className="p-4">Slug / Identificador</th>
                <th className="p-4 text-center">Alumnos</th>
                <th className="p-4 text-center">Entrenadores</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    No se encontraron gimnasios registrados.
                  </td>
                </tr>
              ) : (
                filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-bold text-foreground flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00aeef]/10 text-[#00aeef] border border-[#00aeef]/20 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      {gym.name}
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{gym.slug}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                        <Users className="w-3 h-3 text-[#00aeef]" />
                        {gym.total_members || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                        <Dumbbell className="w-3 h-3 text-amber-500" />
                        {gym.total_trainers || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          gym.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}
                      >
                        {gym.status === "active" ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleStatusToggle(gym.id, gym.status)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          gym.status === "active"
                            ? "text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                            : "text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                        }`}
                        title={gym.status === "active" ? "Suspender Gimnasio" : "Activar Gimnasio"}
                      >
                        {gym.status === "active" ? <Ban className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Alta de Nuevo Gimnasio</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nombre del Gimnasio</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: PowerGym Rafaela"
                  className="w-full mt-1 p-2 bg-secondary rounded-lg border border-border text-xs focus:outline-none focus:border-[#00aeef]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Slug (URL)</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={form.slug}
                  className="w-full mt-1 p-2 bg-secondary/40 text-muted-foreground rounded-lg border border-border text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email del Dueño (Admin Local)</label>
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="admin@powergym.com"
                  className="w-full mt-1 p-2 bg-secondary rounded-lg border border-border text-xs focus:outline-none focus:border-[#00aeef]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  value={form.adminPasswordHash}
                  onChange={(e) => setForm({ ...form, adminPasswordHash: e.target.value })}
                  placeholder="••••••••"
                  className="w-full mt-1 p-2 bg-secondary rounded-lg border border-border text-xs focus:outline-none focus:border-[#00aeef]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-secondary cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creando..." : "Crear Gimnasio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}