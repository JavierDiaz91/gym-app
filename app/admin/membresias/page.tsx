import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMembershipPlans } from "@/app/actions";
import { sql } from "@/lib/db";
import { Plus, Edit, Users } from "lucide-react";

async function getActiveSubscriptions() {
  try {
    const subscriptions = await sql`
      SELECT s.*, 
        m.first_name, m.last_name, m.email,
        mp.name as plan_name, mp.price
      FROM subscriptions s
      JOIN members m ON s.member_id = m.id
      JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE s.status = 'active'
      ORDER BY s.end_date ASC
      LIMIT 20
    `;
    return subscriptions;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }
}

export default async function MembresiasAdminPage() {
  const plans = await getMembershipPlans();
  const subscriptions = await getActiveSubscriptions();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Membresias
          </h1>
          <p className="text-muted-foreground">
            Gestiona los planes y suscripciones
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planes de Membresia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: { 
            id: number; 
            name: string; 
            price: number; 
            duration_days: number;
            features: string[] | string;
            is_active: boolean;
          }) => {
            const features = Array.isArray(plan.features) 
              ? plan.features 
              : typeof plan.features === 'string' 
                ? JSON.parse(plan.features) 
                : [];

            return (
              <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-2xl font-bold mt-2">
                      ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline">{plan.duration_days} dias</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {features.slice(0, 4).map((feature: string) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Suscripciones Activas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: {
                  id: number;
                  first_name: string;
                  last_name: string;
                  email: string;
                  plan_name: string;
                  price: number;
                  start_date: string;
                  end_date: string;
                  status: string;
                }) => {
                  const daysLeft = Math.ceil(
                    (new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.first_name} {sub.last_name}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>${sub.price}</TableCell>
                      <TableCell>
                        {new Date(sub.start_date).toLocaleDateString("es")}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.end_date).toLocaleDateString("es")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysLeft <= 7 ? "destructive" : "default"}>
                          {daysLeft > 0 ? `${daysLeft} dias` : "Vencido"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No hay suscripciones activas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
