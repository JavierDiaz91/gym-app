"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

export default function PerfilPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Mi Perfil
        </h1>
        <p className="text-muted-foreground">
          Administra tu informacion personal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacion Personal</CardTitle>
          <CardDescription>Actualiza tus datos de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <Button variant="outline">Cambiar Foto</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" placeholder="Juan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" placeholder="Perez" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="juan@email.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" type="tel" placeholder="(555) 123-4567" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency">Contacto de Emergencia</Label>
            <Input id="emergency" placeholder="Nombre y telefono" />
          </div>

          <Button>Guardar Cambios</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contrasena</CardTitle>
          <CardDescription>Actualiza tu contrasena de acceso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contrasena Actual</Label>
            <Input id="currentPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contrasena</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contrasena</Label>
            <Input id="confirmPassword" type="password" />
          </div>
          <Button variant="outline">Cambiar Contrasena</Button>
        </CardContent>
      </Card>
    </div>
  );
}
