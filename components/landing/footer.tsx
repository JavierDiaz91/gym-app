import Link from "next/link";
import { Activity, Dumbbell } from "lucide-react";

export function Footer() {
  return (
    <footer id="contacto" className="border-t border-white/[0.06] bg-[#071320] py-12 text-zinc-400">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:items-start">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-400 bg-[#081827] shadow-[0_0_18px_rgba(0,213,208,0.20)]">
                <Dumbbell className="absolute h-6 w-6 text-cyan-400 opacity-80" strokeWidth={1.6} />
                <Activity className="relative h-4 w-4 text-white" strokeWidth={2.6} />
              </div>
              <span className="text-lg font-semibold tracking-[-0.03em] text-white">kivra<span className="text-cyan-400">.</span></span>
            </Link>
            <p className="mt-4 text-sm leading-6">
              Gestión inteligente para gimnasios. Una plataforma para administrar la operación diaria con claridad.
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Producto</p>
            <div className="grid gap-3 text-sm">
              <Link href="#modulos" className="transition-colors hover:text-white">Módulos</Link>
              <Link href="#roles" className="transition-colors hover:text-white">Roles</Link>
              <Link href="/login" className="transition-colors hover:text-white">Iniciar sesión</Link>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Miembros</p>
            <div className="grid gap-3 text-sm">
              <Link href="/registro" className="transition-colors hover:text-white">Registro por QR</Link>
              <Link href="/login" className="transition-colors hover:text-white">Acceso</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Kivra. Gestión inteligente para gimnasios.</p>
          <p className="text-zinc-500">Plataforma SaaS multi-gimnasio</p>
        </div>
      </div>
    </footer>
  );
}