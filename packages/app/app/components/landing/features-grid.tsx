import { motion } from "framer-motion";
import { Calculator, ShoppingCart, Users, Package, BarChart3, MessageCircle } from "lucide-react";
import { FeatureCard } from "./feature-card";

const features = [
  {
    icon: Calculator,
    title: "Cuentas Claras al Instante",
    description: "Precio x cantidad automático. Tus cobros son rápidos y sin errores de cálculo."
  },
  {
    icon: ShoppingCart,
    title: "Venta Rápida y Precisa",
    description: "Contado o crédito, con o sin cliente. Registra cada venta en segundos desde el celular."
  },
  {
    icon: Users,
    title: "Clientes y Cuentas al Día",
    description: "Sabe quién debe, cuánto y cuándo cobraste. Ninguna deuda se pierde."
  },
  {
    icon: Package,
    title: "Controla tu Inventario",
    description: "Lleva el control de tu stock y lo que vendes en tiempo real. Sin sorpresas ni faltantes."
  },
  {
    icon: BarChart3,
    title: "Números que Deciden por Ti",
    description: "Dashboard con métricas claras y exportación a Excel. Deja de calcular de memoria."
  },
  {
    icon: MessageCircle,
    title: "WhatsApp sin Complicaciones",
    description: "Envía comprobantes directo al celular del cliente. Más profesionalismo, menos preguntas."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Todo lo que necesitas para tu negocio
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Funciones completas para cualquier negocio que vende, cobra y controla sus cuentas.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
