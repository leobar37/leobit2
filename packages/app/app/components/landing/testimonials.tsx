import { motion } from "framer-motion";
import { TestimonialCard } from "./testimonial-card";

const testimonials = [
  {
    quote: "Antes perdia ventas por no tener internet en el mercado. Ahora vendo tranquilo y todo se sincroniza cuando tengo wifi. Ha cambiado mi negocio.",
    author: "Juan Perez",
    role: "Vendedor de pollo, Mercado Central"
  },
  {
    quote: "Puedo ver en tiempo real cuanto vendio cada vendedor. El control que tengo ahora sobre mi negocio es increible. Lo recomiendo totalmente.",
    author: "Maria Garcia",
    role: "Propietaria, Avicola El Dorado"
  },
  {
    quote: "Trabajamos en zonas rurales donde no hay internet. Avileo nos permite vender sin preocupaciones y sincronizar cuando volvemos a la ciudad.",
    author: "Carlos Rodriguez",
    role: "Distribuidor, Zona Rural"
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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Empresarios que ya transformaron su negocio con Avileo.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
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
