import { Users, CreditCard, CalendarCheck2, Dumbbell, ClipboardList, CalendarDays } from "lucide-react";

const modules = [
  { icon: Users, title: "Miembros", description: "Altas, perfiles, estados y membresías organizadas por gimnasio." },
  { icon: CreditCard, title: "Cobros", description: "Pagos, historial y renovaciones conectados con la membresía de cada socio." },
  { icon: CalendarCheck2, title: "Asistencia", description: "Registrá ingresos y consultá la actividad diaria desde un solo lugar." },
  { icon: CalendarDays, title: "Clases", description: "Gestioná programación, cupos y reservas sin depender de planillas externas." },
  { icon: Dumbbell, title: "Entrenadores", description: "Vinculá alumnos, asigná responsabilidades y mantené cada equipo ordenado." },
  { icon: ClipboardList, title: "Rutinas", description: "Creá, asigná y administrá planes de entrenamiento desde la plataforma." },
];

export function Services() {
  return (
    <section id="modulos" className="border-t border-white/[0.06] bg-[#081827] py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Una sola plataforma</span>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Todo lo que necesitás para operar mejor.
          </h2>
          <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
            Menos herramientas separadas, menos tareas repetidas y más visibilidad sobre lo que pasa en tu gimnasio.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.title} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-all hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-white/[0.04]">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/20 to-blue-400/[0.05]">
                <module.icon className="h-5 w-5 text-cyan-200" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}