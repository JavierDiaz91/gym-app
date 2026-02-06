"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dumbbell, Loader2 } from "lucide-react";
import { loginUser } from "@/app/actions";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError("");
  setLoading(true);

  const formData = new FormData(e.currentTarget);
  const result = await loginUser(formData);

  if (result.error) {
    setError(result.error);
    setLoading(false);
  } else if (result.success) {
    setLoading(false); // ✅ IMPORTANTE

    if (result.user?.role === "admin") {
      router.push("/admin");
    } else if (result.user.role === "trainer") {
      router.push("/trainer");
    } else {
      router.push("/miembro");
    }
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-primary-foreground" />
            </div>
          </Link>
          <CardTitle className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            Bienvenido de Vuelta
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesion
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              No tienes cuenta?{" "}
              <Link href="/registro" className="text-primary hover:underline">
                Registrate aqui
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
