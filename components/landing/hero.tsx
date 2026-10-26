import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, CreditCard, Dumbbell, Users, CalendarCheck2 } from "lucide-react";

const metrics = [
  { label: "Miembros activos", value: "248", icon: Users },
  { label: "Cuotas al día", value: "91%", icon: CreditCard },
  { label: "Asistencias hoy", value: "73", icon: CalendarCheck2 },
];

export function Hero() {
  return (
    <section id="producto" className="relative overflow-hidden bg-[#071320] pt-18 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-96 w-96 rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute right-[8%] top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <div className="container relative mx-auto grid min-h-[760px] items-center gap-14 px-4 py-24 lg:grid-cols-[1.02fr_.98fr] lg:py-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Gestión inteligente para gimnasios
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
            Tu gimnasio.
            <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-[#00d5d0] bg-clip-text text-transparent">
              Todo conectado.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            Miembros, pagos, entrenamientos, clases y gestión en una sola plataforma. Más tiempo para lo importante: tus personas.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-xl bg-[#00d5d0] px-6 font-semibold text-[#071320] hover:bg-[#2ae8e2]" asChild>
              <Link href="/login">Comenzar ahora<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-xl border-cyan-400/35 bg-white/[0.03] px-6 text-white hover:bg-white/[0.07]" asChild>
              <Link href="#modulos">Explorar la plataforma</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
            {["Fácil de usar", "Todo en un solo lugar", "Soporte en español"].map((item) => (
              <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" />{item}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-sky-500/20 to-cyan-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1b2b]/95 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              <div><p className="text-xs text-zinc-500">Panel general</p><p className="mt-1 text-sm font-medium text-zinc-200">Resumen del gimnasio</p></div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10"><Dumbbell className="h-4 w-4 text-violet-300" /></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <metric.icon className="mb-4 h-4 w-4 text-zinc-500" />
                  <p className="text-2xl font-semibold tracking-tight text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{metric.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div><p className="text-sm font-medium text-zinc-200">Actividad semanal</p><p className="text-xs text-zinc-500">Asistencias registradas</p></div>
                <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">+12%</span>
              </div>
              <div className="flex h-36 items-end gap-2">
                {[42, 68, 54, 82, 72, 96, 64].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-700/45 to-cyan-400/90" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
