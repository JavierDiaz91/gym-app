import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_0%,transparent_50%)] z-10" />
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-foreground/70" />
      
      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary-foreground/90">Nuevas instalaciones 2026</span>
          </div>
          
          <h1 
            className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tu Mejor <br />
            <span className="text-primary">Version</span> <br />
            Comienza Aqui
          </h1>
          
          <p className="text-lg text-white/80 mb-8 max-w-lg leading-relaxed">
            Transforma tu cuerpo y mente con nuestros programas personalizados, 
            equipos de ultima generacion y entrenadores certificados.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="text-base h-12 px-8" asChild>
              <Link href="/registro">
                Empieza Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-base h-12 px-8 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <Play className="mr-2 h-5 w-5" />
              Ver Tour Virtual
            </Button>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/20">
            <div>
              <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>2,500+</p>
              <p className="text-sm text-white/60">Miembros Activos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>50+</p>
              <p className="text-sm text-white/60">Clases Semanales</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>15</p>
              <p className="text-sm text-white/60">Entrenadores Pro</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
