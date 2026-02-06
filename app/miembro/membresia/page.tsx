import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { getMembershipPlans, getSession } from "@/app/actions";
import { sql } from "@/lib/db";

async function getMemberSubscription(userId: number) {
  try {
    const subscriptions = await sql`
      SELECT s.*, mp.name as plan_name, mp.price, mp.features
      FROM subscriptions s
      JOIN membership_plans mp ON s.plan_id = mp.id
      JOIN members m ON s.member_id = m.id
      WHERE m.user_id = ${userId} AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    return subscriptions[0] || null;
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
}

export default async function MembresiaPage() {
  const session = await getSession();
  const currentSubscription = session ? await getMemberSubscription(session.id) : null;
  const plans = await getMembershipPlans();

  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Mi Membresia
        </h1>
        <p className="text-muted-foreground">
          Administra tu plan y beneficios
        </p>
      </div>

      {/* Current Plan */}
      {currentSubscription && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan Actual
                  <Badge>Activo</Badge>
                </CardTitle>
                <CardDescription>Tu membresia actual en FitZone</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                  {currentSubscription.plan_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio Mensual</p>
                <p className="text-2xl font-bold">${currentSubscription.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vence</p>
                <p className="text-2xl font-bold">
                  {new Date(currentSubscription.end_date).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {currentSubscription ? "Cambiar de Plan" : "Planes Disponibles"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: { 
            id: number; 
            name: string; 
            price: number; 
            duration_days: number;
            features: string[] | string;
          }, index: number) => {
            const isPopular = index === 1;
            const isCurrent = currentSubscription?.plan_id === plan.id;
            const features = Array.isArray(plan.features) 
              ? plan.features 
              : typeof plan.features === 'string' 
                ? JSON.parse(plan.features) 
                : [];

            return (
              <Card 
                key={plan.id}
                className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg" : ""} ${isCurrent ? "bg-muted/50" : ""}`}
              >
                {isPopular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mas Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">
                    Tu Plan Actual
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle style={{ fontFamily: "var(--font-heading)" }}>
                    {plan.name}
                  </CardTitle>
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
                    variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
                    disabled={isCurrent}
                  >
                    {isCurrent ? "Plan Actual" : "Seleccionar Plan"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>Tus ultimos pagos y facturas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay pagos registrados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
