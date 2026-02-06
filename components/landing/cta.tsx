import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 
            className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Comienza Tu Transformacion Hoy
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Unete a nuestra comunidad y recibe tu primera semana GRATIS. 
            Sin compromisos, sin cargos ocultos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-base h-12 px-8"
              asChild
            >
              <Link href="/registro">
                Prueba Gratis 7 Dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-base h-12 px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              asChild
            >
              <Link href="#contacto">
                Contactar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
