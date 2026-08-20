import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const classes = [
  {
    name: "Musculación",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80",
    level: "Todos",
  },
  {
    name: "Entrenamiento Funcional",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80",
    level: "Todos",
  },
  {
    name: "Clases Aeróbicas",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
    level: "Intermedio",
  },
  {
    name: "Prevención de Lesiones y Personalizado",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    level: "Todos",
  },
];

export function Classes() {
  return (
    <section id="clases" className="py-24 bg-[#0d0f12] text-gray-100 border-t border-gray-800/40">
      <div className="container mx-auto px-4">
        
        {/* Encabezado de la sección */}
        <div className="text-center mb-16">
          <span className="text-[#00aeef] font-bold uppercase tracking-wider text-xs bg-[#00aeef]/10 px-3.5 py-1.5 rounded-full border border-[#00aeef]/20 inline-block mb-3">
            Nuestras Disciplinas
          </span>
          <h2 
            className="text-4xl md:text-5xl font-black text-white mt-2 mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Elegí tu Forma de Entrenar
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
            Contamos con espacios equipados y clases guiadas para potenciar tu rendimiento, fuerza y salud física.
          </p>
        </div>

        {/* Grilla de Clases */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {classes.map((cls) => (
            <Card 
              key={cls.name} 
              className="overflow-hidden group cursor-pointer border-gray-800/80 bg-[#14171d] rounded-2xl hover:border-[#00aeef]/50 hover:shadow-xl hover:shadow-[#00aeef]/5 transition-all duration-300"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={cls.image || "/placeholder.svg"}
                  alt={cls.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14171d] via-[#14171d]/20 to-transparent" />
                
                {/* Badge de Nivel */}
                <Badge 
                  className={`absolute top-3 right-3 font-semibold rounded-lg px-2.5 py-1 backdrop-blur-md ${
                    cls.level === "Avanzado" 
                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" 
                      : cls.level === "Intermedio"
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                      : "bg-[#00aeef]/20 border border-[#00aeef]/40 text-[#00aeef]"
                  }`}
                >
                  {cls.level}
                </Badge>

                {/* Nombre de la clase */}
                <h3 
                  className="absolute bottom-4 left-4 right-4 text-xl font-extrabold text-white tracking-tight leading-snug"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {cls.name}
                </h3>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
}