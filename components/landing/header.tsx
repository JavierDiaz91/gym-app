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
import { Menu, Activity } from "lucide-react";
import { useState } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#servicios", label: "Servicios" },
  { href: "#planes", label: "Planes" },
  { href: "#clases", label: "Clases" },
  { href: "#contacto", label: "Contacto" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0f12]/80 backdrop-blur-md border-b border-gray-800/60 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#00aeef]/10 border border-[#00aeef]/30 rounded-xl flex items-center justify-center shadow-md shadow-[#00aeef]/10">
              <Activity className="w-5 h-5 text-[#00aeef]" />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pulse<span className="text-[#00aeef]">Fit</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-gray-300 hover:text-[#00aeef] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-semibold" 
              asChild
            >
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button 
              className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold rounded-xl text-sm shadow-md shadow-[#00aeef]/20 transition-all" 
              asChild
            >
              <Link href="/registro">Unirse Ahora</Link>
            </Button>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-xl text-gray-300 hover:bg-white/10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] bg-[#14171d] border-gray-800 text-white">
              {/* ✅ FIX ACCESIBILIDAD */}
              <SheetHeader>
                <VisuallyHidden>
                  <SheetTitle>Menú de navegación</SheetTitle>
                </VisuallyHidden>
              </SheetHeader>

              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-semibold text-gray-300 hover:text-[#00aeef] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-800">
                  <Button variant="outline" className="rounded-xl border-gray-700 text-white hover:bg-white/10 bg-transparent" asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold rounded-xl shadow-md shadow-[#00aeef]/20" asChild>
                    <Link href="/registro">Unirse Ahora</Link>
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