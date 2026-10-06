"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member } from "@/app/types/member";

export function MembersTable({ members }: { members: Member[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = members.filter((m) => {
    const fullText = `${m.first_name} ${m.last_name ?? ""} ${m.email}`.toLowerCase();
    return fullText.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Lista de Miembros</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembro..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miembro</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Membresía</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.map((member) => (
            <TableRow key={member.id}>
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
                    <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                  </div>
                </div>
              </TableCell>
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
              <TableCell>{member.plan_name ?? "Sin membresía"}</TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                {member.subscription_end
                  ? new Date(member.subscription_end).toLocaleDateString("es-AR")
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/miembros/${member.id}`}>Ver Detalle</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}