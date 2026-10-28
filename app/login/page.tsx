"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { loginUser } from "@/app/actions";

const features = [
  "Miembros, cobros y membresías conectados",
  "Paneles específicos para cada rol",
  "Operación multi-gimnasio con datos aislados",
];

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
      if (result.user?.role === "superadmin") router.push("/admin/gimnasios");
      else if (result.user?.role === "admin") router.push("/admin");
      else if (result.user?.role === "trainer") router.push("/trainer");
      else router.push("/miembro");
    }
  }

  return (
    <main className="min-h-screen bg-[#071320] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/[0.06] p-10 lg:flex lg:flex-col xl:p-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-16 top-24 h-80 w-80 rounded-full bg-blue-600/20 blur-[120px]" />
            <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-[#00d5d0]/10 blur-[120px]" />
          </div>

          <Link href="/" className="relative inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00d5d0]/30 bg-[#071827]">
              <Image src="/icon.svg" alt="Isotipo Kivra" width={32} height={32} className="h-8 w-8" />
            </div>
            <div>
              <span className="block text-xl font-semibold tracking-[-0.04em]">Kivra</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-zinc-400">Gym Management</span>
            </div>
          </Link>

          <div className="relative my-auto max-w-xl py-16">
            <p className="text-sm font-medium text-[#67e8e3]">Gestión inteligente para gimnasios.</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.03] tracking-[-0.055em] xl:text-6xl">
              Toda tu operación,
              <span className="block text-[#20c9ed]">en un solo lugar.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-400">
              Accedé a la información que corresponde a tu rol y continuá trabajando con una experiencia clara y centralizada.
            </p>

            <div className="mt-10 space-y-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-[#67e8e3]" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-zinc-400">&copy; {new Date().getFullYear()} Kivra</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-[#67e8e3]" />
                Kivra
              </Link>
            </div>

            <Link href="/" className="mb-10 flex w-fit items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-300">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>

            <p className="text-sm font-medium text-[#67e8e3]">Bienvenido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Iniciá sesión en Kivra</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Usá las credenciales asociadas a tu gimnasio.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/[0.08] text-rose-300">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-zinc-300">Correo electrónico</Label>
                <Input id="email" name="email" type="email" placeholder="nombre@correo.com" required className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-400 focus-visible:border-[#00d5d0]/50 focus-visible:ring-[#00d5d0]/20" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-zinc-300">Contraseña</Label>
                <Input id="password" name="password" type="password" placeholder="Ingresá tu contraseña" required className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] text-white placeholder:text-zinc-400 focus-visible:border-[#00d5d0]/50 focus-visible:ring-[#00d5d0]/20" />
              </div>

              <Button type="submit" className="h-12 w-full rounded-xl bg-[#00d5d0] font-semibold text-[#071320] hover:bg-[#2ae8e2]" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>

            <div className="mt-7 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-sm text-zinc-400">
                ¿Sos miembro y todavía no tenés cuenta?{" "}
                <Link href="/registro" className="font-medium text-[#67e8e3] hover:text-violet-100">
                  Registrate con el QR de tu gimnasio
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
