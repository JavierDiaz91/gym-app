import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Services } from "@/components/landing/services";
import { Pricing } from "@/components/landing/pricing";
import { Classes } from "@/components/landing/classes";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Services />
      <Pricing />
      <Classes />
      <CTA />
      <Footer />
    </main>
  );
}
