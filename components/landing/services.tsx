import { Dumbbell, Users, Timer, Heart, Trophy, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Dumbbell,
    title: "Equipos Premium",
    description: "Maquinas de ultima generacion y pesas libres para todos los niveles.",
  },
  {
    icon: Users,
    title: "Clases Grupales",
    description: "Yoga, spinning, crossfit, zumba y mas de 20 clases diferentes.",
  },
  {
    icon: Timer,
    title: "Entrenamiento Personal",
    description: "Sesiones uno a uno con entrenadores certificados.",
  },
  {
    icon: Heart,
    title: "Zona Cardio",
    description: "Cintas, bicicletas y elipticas con pantallas interactivas.",
  },
  {
    icon: Trophy,
    title: "Programas Especiales",
    description: "Perdida de peso, ganancia muscular y preparacion deportiva.",
  },
  {
    icon: Utensils,
    title: "Nutricion",
    description: "Planes alimenticios personalizados por nutriologos.",
  },
];

export function Services() {
  return (
    <section id="servicios" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-2">Nuestros Servicios</p>
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Todo lo que Necesitas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ofrecemos una experiencia fitness completa con instalaciones de primer nivel
            y servicios disenados para ayudarte a alcanzar tus metas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card 
              key={service.title} 
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
