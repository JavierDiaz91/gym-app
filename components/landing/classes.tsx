import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Flame } from "lucide-react";

const classes = [
  {
    name: "CrossFit",
    image: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&q=80",
    duration: "60 min",
    level: "Avanzado",
    calories: "600-800",
  },
  {
    name: "Yoga Flow",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80",
    duration: "45 min",
    level: "Todos",
    calories: "200-300",
  },
  {
    name: "Spinning",
    image: "https://images.unsplash.com/photo-1520877880798-5ee004e3f11e?w=400&q=80",
    duration: "45 min",
    level: "Intermedio",
    calories: "400-600",
  },
  {
    name: "HIIT",
    image: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=400&q=80",
    duration: "30 min",
    level: "Todos",
    calories: "300-500",
  },
];

export function Classes() {
  return (
    <section id="clases" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-2">Clases Grupales</p>
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Entrena en Grupo
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nuestras clases grupales estan disenadas para motivarte y ayudarte 
            a alcanzar tus objetivos en un ambiente energico.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {classes.map((cls) => (
            <Card key={cls.name} className="overflow-hidden group cursor-pointer">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={cls.image || "/placeholder.svg"}
                  alt={cls.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Badge 
                  className="absolute top-3 right-3"
                  variant={cls.level === "Avanzado" ? "destructive" : "secondary"}
                >
                  {cls.level}
                </Badge>
                <h3 
                  className="absolute bottom-3 left-3 text-xl font-bold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {cls.name}
                </h3>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {cls.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-accent" />
                    {cls.calories} cal
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
