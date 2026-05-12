import { motion } from "framer-motion";
import { TestimonialCard } from "./testimonial-card";

const testimonials = [
  {
    quote: "Ahora veo cuánto vendió cada vendedor sin esperar al cierre del día. Tomo decisiones más rápido y con números claros. Ha cambiado mi negocio.",
    author: "Juan Pérez",
    role: "Propietario, Avícola El Dorado"
  },
  {
    quote: "Antes anotaba los pedidos de agua en hojas sueltas y siempre perdía cuentas. Con Avileo registro clientes, controlo los envases y sé exactamente cuánto me deben.",
    author: "Rosa Huamán",
    role: "Propietaria, Distribuidora San Pablo (Agua)"
  },
  {
    quote: "Llevar el control de entradas y salidas del estacionamiento en papel era un desorden. Ahora veo los ingresos del día en tiempo real y cierro sin dolores de cabeza.",
    author: "Miguel Torres",
    role: "Administrador, Estacionamiento Central"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Empresarios que ya transformaron su negocio con Avileo.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
