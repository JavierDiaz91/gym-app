"use client";

import Link from "next/link";
import { Activity, Facebook, Instagram, Twitter, Youtube, Mail, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer id="contacto" className="bg-[#0a0c0f] text-gray-300 pt-16 pb-8 border-t border-gray-800/80">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-[#00aeef]/10 border border-[#00aeef]/30 rounded-xl flex items-center justify-center shadow-md shadow-[#00aeef]/10">
                <Activity className="w-5 h-5 text-[#00aeef]" />
              </div>
              <span 
                className="text-2xl font-extrabold text-white tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Pulse<span className="text-[#00aeef]">Fit</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Tu gimnasio de confianza desde 2015. Transformando vidas a través del entrenamiento, la motivación y la salud.
            </p>
            <div className="flex gap-3 pt-2">
              <a 
                href="#" 
                className="w-9 h-9 rounded-lg bg-[#14171d] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-black hover:bg-[#00aeef] hover:border-[#00aeef] transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-lg bg-[#14171d] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-black hover:bg-[#00aeef] hover:border-[#00aeef] transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-lg bg-[#14171d] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-black hover:bg-[#00aeef] hover:border-[#00aeef] transition-all duration-300"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-lg bg-[#14171d] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-black hover:bg-[#00aeef] hover:border-[#00aeef] transition-all duration-300"
                aria-label="Youtube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wide uppercase text-xs">Enlaces Rápidos</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#servicios" className="text-gray-400 hover:text-[#00aeef] transition-colors">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="#planes" className="text-gray-400 hover:text-[#00aeef] transition-colors">
                  Planes de Membresía
                </Link>
              </li>
              <li>
                <Link href="#clases" className="text-gray-400 hover:text-[#00aeef] transition-colors">
                  Clases Grupales
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-[#00aeef] transition-colors flex items-center gap-1.5 font-medium">
                  Portal de Miembros
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wide uppercase text-xs">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#00aeef] mt-0.5 flex-shrink-0" />
                <span>Av. Principal 123, Centro, CP 12345</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#00aeef] flex-shrink-0" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#00aeef] flex-shrink-0" />
                <span>info@pulsefit.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wide uppercase text-xs">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Recibí consejos de entrenamiento, nutrición y promociones exclusivas en tu correo.
            </p>
            <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input 
                type="email" 
                placeholder="Tu email..." 
                className="bg-[#14171d] border-gray-800 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#00aeef] focus-visible:border-[#00aeef] h-10 text-sm"
              />
              <Button className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold rounded-xl h-10 px-4 transition-all flex-shrink-0">
                Suscribir
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 mt-4 text-center text-gray-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} PulseFit Gym. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Términos y Condiciones</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Política de Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
}