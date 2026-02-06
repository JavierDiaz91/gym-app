type Member = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  plan_name?: string;
  status: string;
  subscription_status?: string;
  subscription_end?: string;
};



import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMembers } from "@/app/actions";
import { Search, Plus, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default async function MiembrosPage() {
  const members = await getMembers();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Miembros
          </h1>
          <p className="text-muted-foreground">
            Gestiona los miembros del gimnasio
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/miembros/nuevo">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Miembro
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Miembros</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar miembro..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Membresia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
  {members.map((member) => (
    <TableRow key={member.id}>
      {/* MIEMBRO */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {member.first_name[0]}
              {member.last_name?.[0] ?? ""}
            </span>
          </div>
          <div>
            <p className="font-medium">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {member.id}
            </p>
          </div>
        </div>
      </TableCell>

      {/* CONTACTO */}
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Mail className="w-3 h-3" />
            {member.email}
          </div>

          {member.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              {member.phone}
            </div>
          )}
        </div>
      </TableCell>

      {/* MEMBRESÍA */}
      <TableCell>
        <span className="text-sm">
          {member.plan_name ?? "Sin membresía"}
        </span>
      </TableCell>

      {/* ESTADO */}
      <TableCell>
        <Badge
          variant={member.status === "active" ? "default" : "secondary"}
        >
          {member.status === "active" ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>

      {/* VENCIMIENTO */}
      <TableCell>
        {member.subscription_end
          ? new Date(member.subscription_end).toLocaleDateString("es-AR")
          : "-"}
      </TableCell>

      {/* ACCIONES */}
      <TableCell className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/miembros/${member.id}`}>
            Ver Detalle
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
</Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No hay miembros registrados</p>
              <Button asChild>
                <Link href="/admin/miembros/nuevo">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Miembro
                </Link>
              </Button>
            </div>
          )}
        </CardContent>

      </Card>

    </div>
  );
}


