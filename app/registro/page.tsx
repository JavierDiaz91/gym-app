"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Loader2, CheckCircle2 } from "lucide-react";
import { registerUser } from "@/app/actions";

export default function RegistroPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success) {
      router.push("/miembro");
    }
  }

  const benefits = [
    "Acceso a instalaciones completas",
    "Planes adaptados a tu ritmo",
    "Seguimiento personalizado",
    "Reserva y consulta de clases",
  ];

  return (
    <div className="min-h-screen flex bg-[#0d0f12] text-gray-100">
      {/* Left Side - Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#12151a] p-12 flex-col justify-between relative overflow-hidden border-r border-gray-800/60">
        {/* Background Subtle Gradient */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00aeef] rounded-full blur-[120px]" />
        </div>

        {/* Top Brand Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00aeef]/10 border border-[#00aeef]/30 rounded-xl flex items-center justify-center shadow-lg shadow-[#00aeef]/10">
              <Activity className="w-6 h-6 text-[#00aeef]" />
            </div>
            <span 
              className="text-2xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pulse<span className="text-[#00aeef]">Fit</span>
            </span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <span className="text-[#00aeef] font-bold uppercase tracking-wider text-xs bg-[#00aeef]/10 border border-[#00aeef]/20 px-3.5 py-1.5 rounded-full inline-block mb-6">
            Comenzá Hoy
          </span>

          <h1 
            className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tu Cambio Empieza <br />
            <span className="text-[#00aeef]">Con Un Clic.</span>
          </h1>

          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Sumate a la comunidad y empezá a entrenar con las mejores herramientas y acompañamiento.
          </p>

          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-[#00aeef]/10 border border-[#00aeef]/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#00aeef]" />
                </div>
                <span className="text-base font-medium">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-gray-600">
          &copy; {new Date().getFullYear()} PulseFit. Todos los derechos reservados.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#0a0c0e]">
        <Card className="w-full max-w-md border border-gray-800/80 shadow-2xl rounded-2xl bg-[#14171d] text-gray-100 p-2">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 bg-[#00aeef]/10 border border-[#00aeef]/30 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#00aeef]" />
              </div>
            </div>
            <CardTitle 
              className="text-2xl font-extrabold text-white" 
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Crear Cuenta
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Ingresá tus datos para acceder a <span className="text-[#00aeef] font-medium">PulseFit</span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Nombre Completo
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Juan Pérez"
                  className="rounded-xl bg-[#0d0f12] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="rounded-xl bg-[#0d0f12] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(3492) 12-3456"
                  className="rounded-xl bg-[#0d0f12] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="******"
                    className="rounded-xl bg-[#0d0f12] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-11"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Confirmar
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="******"
                    className="rounded-xl bg-[#0d0f12] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-11"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button 
                type="submit" 
                className="w-full bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold h-12 rounded-xl shadow-lg shadow-[#00aeef]/20 text-base transition-all" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin text-black" />}
                Crear Cuenta
              </Button>

              <p className="text-sm text-gray-400 text-center">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="text-[#00aeef] hover:underline font-semibold">
                  Iniciá sesión
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}