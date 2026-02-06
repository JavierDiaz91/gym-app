import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getClasses, getClassSchedule } from "@/app/actions";
import { Clock, Users, Calendar } from "lucide-react";

export default async function ClasesPage() {
  const classes = await getClasses();
  const schedule = await getClassSchedule();

  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Clases
        </h1>
        <p className="text-muted-foreground">
          Explora y reserva nuestras clases grupales
        </p>
      </div>

      {/* Class Types */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tipos de Clases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length > 0 ? classes.map((cls: {
            id: number;
            name: string;
            description: string;
            duration_minutes: number;
            max_capacity: number;
            trainer_first_name?: string;
            trainer_last_name?: string;
          }) => (
            <Card key={cls.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{cls.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {cls.description || "Clase grupal de fitness"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {cls.duration_minutes} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Max {cls.max_capacity}
                  </div>
                </div>
                {cls.trainer_first_name && (
                  <p className="text-sm mt-2">
                    Instructor: {cls.trainer_first_name} {cls.trainer_last_name}
                  </p>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay clases disponibles en este momento
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Proximas Clases Programadas</h2>
        <Card>
          <CardContent className="p-0">
            {schedule.length > 0 ? (
              <div className="divide-y">
                {schedule.map((item: {
                  id: number;
                  class_name: string;
                  description?: string;
                  start_time: string;
                  duration_minutes: number;
                  trainer_first_name?: string;
                  trainer_last_name?: string;
                  booked_count: number;
                  max_capacity: number;
                }) => {
                  const startTime = new Date(item.start_time);
                  const spotsLeft = (item.max_capacity || 20) - Number(item.booked_count || 0);

                  return (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-muted-foreground uppercase">
                            {startTime.toLocaleDateString("es", { weekday: "short" })}
                          </p>
                          <p className="text-2xl font-bold">
                            {startTime.getDate()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {startTime.toLocaleDateString("es", { month: "short" })}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{item.class_name}</h3>
                            {spotsLeft <= 3 && spotsLeft > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Ultimos lugares
                              </Badge>
                            )}
                            {spotsLeft === 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Lleno
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {startTime.toLocaleTimeString("es", { 
                                hour: "2-digit", 
                                minute: "2-digit" 
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {spotsLeft} lugares
                            </span>
                          </div>
                          {item.trainer_first_name && (
                            <p className="text-sm text-muted-foreground">
                              Instructor: {item.trainer_first_name} {item.trainer_last_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        disabled={spotsLeft === 0}
                      >
                        {spotsLeft === 0 ? "Lleno" : "Reservar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay clases programadas proximamente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
