import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getMembershipPlans } from "@/app/actions";

export async function Pricing() {
  const plans = await getMembershipPlans();

  const defaultPlans = plans.length > 0 ? plans : [
    {
      id: 1,
      name: "Basico",
      price: 299,
      duration_days: 30,
      features: ["Acceso a equipos", "Horario limitado", "Casillero basico"],
    },
    {
      id: 2,
      name: "Premium",
      price: 499,
      duration_days: 30,
      features: ["Acceso ilimitado", "Clases grupales", "Casillero premium", "1 sesion PT/mes"],
    },
    {
      id: 3,
      name: "Elite",
      price: 799,
      duration_days: 30,
      features: ["Acceso VIP 24/7", "Todas las clases", "Spa y sauna", "4 sesiones PT/mes", "Plan nutricional"],
    },
  ];

  return (
    <section id="planes" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-2">Planes de Membresia</p>
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Elige tu Plan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tenemos opciones para todos los presupuestos y objetivos. 
            Comienza hoy y transforma tu vida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {defaultPlans.map((plan, index) => {
            const isPopular = index === 1;
            const features = Array.isArray(plan.features) 
              ? plan.features 
              : typeof plan.features === 'string' 
                ? JSON.parse(plan.features) 
                : [];

            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg scale-105" : "border-border/50"}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mas Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <h3 
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {features.map((feature: string) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isPopular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/registro">Comenzar Ahora</Link>
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
