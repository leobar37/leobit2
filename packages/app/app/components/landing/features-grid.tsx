import { motion } from "framer-motion";
import { Calculator, ShoppingCart, Users, Package, BarChart3, MessageCircle } from "lucide-react";
import { FeatureCard } from "./feature-card";

const features = [
  {
    icon: Calculator,
    title: "Calculadora Inteligente",
    description: "Calcula precios automaticamente: peso × precio/kg. Incluye resta de tara.",
    gradient: "from-orange-500 to-orange-600"
  },
  {
    icon: ShoppingCart,
    title: "Ventas Simplificadas",
    description: "Registra ventas con o sin cliente. Contado o credito. Todo en segundos.",
    gradient: "from-blue-500 to-blue-600"
  },
  {
    icon: Users,
    title: "Clientes y Deudas",
    description: "Gestiona clientes y controla cuentas por cobrar. Nunca pierdas dinero.",
    gradient: "from-purple-500 to-purple-600"
  },
  {
    icon: Package,
    title: "Control de Inventario",
    description: "Asigna inventario diario a cada vendedor y controla lo vendido en tiempo real.",
    gradient: "from-green-500 to-green-600"
  },
  {
    icon: BarChart3,
    title: "Reportes y Analiticas",
    description: "Dashboard con metricas y exportacion a Excel. Toma decisiones con datos.",
    gradient: "from-pink-500 to-pink-600"
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Integrado",
    description: "Envia comprobantes por WhatsApp directamente. Tus clientes quedan tranquilos.",
    gradient: "from-teal-500 to-teal-600"
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
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      
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
            Funciones completas disenadas para avicolas y negocios con equipo de ventas en campo.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
