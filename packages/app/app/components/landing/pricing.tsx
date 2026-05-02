import { motion } from "framer-motion";
import { PricingCard } from "./pricing-card";

const plans = [
  {
    title: "Basico",
    price: "S/0",
    period: "/mes",
    description: "Ordena tus primeras ventas",
    features: ["1 usuario", "Ventas basicas", "Hasta 50 clientes"],
    cta: "Comenzar gratis",
    highlighted: false
  },
  {
    title: "Pro",
    price: "S/99",
    period: "/mes",
    description: "Para equipos que venden todos los dias",
    features: ["5 usuarios", "Inventario completo", "Clientes ilimitados", "Reportes Excel", "WhatsApp"],
    cta: "Prueba gratis 14 dias",
    highlighted: true
  },
  {
    title: "Empresa",
    price: "Custom",
    period: "",
    description: "Para operaciones con varias sedes o integraciones",
    features: ["Usuarios ilimitados", "API access", "Soporte 24/7", "Dominio propio", "Integraciones"],
    cta: "Contactar ventas",
    highlighted: false
  }
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Planes claros para crecer sin desorden
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Empieza gratis y sube de plan cuando tu operacion necesite mas control.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
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
