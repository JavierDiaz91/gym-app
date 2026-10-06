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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Miembros</h1>
          <p className="text-muted-foreground">Gestiona los miembros del gimnasio</p>
        </div>
        <Button asChild>
          <Link href="/admin/miembros/nuevo">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Miembro
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <MembersTable members={members} />
        </CardContent>
      </Card>
    </div>
  );
}