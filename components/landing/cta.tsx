import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#14171d] via-[#0d0f12] to-black relative overflow-hidden border-t border-gray-800/60">
      {/* Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00aeef]/15 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00aeef]/10 rounded-full blur-3xl translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-[#00aeef] font-bold uppercase tracking-wider text-xs bg-[#00aeef]/10 border border-[#00aeef]/30 px-3.5 py-1.5 rounded-full mb-6 backdrop-blur-md">
            ¡Comenzá Hoy Mismo!
          </span>

          <h2 
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Comenzá Tu Transformación Hoy
          </h2>

          <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed font-normal">
            Sumate a nuestra comunidad y recibí tu primera semana <strong className="text-[#00aeef] font-semibold">GRATIS</strong>. 
            Sin compromisos, ni cargos ocultos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold text-base h-12 px-8 rounded-xl shadow-lg shadow-[#00aeef]/25 w-full sm:w-auto transition-all uppercase tracking-wide"
              asChild
            >
              <Link href="/registro">
                Prueba Gratis 7 Días
                <ArrowRight className="ml-2 h-5 w-5 stroke-[2.5]" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="text-base h-12 px-8 border-gray-800 text-white hover:bg-white/10 bg-black/40 backdrop-blur-sm rounded-xl font-semibold w-full sm:w-auto hover:border-gray-700"
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