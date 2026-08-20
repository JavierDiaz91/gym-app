import { Dumbbell, Users, Timer, Heart, Trophy, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Dumbbell,
    title: "Equipos Premium",
    description: "Máquinas de última generación y pesas libres para todos los niveles.",
  },
  {
    icon: Users,
    title: "Clases Grupales",
    description: "Yoga, spinning, crossfit, zumba y más de 20 clases diferentes.",
  },
  {
    icon: Timer,
    title: "Entrenamiento Personal",
    description: "Sesiones uno a uno con entrenadores certificados.",
  },
  {
    icon: Heart,
    title: "Zona Cardio",
    description: "Cintas, bicicletas y elípticas con pantallas interactivas.",
  },
  {
    icon: Trophy,
    title: "Programas Especiales",
    description: "Pérdida de peso, ganancia muscular y preparación deportiva.",
  },
  {
    icon: Utensils,
    title: "Nutrición",
    description: "Planes alimenticios personalizados por nutriólogos.",
  },
];

export function Services() {
  return (
    <section id="servicios" className="py-24 bg-[#0d0f12] text-gray-100 border-t border-gray-800/40">
      <div className="container mx-auto px-4">
        
        {/* Encabezado */}
        <div className="text-center mb-16">
          <span className="text-[#00aeef] font-bold uppercase tracking-wider text-xs bg-[#00aeef]/10 px-3.5 py-1.5 rounded-full border border-[#00aeef]/20 inline-block mb-3">
            Nuestros Servicios
          </span>
          <h2 
            className="text-4xl md:text-5xl font-black text-white mt-2 mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Todo lo que Necesitás
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
            Ofrecemos una experiencia fitness completa con instalaciones de primer nivel
            y servicios diseñados para ayudarte a alcanzar tus metas.
          </p>
        </div>

        {/* Grilla de Servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card 
              key={service.title} 
              className="group hover:-translate-y-1 transition-all duration-300 border-gray-800/80 bg-[#14171d] hover:border-[#00aeef]/50 hover:shadow-xl hover:shadow-[#00aeef]/5 rounded-2xl overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#00aeef]/10 border border-[#00aeef]/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#00aeef] group-hover:border-[#00aeef] group-hover:scale-110 transition-all duration-300">
                  <service.icon className="w-6 h-6 text-[#00aeef] group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2">{service.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
}