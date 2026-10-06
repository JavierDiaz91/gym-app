import { getPaymentsHistory } from "@/app/actions";
import { sql } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RegistrarPagoDialog } from "./RegistrarPagoDialog";
import { PrintReceiptButton } from "./PrintReceiptButton";

interface PagosPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function PagosPage({ searchParams }: PagosPageProps) {
  const { status } = await searchParams;
  const payments = await getPaymentsHistory();
  
  // Obtenemos miembros y planes para pasárselos al diálogo de cobro
  const membersData = await sql`SELECT id, first_name, last_name, dni FROM members ORDER BY last_name`;
  const plansData = await sql`SELECT id, name, price FROM membership_plans ORDER BY price`;

  const members = (membersData as unknown as any[]).map(m => {
    const cleanDni = m.dni && m.dni !== "null" && String(m.dni).trim() !== "" ? String(m.dni) : "";
    return {
      id: Number(m.id),
      first_name: String(m.first_name),
      last_name: String(m.last_name),
      dni: cleanDni
    };
  });

  const plans = (plansData as unknown as any[]).map(p => ({
    id: Number(p.id),
    name: String(p.name),
    price: Number(p.price)
  }));

  const getMethodBadge = (method: string) => {
    switch (method?.toLowerCase()) {
      case "efectivo":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Efectivo</Badge>;
      case "transferencia":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Transferencia</Badge>;
      case "tarjeta":
      case "mercadopago":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Mercado Pago</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado de Mercado Pago */}
      {status === "success" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
          <p className="font-semibold">¡Cuenta de Mercado Pago vinculada exitosamente!</p>
          <p className="text-sm opacity-90">
            A partir de ahora, los cobros digitales realizados por tus socios se acreditarán en tu cuenta.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">Error al vincular Mercado Pago</p>
          <p className="text-sm opacity-90">
            No se pudo completar la autorización con Mercado Pago. Por favor, volvé a intentarlo.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Pagos</h1>
          <p className="text-muted-foreground">Gestión de cobros y emisión de recibos</p>
        </div>
        <RegistrarPagoDialog members={members} plans={plans} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Cobros Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Socio</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length > 0 ? (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs">
                      {new Date(payment.payment_date).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.last_name}, {payment.first_name}
                      <span className="block text-xs text-muted-foreground">DNI: {payment.dni || "Sin DNI"}</span>
                    </TableCell>
                    <TableCell>{payment.plan_name || "N/A"}</TableCell>
                    <TableCell>{getMethodBadge(payment.payment_method)}</TableCell>
                    <TableCell className="text-right font-bold">
                      ${Number(payment.amount).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <PrintReceiptButton payment={payment} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay pagos registrados aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}