import { ShieldCheck, UserRoundCog, UserRound } from "lucide-react";

const roles = [
  {
    icon: ShieldCheck,
    title: "Administración",
    description: "Una visión completa del gimnasio para gestionar miembros, cobros, planes, clases, asistencia y equipo.",
    items: ["Dashboard operativo", "Membresías y pagos", "Gestión de entrenadores"],
  },
  {
    icon: UserRoundCog,
    title: "Entrenadores",
    description: "Herramientas enfocadas en el seguimiento de alumnos y la planificación del trabajo diario.",
    items: ["Alumnos vinculados", "Rutinas y asignaciones", "Seguimiento centralizado"],
  },
  {
    icon: UserRound,
    title: "Miembros",
    description: "Una experiencia simple para que cada socio vea su información sin depender de mensajes o papeles.",
    items: ["Estado de membresía", "Pagos e historial", "Rutinas y clases"],
  },
];

export function Pricing() {
  return (
    <section id="roles" className="border-t border-white/[0.06] bg-[#071320] py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Diseñado por rol</span>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Cada persona ve lo que necesita.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
            Kivra separa responsabilidades y accesos para mantener una operación clara, segura y fácil de usar.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {roles.map((role, index) => (
            <div
              key={role.title}
              className={`rounded-3xl border p-7 ${
                index === 0
                  ? "border-cyan-400/25 bg-cyan-400/[0.06]"
                  : "border-white/[0.07] bg-white/[0.025]"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <role.icon className="h-5 w-5 text-cyan-300" />
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-tight">{role.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-400">{role.description}</p>
              <div className="mt-7 space-y-3 border-t border-white/[0.07] pt-6">
                {role.items.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}