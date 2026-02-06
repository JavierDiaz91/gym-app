import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Configuracion
        </h1>
        <p className="text-muted-foreground">
          Administra la configuracion del sistema
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informacion del Gimnasio</CardTitle>
              <CardDescription>Datos basicos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gymName">Nombre del Gimnasio</Label>
                  <Input id="gymName" defaultValue="FitZone Gym" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" defaultValue="(555) 123-4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Direccion</Label>
                <Input id="address" defaultValue="Av. Principal 123, Centro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de Contacto</Label>
                <Input id="email" type="email" defaultValue="info@fitzone.com" />
              </div>
              <Button>Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Operacion</CardTitle>
              <CardDescription>Define los horarios de apertura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <Label>Lunes a Viernes</Label>
                <Input type="time" defaultValue="06:00" />
                <Input type="time" defaultValue="22:00" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <Label>Sabado</Label>
                <Input type="time" defaultValue="07:00" />
                <Input type="time" defaultValue="20:00" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <Label>Domingo</Label>
                <Input type="time" defaultValue="08:00" />
                <Input type="time" defaultValue="14:00" />
              </div>
              <Button>Guardar Horarios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura las alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nuevos registros</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificacion cuando se registre un nuevo miembro
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Membresias por vencer</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas de membresias proximas a expirar
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pagos recibidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificacion de cada pago procesado
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reservas de clases</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas cuando se llene una clase
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>Guardar Preferencias</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
