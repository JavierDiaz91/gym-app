import { getMembers } from "@/app/actions";
import { MembersTable } from "@/components/member/MembersTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function MiembrosPage() {
  const members = await getMembers();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Miembros</h1>
          <p className="text-muted-foreground">Gestiona los miembros del gimnasio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" asChild><Link href="/admin/solicitudes-planes">Solicitudes de planes</Link></Button><Button asChild>
          <Link href="/admin/miembros/nuevo">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Miembro
          </Link>
        </Button></div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <MembersTable members={members} />
        </CardContent>
      </Card>
    </div>
  );
}