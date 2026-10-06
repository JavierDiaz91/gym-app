"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Dumbbell, 
  History, 
  User, 
  LogOut, 
  Activity, 
  Menu,
  X 
} from "lucide-react";
import { logoutUser } from "@/app/actions";

interface MemberSidebarProps {
  user?: {
    name?: string;
    email?: string;
  };
}

const navigation = [
  { name: "Mi Rutina", href: "/miembro", icon: Dumbbell },
  { name: "Historial", href: "/miembro/historial", icon: History },
  { name: "Mi Perfil", href: "/miembro/perfil", icon: User },
];

export default function MemberSidebar({ user }: MemberSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
    router.refresh();
  }

  // Nombre de usuario dinámico con fallback a "Javier Diaz" si la propiedad viene vacía
  const userName =
    user?.name && user.name !== "Alumno" ? user.name : "Javier Diaz";

  // Genera "JD" a partir de las iniciales del nombre
  const initials = userName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Header Celulares */}
      <header className="md:hidden bg-zinc-950 text-zinc-300 p-4 flex items-center justify-between border-b border-zinc-800/80 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-none tracking-tight">
              PulseFit
            </h1>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
              Member App
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-zinc-400 hover:text-white rounded-lg focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Menú Lateral Alumno */}
      <aside
        className={`bg-zinc-950 text-zinc-300 flex flex-col justify-between border-r border-zinc-800/80 select-none shrink-0 z-50 transition-transform duration-300 ease-in-out ${
          "fixed top-0 left-0 bottom-0 w-64 shadow-xl md:shadow-none"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          "md:static md:min-h-screen"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center justify-between border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base leading-none tracking-tight">
                  PulseFit
                </h1>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Member App
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-medium">
              MEMBER
            </span>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Menú Alumno
            </p>

            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/miembro"
                  ? pathname === "/miembro"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-cyan-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile / Logout */}
        <div className="p-4 border-t border-zinc-800/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                {initials}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white leading-tight truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-zinc-400">Atleta</span>
              </div>
            </div>

            <button
              title="Cerrar sesión"
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}