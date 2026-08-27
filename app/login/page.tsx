"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Loader2 } from "lucide-react"; // <--- Cambiado Dumbbell por Activity
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
      setLoading(false); 

      if (result.user?.role === "superadmin") {
        router.push("/admin/gimnasios");
      } else if (result.user?.role === "admin") {
        router.push("/admin");
      } else if (result.user?.role === "trainer") {
        router.push("/trainer");
      } else {
        router.push("/miembro");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          {/* LOGO: Icono Activity Cyan */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-2">
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <Activity className="w-7 h-7 text-cyan-400" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Bienvenido de Vuelta
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Ingresá tus credenciales para acceder a <span className="text-cyan-400 font-medium">PulseFit</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                className="bg-zinc-950/60 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
                className="bg-zinc-950/60 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 mt-2">
            {/* Botón Principal Cyan */}
            <Button 
              type="submit" 
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold shadow-lg shadow-cyan-500/10 transition-all cursor-pointer" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-950" />}
              Iniciar Sesión
            </Button>
console.log("Resultado del login:", result);
            <p className="text-sm text-zinc-400 text-center">
              ¿No tenés cuenta?{" "}
              <Link href="/registro" className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors">
                Registrate aquí
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}