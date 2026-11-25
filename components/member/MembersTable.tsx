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
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">Lista de Miembros</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembro..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden lg:block"><Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miembro</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Membresía</TableHead>
            <TableHead>Estado del miembro</TableHead>
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
              <TableCell><div className="space-y-1"><div>{member.plan_name ?? "Sin membresía"}</div>{member.plan_name && member.subscription_payment_status === "pending" && <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pago pendiente</Badge>}</div></TableCell>
              <TableCell>
                <Badge
                  title="Estado administrativo del miembro; no indica si su membresía está pagada."
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
                <p className="mt-1 text-xs text-muted-foreground">Estado administrativo</p>
              </TableCell>
              <TableCell>
                {member.subscription_end
                  ? new Date(member.subscription_end).toLocaleDateString("es-AR", { timeZone: "UTC" })
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
      </Table></div>
<div className="grid gap-2 lg:hidden">
        {filteredMembers.map(member => <article key={member.id} className="min-w-0 space-y-2 rounded-xl border p-3">
          <div className="flex items-start gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{member.first_name[0]}{member.last_name?.[0] ?? ""}</div>
            <div className="min-w-0 flex-1"><p className="break-words font-semibold">{member.first_name} {member.last_name}</p><p className="text-xs text-muted-foreground">{member.plan_name ?? "Sin membresía"}</p></div>
            <Badge variant="outline" title="Estado administrativo" className={member.status === "active" ? "text-emerald-500" : "text-muted-foreground"}>{member.status === "active" ? "Activo" : member.status === "suspended" ? "Suspendido" : "Inactivo"}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex min-w-0 items-center gap-1"><Mail className="size-3 shrink-0"/><span className="break-all">{member.email}</span></span>{member.phone && <span className="flex items-center gap-1"><Phone className="size-3"/>{member.phone}</span>}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span>Vence: {member.subscription_end ? new Date(member.subscription_end).toLocaleDateString("es-AR", {timeZone:"UTC"}) : "—"}</span>{member.subscription_payment_status === "pending" && <Badge variant="outline" className="text-amber-500">Pago pendiente</Badge>}</div>
          <div className="flex justify-end border-t pt-1"><Button variant="ghost" size="sm" className="text-primary" asChild><Link href={`/admin/miembros/${member.id}`}>Ver detalle →</Link></Button></div>
        </article>)}
        {filteredMembers.length === 0 && <p className="text-sm text-muted-foreground">No se encontraron miembros.</p>}
      </div>
    </div>
  );
}