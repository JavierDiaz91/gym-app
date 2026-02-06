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
import { getClasses, getClassSchedule } from "@/app/actions";
import { Plus, Clock, Users } from "lucide-react";

export default async function ClasesAdminPage() {
  const classes = await getClasses();
  const schedule = await getClassSchedule();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Clases
          </h1>
          <p className="text-muted-foreground">
            Gestiona las clases y horarios del gimnasio
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Clase
        </Button>
      </div>

      {/* Class Types */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Clases</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Duracion</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls: {
                  id: number;
                  name: string;
                  description?: string;
                  duration_minutes: number;
                  max_capacity: number;
                  trainer_first_name?: string;
                  trainer_last_name?: string;
                  is_active: boolean;
                }) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {cls.description || "Sin descripcion"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {cls.duration_minutes} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {cls.max_capacity}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cls.trainer_first_name 
                        ? `${cls.trainer_first_name} ${cls.trainer_last_name || ""}`
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={cls.is_active ? "default" : "secondary"}>
                        {cls.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No hay clases registradas</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Clase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Horarios Programados</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Programar Clase
          </Button>
        </CardHeader>
        <CardContent>
          {schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule.map((item: {
                id: number;
                class_name: string;
                start_time: string;
                duration_minutes: number;
                trainer_first_name?: string;
                trainer_last_name?: string;
                booked_count: number;
                max_capacity: number;
              }) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{item.class_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.start_time).toLocaleDateString("es", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {item.trainer_first_name && ` - ${item.trainer_first_name} ${item.trainer_last_name || ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">
                      {item.booked_count || 0}/{item.max_capacity} reservas
                    </Badge>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay clases programadas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
