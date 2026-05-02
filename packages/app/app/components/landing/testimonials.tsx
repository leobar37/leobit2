import { motion } from "framer-motion";
import { TestimonialCard } from "./testimonial-card";

const testimonials = [
  {
    quote: "Ahora veo cuanto vendio cada vendedor sin esperar al cierre del dia. Tomo decisiones mas rapido y con numeros claros. Ha cambiado mi negocio.",
    author: "Juan Perez",
    role: "Propietario, Avicola El Dorado"
  },
  {
    quote: "Antes llevaba clientes y deudas en un cuaderno. Con Avileo se quien debe, cuanto debe y que se cobro hoy. Mi cobranza esta bajo control.",
    author: "Maria Garcia",
    role: "Propietaria, Avicola San Jose"
  },
  {
    quote: "El inventario ya no se me escapa. Asigno kilos, reviso ventas en tiempo real y cierro el dia con mas orden y menos perdidas.",
    author: "Carlos Rodriguez",
    role: "Administrador, Pollo Delicia"
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
