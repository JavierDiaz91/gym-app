import Link from "next/link";
import { Dumbbell, Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer id="contacto" className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span 
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                FitZone
              </span>
            </Link>
            <p className="text-background/70 mb-6">
              Tu gimnasio de confianza desde 2015. Transformando vidas a traves del fitness.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Enlaces Rapidos</h4>
            <ul className="space-y-2">
              <li><Link href="#servicios" className="text-background/70 hover:text-primary transition-colors">Servicios</Link></li>
              <li><Link href="#planes" className="text-background/70 hover:text-primary transition-colors">Planes</Link></li>
              <li><Link href="#clases" className="text-background/70 hover:text-primary transition-colors">Clases</Link></li>
              <li><Link href="/login" className="text-background/70 hover:text-primary transition-colors">Portal Miembros</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-background/70">
              <li>Av. Principal 123, Centro</li>
              <li>Ciudad, CP 12345</li>
              <li>Tel: (555) 123-4567</li>
              <li>info@fitzone.com</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-background/70 mb-4">
              Recibe consejos de fitness y ofertas exclusivas.
            </p>
            <form className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Tu email" 
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
              />
              <Button variant="default" size="default">
                Suscribir
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center text-background/50 text-sm">
          <p>&copy; {new Date().getFullYear()} FitZone Gym. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
