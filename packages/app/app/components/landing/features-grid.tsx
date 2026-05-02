import { motion } from "framer-motion";
import { Calculator, ShoppingCart, Users, Package, BarChart3, MessageCircle } from "lucide-react";
import { FeatureCard } from "./feature-card";

const features = [
  {
    icon: Calculator,
    title: "Calculadora Automatica",
    description: "Peso × precio/kg con resta de tara. Tus vendedores cobran rapido y sin errores."
  },
  {
    icon: ShoppingCart,
    title: "Venta Rapida y Precisa",
    description: "Contado o credito, con o sin cliente. Registra cada venta en segundos desde el celular."
  },
  {
    icon: Users,
    title: "Clientes y Cuentas al Dia",
    description: "Sabe quien debe, cuanto y cuando cobraste. Ninguna deuda se pierde."
  },
  {
    icon: Package,
    title: "Inventario Siempre Claro",
    description: "Asigna inventario por vendedor y controla lo vendido en tiempo real. Sin sorpresas."
  },
  {
    icon: BarChart3,
    title: "Numeros que Deciden por Ti",
    description: "Dashboard con metricas claras y exportacion a Excel. Deja de calcular de memoria."
  },
  {
    icon: MessageCircle,
    title: "WhatsApp sin Complicaciones",
    description: "Envia comprobantes directo al celular del cliente. Mas profesionalismo, menos preguntas."
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
            Funciones completas disenadas para avicolas y negocios con equipo de ventas en campo.
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
