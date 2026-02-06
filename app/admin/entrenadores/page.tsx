import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTrainers } from "@/app/actions";
import { Plus, Mail, Phone } from "lucide-react";

export default async function EntrenadoresPage() {
  const trainers = await getTrainers();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Entrenadores
          </h1>
          <p className="text-muted-foreground">
            Gestiona el equipo de entrenadores
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Entrenador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.length > 0 ? trainers.map((trainer: {
          id: number;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
          specialization?: string;
          bio?: string;
          is_active: boolean;
        }) => (
          <Card key={trainer.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {trainer.first_name[0]}{trainer.last_name?.[0] || ""}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {trainer.first_name} {trainer.last_name}
                    </h3>
                    <Badge variant={trainer.is_active ? "default" : "secondary"} className="flex-shrink-0">
                      {trainer.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  {trainer.specialization && (
                    <p className="text-sm text-primary font-medium mt-1">
                      {trainer.specialization}
                    </p>
                  )}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{trainer.email}</span>
                    </div>
                    {trainer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{trainer.phone}</span>
                      </div>
                    )}
                  </div>
                  {trainer.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {trainer.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  Ver Perfil
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No hay entrenadores registrados</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Entrenador
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
