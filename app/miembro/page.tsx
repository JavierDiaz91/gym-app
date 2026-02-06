import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession, getClassSchedule, getMembershipPlans } from "@/app/actions";
import { sql } from "@/lib/db";
import { Calendar, CreditCard, Clock, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getMemberData(userId: number) {
  try {
    const members = await sql`
      SELECT m.*, 
        mp.name as plan_name,
        s.status as subscription_status,
        s.end_date as subscription_end
      FROM members m
      LEFT JOIN subscriptions s ON m.id = s.member_id AND s.status = 'active'
      LEFT JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE m.user_id = ${userId}
    `;
    return members[0] || null;
  } catch (error) {
    console.error("Error fetching member data:", error);
    return null;
  }
}

export default async function MemberDashboard() {
  const session = await getSession();
  const memberData = session ? await getMemberData(session.id) : null;
  const upcomingClasses = await getClassSchedule();
  const plans = await getMembershipPlans();

  const daysUntilExpiry = memberData?.subscription_end 
    ? Math.ceil((new Date(memberData.subscription_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Hola, {session?.name || "Miembro"}!
        </h1>
        <p className="text-muted-foreground">
          Bienvenido a tu portal de miembro FitZone
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mi Plan</p>
                <p className="font-semibold">{memberData?.plan_name || "Sin membresia"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vence en</p>
                <p className="font-semibold">
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} dias` : "Expirado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clases Reservadas</p>
                <p className="font-semibold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitas este mes</p>
                <p className="font-semibold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Membresia</CardTitle>
            <CardDescription>Tu plan actual y beneficios</CardDescription>
          </CardHeader>
          <CardContent>
            {memberData?.plan_name ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan Actual</span>
                  <Badge>{memberData.plan_name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={memberData.subscription_status === "active" ? "default" : "destructive"}>
                    {memberData.subscription_status === "active" ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span className="font-medium">
                    {memberData.subscription_end 
                      ? new Date(memberData.subscription_end).toLocaleDateString("es")
                      : "-"
                    }
                  </span>
                </div>
                {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                  <Button className="w-full mt-4" asChild>
                    <Link href="/miembro/membresia">Renovar Membresia</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No tienes una membresia activa</p>
                <Button asChild>
                  <Link href="/miembro/membresia">Ver Planes Disponibles</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Proximas Clases</CardTitle>
              <CardDescription>Clases disponibles esta semana</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/miembro/clases">
                Ver Todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingClasses.slice(0, 3).map((cls: { 
                id: number; 
                class_name: string; 
                start_time: string;
                trainer_first_name?: string;
                trainer_last_name?: string;
                booked_count: number;
                max_capacity: number;
              }) => (
                <div 
                  key={cls.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{cls.class_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cls.start_time).toLocaleDateString("es", { 
                        weekday: "short", 
                        month: "short", 
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {cls.trainer_first_name && ` - ${cls.trainer_first_name}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Reservar
                  </Button>
                </div>
              ))}
              {upcomingClasses.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay clases programadas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Plans */}
      {!memberData?.plan_name && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planes Disponibles</CardTitle>
            <CardDescription>Elige el plan que mejor se adapte a ti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: { id: number; name: string; price: number; features: string[] | string }) => {
                const features = Array.isArray(plan.features) 
                  ? plan.features 
                  : typeof plan.features === 'string' 
                    ? JSON.parse(plan.features) 
                    : [];

                return (
                  <div 
                    key={plan.id} 
                    className="p-4 rounded-lg border bg-card hover:border-primary transition-colors"
                  >
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-2">
                      ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {features.slice(0, 3).map((feature: string) => (
                        <li key={feature}>- {feature}</li>
                      ))}
                    </ul>
                    <Button className="w-full mt-4" size="sm">
                      Seleccionar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
