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
  Dumbbell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/app/actions";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/miembros", label: "Miembros", icon: Users },
  { href: "/admin/membresias", label: "Membresias", icon: CreditCard },
  { href: "/admin/clases", label: "Clases", icon: Calendar },
  { href: "/admin/entrenadores", label: "Entrenadores", icon: UserCheck },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/configuracion", label: "Configuracion", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/");
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span 
              className="font-bold text-lg block"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              FitZone
            </span>
            <span className="text-xs text-sidebar-foreground/60">Panel Admin</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesion
        </Button>
      </div>
    </aside>
  );
}
