import { getSession, getTrainerMembers } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

export default async function TrainerAlumnosPage() {
  const session = await getSession();

  // 🔒 Seguridad extra (además del middleware)
  if (!session || session.role !== "trainer") {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No autorizado
      </div>
    );
  }

  const members = await getTrainerMembers(session.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Alumnos</h1>
        <p className="text-muted-foreground">
          Alumnos asignados a tu cuenta
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-muted-foreground">
          No tenés alumnos asignados todavía
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle>
                  {member.first_name} {member.last_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  Estado:{" "}
                  <span className="font-medium capitalize">
                    {member.status}
                  </span>
                </p>

                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {member.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
