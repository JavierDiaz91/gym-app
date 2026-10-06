"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { PauseCircle, UserCheck, Trash2, Pencil, CreditCard } from "lucide-react";
import {
  updateMemberStatusAction,
  deleteMemberAction,
  updateMemberAction,
  assignMembershipAction,
} from "@/app/actions";
import type { Member } from "@/app/types/member";

interface MembershipOption {
  id: number;
  name: string;
  price: number;
}

interface MemberActionsProps {
  member: Member;
  memberships?: MembershipOption[];
}

export function MemberActions({ member, memberships: initialMemberships = [] }: MemberActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [membershipsList, setMembershipsList] = useState<MembershipOption[]>(initialMemberships);

  const [formData, setFormData] = useState({
    first_name: member.first_name || "",
    last_name: member.last_name || "",
    email: member.email || "",
    phone: member.phone || "",
    membership_id: member.membership_id?.toString() || "",
  });

  useEffect(() => {
  if (isOpen) {
    const fetchMemberships = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
        
        // 1. Declaramos la variable extrayendo gym_id del objeto member (o fallback a 1)
        const gymId = (member as any).gym_id || 1;

        // 2. Realizamos el fetch con la subruta /plans y la query param gymId
        const res = await fetch(`${API_BASE_URL}/memberships/plans?gymId=${gymId}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setMembershipsList(data);
        } else if (data.success && Array.isArray(data.plan)) {
          setMembershipsList(data.plan);
        } else if (data.success && Array.isArray(data.data)) {
          setMembershipsList(data.data);
        } else {
          console.error("Estructura de respuesta no esperada:", data);
        }
      } catch (error) {
        console.error("Error al obtener membresías:", error);
      }
    };

    fetchMemberships();
  }
}, [isOpen, member]);

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateMemberStatusAction(member.id, newStatus);
      if (res?.success) {
        router.refresh();
      } else {
        alert(res?.error || "Error al cambiar estado");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("¿Estás seguro de que querés eliminar a este miembro?")) return;

    startTransition(async () => {
      const res = await deleteMemberAction(member.id);
      if (res?.success) {
        router.push("/admin/miembros");
        router.refresh();
      } else {
        alert(res?.error || "Error al eliminar miembro");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      // 1. Guardar todos los datos (personales + membresía) en una sola Server Action
      const res = await updateMemberAction(member.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        plan_id: formData.membership_id ? Number(formData.membership_id) : undefined,
      });

      if (res?.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert(res?.error || "Error al guardar cambios");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Modal Editar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar datos del miembro</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {/* Selector de Membresía */}
              <div className="grid gap-2">
                <Label htmlFor="membership_id" className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-500" /> Plan / Membresía
                </Label>
                <select
                  id="membership_id"
                  value={formData.membership_id}
                  onChange={(e) =>
                    setFormData({ ...formData, membership_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sin membresía activa</option>
                  {membershipsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (${m.price})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suspender / Reactivar */}
      {member.status === "active" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange("suspended")}
          className="text-amber-600 border-amber-200 hover:bg-amber-50"
        >
          <PauseCircle className="w-4 h-4 mr-1.5" /> Suspender
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange("active")}
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        >
          <UserCheck className="w-4 h-4 mr-1.5" /> Reactivar
        </Button>
      )}

      {/* Eliminar */}
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
      </Button>
    </div>
  );
}