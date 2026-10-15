import { Button } from "@/components/ui/button";
import { ArrowRight, QrCode } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="border-t border-white/[0.06] bg-[#090b10] py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.12] via-white/[0.035] to-cyan-400/[0.05] px-6 py-14 sm:px-12 lg:px-16">
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Kivra</span>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Menos administración. Más control.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                Accedé a la plataforma o registrá tu cuenta de miembro desde el QR de tu gimnasio.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded-xl bg-white px-6 font-semibold text-zinc-950 hover:bg-zinc-200" asChild>
                <Link href="/login">
                  Iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-xl border-white/10 bg-transparent px-6 text-white hover:bg-white/[0.06]" asChild>
                <Link href="/registro">
                  <QrCode className="mr-2 h-4 w-4" />
                  Registro de miembro
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}