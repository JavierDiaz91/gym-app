import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Phone } from "lucide-react";

const schedule = [
  { day: "Lunes", hours: "6:00 AM - 10:00 PM" },
  { day: "Martes", hours: "6:00 AM - 10:00 PM" },
  { day: "Miercoles", hours: "6:00 AM - 10:00 PM" },
  { day: "Jueves", hours: "6:00 AM - 10:00 PM" },
  { day: "Viernes", hours: "6:00 AM - 10:00 PM" },
  { day: "Sabado", hours: "7:00 AM - 8:00 PM" },
  { day: "Domingo", hours: "8:00 AM - 2:00 PM" },
];

const peakHours = [
  { time: "6:00 - 8:00 AM", level: "Alto", description: "Muchos miembros antes del trabajo" },
  { time: "12:00 - 2:00 PM", level: "Medio", description: "Hora del almuerzo" },
  { time: "6:00 - 9:00 PM", level: "Muy Alto", description: "Hora pico despues del trabajo" },
];

export default function HorariosPage() {
  const today = new Date().toLocaleDateString("es", { weekday: "long" });

  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Horarios
        </h1>
        <p className="text-muted-foreground">
          Horarios de operacion y horas pico
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horario Semanal
            </CardTitle>
            <CardDescription>Horarios de apertura del gimnasio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.map((item) => {
                const isToday = item.day.toLowerCase() === today.toLowerCase();
                return (
                  <div 
                    key={item.day}
                    className={`flex items-center justify-between p-3 rounded-lg ${isToday ? "bg-primary/10 border border-primary/30" : "bg-muted/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isToday ? "text-primary" : ""}`}>
                        {item.day}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Hoy
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{item.hours}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Horas Pico</CardTitle>
            <CardDescription>Momentos de mayor afluencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {peakHours.map((item) => (
                <div key={item.time} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.time}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      item.level === "Muy Alto" 
                        ? "bg-red-100 text-red-700" 
                        : item.level === "Alto"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {item.level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Tip: Para evitar las multitudes, te recomendamos visitar entre 9:00 AM - 12:00 PM o 2:00 PM - 5:00 PM.
            </p>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informacion de Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Direccion</p>
                  <p className="text-muted-foreground">Av. Principal 123, Centro</p>
                  <p className="text-muted-foreground">Ciudad, CP 12345</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Telefono</p>
                  <p className="text-muted-foreground">(555) 123-4567</p>
                  <p className="text-sm text-muted-foreground">Linea directa para miembros</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
