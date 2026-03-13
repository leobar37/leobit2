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
    { title: "Avileo - Sistema de Ventas Offline para Avicolas" },
    { name: "description", content: "Sistema de gestion de ventas 100% offline. Vende sin internet, controla inventario y clientes. Ideal para avicolas y negocios locales." },
    { name: "keywords", content: "sistema de ventas, offline, avicola, inventario, control de clientes" },
    { property: "og:title", content: "Avileo - Vende sin internet" },
    { property: "og:description", content: "El sistema de ventas que funciona donde otros no. 100% offline." },
    { property: "og:url", content: "https://avileo.com" },
  ];
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
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
