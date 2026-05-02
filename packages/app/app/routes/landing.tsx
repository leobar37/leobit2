import type { Route } from "./+types/landing";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { FlowAnimation } from "@/components/landing/flow-animation";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { PricingSection } from "@/components/landing/pricing";
import { FAQSection } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo - Sistema de Ventas Online para Avicolas" },
    { name: "description", content: "Sistema de gestion de ventas online. Controla inventario, clientes y vendedores en tiempo real. Ideal para avicolas y negocios con equipo de campo." },
    { name: "keywords", content: "sistema de ventas, avicola, inventario, control de clientes, gestion de vendedores" },
    { property: "og:title", content: "Avileo - Controla tu negocio avicola en tiempo real" },
    { property: "og:description", content: "La plataforma de ventas que organiza tu operacion, vendedores e inventario desde cualquier dispositivo." },
    { property: "og:url", content: "https://avileo.com" },
  ];
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <HeroSection />
      <FeaturesGrid />
      <FlowAnimation />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
