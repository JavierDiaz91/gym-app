import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function Pricing() {
  const plans = [
    {
      id: 1,
      name: "2 Días por Semana",
      features: [
        "Acceso 2 días a la semana",
        "Uso de sala de musculación",
        "Acceso a vestuarios y casilleros",
        "Seguimiento básico de rutina",
      ],
    },
    {
      id: 2,
      name: "3 Días por Semana",
      features: [
        "Acceso 3 días a la semana",
        "Uso de sala de musculación y cardio",
        "Acceso a clases grupales seleccionadas",
        "Acceso a vestuarios y casilleros",
        "Plan de entrenamiento personalizado",
      ],
    },
    {
      id: 3,
      name: "Pase Libre",
      features: [
        "Acceso ilimitado de lunes a sábados",
        "Acceso total a musculación y cardio",
        "Todas las clases grupales incluidas",
        "Acceso a vestuarios y casillero premium",
        "Seguimiento personalizado continuo",
      ],
    },
  ];

  return (
    <section id="planes" className="py-24 bg-[#0d0f12] text-gray-100 border-t border-gray-800/40">
      <div className="container mx-auto px-4">
        
        {/* Encabezado */}
        <div className="text-center mb-16">
          <span className="text-[#00aeef] font-bold uppercase tracking-wider text-xs bg-[#00aeef]/10 px-3.5 py-1.5 rounded-full border border-[#00aeef]/20 inline-block mb-3">
            Membresías
          </span>
          <h2 
            className="text-4xl md:text-5xl font-black text-white mt-2 mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Planes de Entrenamiento
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
            Elegí la frecuencia que mejor se adapte a tus objetivos y ritmo de vida.
          </p>
        </div>

        {/* Grilla de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, index) => {
            const isPopular = index === 2; // "Pase Libre" destacado

            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  isPopular 
                    ? "border-2 border-[#00aeef] shadow-xl shadow-[#00aeef]/10 md:-translate-y-2 bg-[#14171d]" 
                    : "border border-gray-800 bg-[#14171d] hover:border-[#00aeef]/50 hover:shadow-lg hover:shadow-[#00aeef]/5"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00aeef] hover:bg-[#00aeef] text-black font-extrabold rounded-full px-4 py-1 text-xs shadow-md uppercase tracking-wider">
                    Recomendado
                  </Badge>
                )}

                <CardHeader className="text-center pb-4 pt-8">
                  <h3 
                    className="text-2xl font-extrabold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {plan.name}
                  </h3>
                </CardHeader>

                <CardContent className="flex-1 px-6 py-4">
                  <div className="w-full h-px bg-gray-800/80 mb-6" />
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#00aeef]/10 border border-[#00aeef]/30 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-[#00aeef] stroke-[2.5]" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="p-6 pt-2">
                  <Button 
                    className={`w-full rounded-xl h-11 font-extrabold text-sm transition-all ${
                      isPopular 
                        ? "bg-[#00aeef] hover:bg-[#0098d4] text-black shadow-md shadow-[#00aeef]/20" 
                        : "border-gray-800 text-gray-300 hover:bg-[#00aeef]/10 hover:text-[#00aeef] hover:border-[#00aeef]/40 bg-transparent"
                    }`}
                    variant={isPopular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="#contacto">Consultar Más</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
}