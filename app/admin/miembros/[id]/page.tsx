import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, CreditCard } from "lucide-react";
import { getMemberById } from "@/app/actions";
import { MemberActions } from "./member-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DetalleMiembroPage({ params }: PageProps) {
  const { id } = await params;
  const memberId = Number(id);

  if (isNaN(memberId)) {
    notFound();
  }

  const member = await getMemberById(memberId);

  if (!member) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Volver */}
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/admin/miembros">
          <ArrowLeft className="w-4 h-4" /> Volver a Lista de Miembros
        </Link>
      </Button>

      {/* Cabecera del Socio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            {member.first_name?.[0]}
            {member.last_name?.[0] ?? ""}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {member.first_name} {member.last_name}
              </h1>
              <Badge
                variant={
                  member.status === "active"
                    ? "default"
                    : member.status === "suspended"
                    ? "secondary"
                    : "destructive"
                }
              >
                {member.status === "active"
                  ? "Activo"
                  : member.status === "suspended"
                  ? "Suspendido"
                  : "Inactivo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID de Miembro: #{member.id}
            </p>
          </div>
        </div>

        {/* Componente aislado para acciones rápidas */}
        <MemberActions member={member} />
      </div>

      {/* Tarjetas de Información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Datos de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{member.email || "-"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="font-medium">{member.phone || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Membresía Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-bold">
                {member.plan_name ?? "Sin membresía"}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Inicio:</span>
              <span className="font-medium">
                {member.subscription_start
                  ? new Date(member.subscription_start).toLocaleDateString(
                      "es-AR"
                    )
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimiento:</span>
              <span className="font-medium">
                {member.subscription_end
                  ? new Date(member.subscription_end).toLocaleDateString(
                      "es-AR"
                    )
                  : "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}