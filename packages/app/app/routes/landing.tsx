import { Link } from "react-router";
import { Store, CheckCircle, Wifi, Server, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Route } from "./+types/landing";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo - Sistema de Ventas Offline para Avícolas" },
    { name: "description", content: "Sistema de gestión de ventas 100% offline. Vende sin internet, controla inventario y clientes. Ideal para avícolas y negocios locales." },
    { name: "keywords", content: "sistema de ventas, offline, avícola, inventario, control de clientes" },
    { property: "og:title", content: "Avileo - Vende sin internet" },
    { property: "og:description", content: "El sistema de ventas que funciona donde otros no. 100% offline." },
    { property: "og:url", content: "https://avileo.com" },
  ];
}

const features = [
  {
    icon: "🧮",
    title: "Calculadora Inteligente",
    description: "Calcula precios automáticamente: peso × precio/kg. Incluye resta de tara."
  },
  {
    icon: "🛒",
    title: "Ventas",
    description: "Registra ventas con o sin cliente. Contado o crédito."
  },
  {
    icon: "👥",
    title: "Clientes y Deudas",
    description: "Gestiona clientes y controla cuentas por cobrar."
  },
  {
    icon: "📦",
    title: "Inventario",
    description: "Asigna inventario diario a cada vendedor y controla lo vendido."
  },
  {
    icon: "📊",
    title: "Reportes",
    description: "Dashboard con métricas y exportación a Excel."
  },
  {
    icon: "💬",
    title: "WhatsApp",
    description: "Envía comprobantes por WhatsApp directamente."
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Avileo</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Características</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">Cómo funciona</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Precios</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Iniciar sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Prueba gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-8">
              <Wifi className="w-4 h-4 text-orange-500" />
              <span className="text-orange-400 text-sm font-medium">100% Offline - Funciona sin internet</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Vende sin internet.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                Trabaja sin límites.
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              El sistema de ventas offline-first diseñado para avícolas y negocios locales.
              Tus vendedores venden desde cualquier lugar, tú tienes el control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 h-14 rounded-xl">
                  Comenzar prueba gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-slate-300 border-slate-700 hover:bg-slate-800 text-lg px-8 py-6 h-14 rounded-xl">
                Ver demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Server className="w-5 h-5 text-orange-500" />
                <span>Sin servidores</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span>Sync automático</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para tu negocio
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Funciones completas diseñadas para avícolas y negocios con equipo de ventas en campo.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={item}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Un flujo simple que se adapta a tu día a día.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Asigna",
                description: "El admin asigna inventario diario a cada vendedor desde la mañana.",
                icon: "📦"
              },
              {
                step: "2",
                title: "Vende",
                description: "Los vendedores registran ventas offline durante todo el día, sin internet.",
                icon: "🛒"
              },
              {
                step: "3",
                title: "Sincroniza",
                description: "Cuando hay conexión, todo se sincroniza automáticamente.",
                icon: "🔄"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">{item.icon}</span>
                </div>
                <div className="text-orange-500 font-bold text-lg mb-2">Paso {item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Planes simples y transparentes
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tu negocio.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Básico",
                price: "S/0",
                period: "/mes",
                description: "Para empezar",
                features: ["1 usuario", "Ventas básicas", "Hasta 50 clientes"],
                cta: "Comenzar gratis",
                highlighted: false
              },
              {
                title: "Pro",
                price: "S/99",
                period: "/mes",
                description: "Para negocios en crecimiento",
                features: ["5 usuarios", "Inventario completo", "Clientes ilimitados", "Reportes Excel", "WhatsApp"],
                cta: "Prueba gratis 14 días",
                highlighted: true
              },
              {
                title: "Empresa",
                price: "Custom",
                period: "",
                description: "Para grandes operaciones",
                features: ["Usuarios ilimitados", "API access", "Soporte 24/7", "Dominio propio", "Integraciones"],
                cta: "Contactar ventas",
                highlighted: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-orange-500/20 to-slate-800 border-2 border-orange-500"
                    : "bg-slate-800/50 border border-slate-700"
                }`}
              >
                <h3 className="text-xl font-semibold text-white mb-2">{plan.title}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="text-slate-400 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ¿Listo para transformar tu negocio?
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Empieza hoy mismo con tu prueba gratis de 14 días. Sin compromiso.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-12 py-6 h-14 rounded-xl">
                Comenzar prueba gratis
              <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-slate-500 mt-4 text-sm">
              No se requiere tarjeta de crédito
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Avileo</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 Avileo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
