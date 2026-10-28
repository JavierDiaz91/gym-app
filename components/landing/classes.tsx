import { BadgeCheck, Building2, Layers3, LockKeyhole } from "lucide-react";

const principles = [
  {
    icon: Building2,
    number: "01",
    title: "Multi-gimnasio",
    description: "La información queda separada por gimnasio para mantener cada operación aislada.",
  },
  {
    icon: LockKeyhole,
    number: "02",
    title: "Accesos por rol",
    description: "Administradores, entrenadores y miembros trabajan con permisos acordes a su función.",
  },
  {
    icon: Layers3,
    number: "03",
    title: "Datos conectados",
    description: "Membresías, pagos, asistencia y rutinas comparten el mismo contexto operativo.",
  },
  {
    icon: BadgeCheck,
    number: "04",
    title: "Menos fricción",
    description: "Los procesos cotidianos se resuelven desde una interfaz consistente y centralizada.",
  },
];

export function Classes() {
  return (
    <section className="border-t border-white/[0.06] bg-[#081827] py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Pensado para escalar</span>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Una base ordenada para crecer.
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Kivra no es la página de un gimnasio. Es una plataforma diseñada para acompañar operaciones con distintos usuarios, roles y gimnasios.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {principles.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                    <item.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <span className="text-xs font-semibold tracking-[0.16em] text-zinc-500">{item.number}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}