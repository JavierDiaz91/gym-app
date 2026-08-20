import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-[#0d0f12] overflow-hidden pt-16">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop"
          alt="PulseFit Gym Background"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 z-10 relative py-16 md:py-24">
        <div className="max-w-3xl space-y-8">
          
          {/* Badge llamativo */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00aeef]/10 border border-[#00aeef]/30 text-[#00aeef] text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00aeef] animate-pulse" />
            Superá tus límites
          </div>

          {/* Título de alto impacto */}
          <h1 
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ENTRENÁ <br />
            SIN EXCUSAS. <br />
            <span className="text-[#00aeef]">TRANSFORMÁ</span> TU VIDA.
          </h1>

          {/* Bajada directa */}
          <p className="text-lg md:text-xl text-gray-300 max-w-xl font-normal leading-relaxed">
            El espacio, la disciplina y el ambiente que necesitás para alcanzar tu mejor versión física.
          </p>

          {/* Botones de acción directos */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="lg" 
              className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold text-base h-13 px-8 rounded-xl shadow-lg shadow-[#00aeef]/25 transition-all uppercase tracking-wide"
              asChild
            >
              <Link href="/registro">
                Inscribirme Ahora
                <ArrowRight className="ml-2 h-5 w-5 stroke-[2.5]" />
              </Link>
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="text-base h-13 px-8 border-gray-800 text-white hover:bg-white/10 bg-black/40 backdrop-blur-sm rounded-xl font-semibold hover:border-gray-700"
              asChild
            >
              <Link href="#planes" className="flex items-center gap-2">
                Conocer Planes
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}