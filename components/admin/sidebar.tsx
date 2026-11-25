"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
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
import { logoutUser } from "@/app/actions";

interface AdminSidebarProps {
  userRole?: string;
  userEmail?: string;
  gymName?: string;
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

export function AdminSidebar({ userRole = "admin", userEmail = "", gymName }: AdminSidebarProps) {
  const accountLabel = (userRole === "admin" ? gymName?.trim() : undefined) || userEmail.trim() || "Usuario";
  const initials = accountLabel.includes("@")
    ? accountLabel.slice(0, 2).toUpperCase()
    : accountLabel.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);

  async function handleLogout() {
    await logoutUser();
    router.push("/");
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  const navigation = (
    <aside className="w-full lg:w-64 shrink-0 border-r border-primary/10 bg-[#071827] text-slate-200 flex flex-col justify-between select-none min-h-full">
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
                    onClick={() => setOpen(false)}
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

      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 rounded-xl bg-[#0d2837]/70 border border-zinc-800/40 p-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white" title={accountLabel}>{accountLabel}</p>
            <p className="text-[10px] text-zinc-400">{userRole === "superadmin" ? "Superadministrador Kivra" : "Administrador del gimnasio"}</p>
          </div>
          <button type="button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={handleLogout} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
  return <>
    <div className="hidden lg:block shrink-0">{navigation}</div>
    <header className="relative z-40 flex w-full min-w-0 items-center gap-3 border-b border-white/10 bg-[#071827] px-4 py-3 text-white lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><button type="button" aria-label="Abrir menú" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-primary"><Menu className="size-6" /></button></SheetTrigger>
        <SheetContent side="left" className="w-[min(85vw,320px)] max-w-full gap-0 overflow-y-auto border-primary/10 bg-[#071827] p-0 text-white">
          <SheetTitle className="sr-only">Menú de Kivra</SheetTitle><SheetDescription className="sr-only">Navegación del panel de administración</SheetDescription>
          {navigation}
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1"><p className="font-bold text-primary">Kivra</p><p className="truncate text-xs text-slate-300">{accountLabel}</p></div>
    </header>
  </>;
}
