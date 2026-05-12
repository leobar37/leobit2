import type { Route } from "./+types/landing";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { UseCasesSection } from "@/components/landing/use-cases";
import { FlowAnimation } from "@/components/landing/flow-animation";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { PricingSection } from "@/components/landing/pricing";
import { FAQSection } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo - Adiós papel, lleva tus cuentas desde el celular" },
    { name: "description", content: "Controla tus ventas, clientes, cobros y reportes desde tu celular. Avileo es el cuaderno digital para pequeños negocios que quieren dejar el papel y tener cuentas claras." },
    { name: "keywords", content: "cuaderno digital, app de negocios, control de cuentas, ventas, cobros, sistema de ventas, control de inventario, reparto de agua, avicola, cochera" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Avileo - Adiós papel, lleva tus cuentas desde el celular" },
    { property: "og:description", content: "Vende, cobra y controla tus cuentas sin papel. Ideal para pequeños negocios de reparto de agua, avícolas y cocheras." },
    { property: "og:url", content: "https://avileo.com" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Avileo - Adiós papel, lleva tus cuentas desde el celular" },
    { name: "twitter:description", content: "Vende, cobra y controla tus cuentas sin papel. Ideal para pequeños negocios de reparto de agua, avícolas y cocheras." },
  ];
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Saltar al contenido principal
      </a>
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <FeaturesGrid />
        <UseCasesSection />
        <FlowAnimation />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
