"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  Dumbbell,
  Building2,
  DollarSign,
  CheckSquare,
  UsersRound,
  Boxes,
  Receipt,
  Activity,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/app/actions";

interface AdminSidebarProps {
  userRole?: string;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["superadmin", "admin"] },

  // Gestión global SaaS de Kivra.
  { href: "/admin/gimnasios", label: "Gimnasios", icon: Building2, roles: ["superadmin"] },
  { href: "/admin/clientes", label: "Clientes / Administradores", icon: UsersRound, roles: ["superadmin"] },
  { href: "/admin/planes-saas", label: "Planes SaaS", icon: Boxes, roles: ["superadmin"] },
  { href: "/admin/facturacion", label: "Facturación", icon: Receipt, roles: ["superadmin"] },
  { href: "/admin/actividad", label: "Actividad", icon: Activity, roles: ["superadmin"] },
  { href: "/admin/configuracion-kivra", label: "Configuración Kivra", icon: Settings2, roles: ["superadmin"] },

  // Funciones operativas de un gimnasio: requieren tenant (gym_id).
  { href: "/admin/miembros", label: "Miembros", icon: Users, roles: ["admin"] },
  { href: "/admin/pagos", label: "Pagos y Cobros", icon: DollarSign, roles: ["admin"] },
  { href: "/admin/mi-suscripcion", label: "Mi suscripción Kivra", icon: Receipt, roles: ["admin"] },
  { href: "/admin/asistencias", label: "Asistencias", icon: CheckSquare, roles: ["admin"] },
  { href: "/admin/membresias", label: "Membresías", icon: CreditCard, roles: ["admin"] },
  { href: "/admin/clases", label: "Clases", icon: Calendar, roles: ["admin"] },
  { href: "/admin/entrenadores", label: "Entrenadores", icon: UserCheck, roles: ["admin"] },
  { href: "/admin/categorias", label: "Categorías deportivas", icon: Dumbbell, roles: ["admin"] },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function AdminSidebar({ userRole = "admin" }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/");
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 border-r border-primary/10 bg-[#071827] text-slate-200 min-h-screen flex flex-col justify-between select-none">
      <div>
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
              <Dumbbell className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
            <div>
              <span
                className="font-bold text-lg leading-tight block tracking-wide text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Kivra
              </span>
              <span className="text-[11px] font-medium text-primary uppercase tracking-widest block">
                {userRole === "superadmin" ? "SuperAdmin SaaS" : "Panel Admin"}
              </span>
            </div>
          </Link>
        </div>

        <nav className="p-3">
          <ul className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
                    )}

                    <Icon
                      className={cn(
                        "w-4 h-4 transition-transform duration-200 group-hover:scale-110",
                        isActive
                          ? "text-primary"
                          : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="p-3 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-rose-300 hover:bg-destructive/10 transition-colors duration-200"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
