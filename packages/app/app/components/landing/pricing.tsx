import { motion } from "framer-motion";
import { PricingCard } from "./pricing-card";

const plans = [
  {
    title: "Basico",
    price: "S/0",
    period: "/mes",
    description: "Para empezar",
    features: ["1 usuario", "Ventas basicas", "Hasta 50 clientes"],
    cta: "Comenzar gratis",
    highlighted: false
  },
  {
    title: "Pro",
    price: "S/99",
    period: "/mes",
    description: "Para negocios en crecimiento",
    features: ["5 usuarios", "Inventario completo", "Clientes ilimitados", "Reportes Excel", "WhatsApp"],
    cta: "Prueba gratis 14 dias",
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
];

export function PricingSection() {
  return (
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
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <PricingCard
                title={plan.title}
                price={plan.price}
                period={plan.period}
                description={plan.description}
                features={plan.features}
                cta={plan.cta}
                highlighted={plan.highlighted}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
