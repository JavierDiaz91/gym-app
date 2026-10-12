"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Loader2,
  QrCode,
  Sparkles,
} from "lucide-react";
import { registerUser } from "@/app/actions";

const benefits = [
  {
    icon: CheckCircle2,
    title: "Membresía siempre visible",
    description: "Consultá tu estado y vigencia desde tu cuenta.",
  },
  {
    icon: CreditCard,
    title: "Pagos e historial",
    description: "Revisá tus movimientos de forma simple.",
  },
  {
    icon: Dumbbell,
    title: "Rutinas y clases",
    description: "Accedé a tu entrenamiento y actividades asignadas.",
  },
];

function RegisterForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // El QR de cada gimnasio abre /registro?gym=ID.
  const gymId = searchParams.get("gym");

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

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      router.push("/miembro");
    }
  }

  return (
    <main className="min-h-screen bg-[#090b10] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/[0.06] p-10 lg:flex lg:flex-col xl:p-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-20 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />
            <div className="absolute bottom-12 right-4 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
          </div>

          <Link href="/" className="relative inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Sparkles className="h-5 w-5 text-violet-200" />
            </div>
            <div>
              <span className="block text-xl font-semibold tracking-[-0.04em]">Kivra</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Gym Management
              </span>
            </div>
          </Link>

          <div className="relative my-auto max-w-xl py-14">
            <p className="text-sm font-medium text-violet-200">Tu gimnasio ya usa Kivra.</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.03] tracking-[-0.055em] xl:text-6xl">
              Tu experiencia,
              <span className="block text-zinc-500">también conectada.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-500">
              Registrate desde el QR de tu gimnasio y accedé a la información de tu membresía desde un solo lugar.
            </p>

            <div className="mt-10 grid gap-4">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.06]">
                    <Icon className="h-4 w-4 text-violet-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-zinc-700">&copy; {new Date().getFullYear()} Kivra</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-violet-300" />
                Kivra
              </Link>
            </div>

            <Link
              href="/"
              className="mb-10 flex w-fit items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>

            {!gymId ? (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.06]">
                  <QrCode className="h-5 w-5 text-amber-200" />
                </div>
                <p className="mt-7 text-sm font-medium text-violet-200">Registro de miembros</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  Necesitás el QR de tu gimnasio
                </h2>
                <p className="mt-4 text-sm leading-6 text-zinc-500">
                  Cada gimnasio tiene su propio código QR. Escanealo desde las instalaciones para abrir el registro correcto y vincular tu cuenta automáticamente.
                </p>

                <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                  <p className="text-sm font-medium text-zinc-300">¿Por qué usamos un QR?</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    El enlace incluye el identificador del gimnasio y evita que tu cuenta quede asociada a otra sucursal o empresa.
                  </p>
                </div>

                <Button asChild className="mt-6 h-12 w-full rounded-xl bg-white font-semibold text-zinc-950 hover:bg-zinc-200">
                  <Link href="/login">Ya tengo una cuenta</Link>
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-violet-200">Registro de miembro</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Creá tu cuenta en Kivra</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Tus datos quedarán vinculados al gimnasio desde el que escaneaste el QR.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <input type="hidden" name="gym_id" value={gymId} />

                  {error && (
                    <Alert
                      variant="destructive"
                      className="rounded-xl border-rose-500/20 bg-rose-500/[0.08] text-rose-300"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm text-zinc-300">
                      Nombre completo
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Juan Pérez"
                      required
                      className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-700 focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-zinc-300">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nombre@correo.com"
                      required
                      className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-700 focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm text-zinc-300">
                      Teléfono <span className="text-zinc-600">(opcional)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="3492 123456"
                      className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-700 focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm text-zinc-300">
                        Contraseña
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-700 focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm text-zinc-300">
                        Confirmar
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Repetí la contraseña"
                        required
                        className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-700 focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-white font-semibold text-zinc-950 hover:bg-zinc-200"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear cuenta
                  </Button>
                </form>

                <p className="mt-7 text-center text-sm text-zinc-600">
                  ¿Ya tenés cuenta?{" "}
                  <Link href="/login" className="font-medium text-violet-200 hover:text-violet-100">
                    Iniciá sesión
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b10]" />}>
      <RegisterForm />
    </Suspense>
  );
}
