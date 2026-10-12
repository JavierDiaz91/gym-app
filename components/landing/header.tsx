"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "#producto", label: "Producto" },
  { href: "#modulos", label: "Módulos" },
  { href: "#roles", label: "Para cada rol" },
  { href: "#contacto", label: "Contacto" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_40px_rgba(124,58,237,0.18)]">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/35 to-cyan-400/10" />
        <Sparkles className="relative h-5 w-5 text-violet-200" />
      </div>
      <div className="leading-none">
        <span className="block text-xl font-semibold tracking-[-0.04em] text-white">Kivra</span>
        <span className="mt-1 block text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
          Gym Management
        </span>
      </div>
    </Link>
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#090b10]/75 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-18 items-center justify-between">
          <Brand />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" className="rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button className="rounded-xl bg-white text-zinc-950 hover:bg-zinc-200" asChild>
              <Link href="#producto">Conocer Kivra</Link>
            </Button>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-xl text-zinc-300 hover:bg-white/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[310px] border-white/10 bg-[#0b0e14] text-white">
              <SheetHeader>
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Brand />
              </div>
              <nav className="mt-10 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl px-3 py-3 text-base font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-5 grid gap-3 border-t border-white/10 pt-5">
                  <Button variant="outline" className="rounded-xl border-white/10 bg-transparent text-white" asChild>
                    <Link href="/login">Iniciar sesión</Link>
                  </Button>
                  <Button className="rounded-xl bg-white text-zinc-950" asChild>
                    <Link href="#producto">Conocer Kivra</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}