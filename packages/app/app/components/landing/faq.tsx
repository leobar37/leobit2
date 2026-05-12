import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "¿Para qué tipos de negocio sirve Avileo?",
    answer: "Avileo funciona para cualquier negocio que lleve ventas, clientes e inventario. Está pensado para distribuidoras de agua, pollerías y avícolas, cocheras y estacionamientos, bodegas, y muchos más. Si aún usas cuaderno y lápiz, Avileo es para ti."
  },
  {
    question: "¿Necesito instalar algo?",
    answer: "No. Avileo funciona desde el navegador de tu computadora o celular. Solo necesitas iniciar sesión y empezar a registrar tu operación."
  },
  {
    question: "¿Cómo reemplazo mi cuaderno con Avileo?",
    answer: "Es más simple de lo que piensas. Registras a tus clientes una vez y desde ahí anotas cada venta, abono o fiado con dos toques. Ya no necesitas sumar a mano ni buscar hojas perdidas — todo está ordenado y disponible al instante."
  },
  {
    question: "¿Mis datos están seguros?",
    answer: "Sí. La información se guarda en la nube con acceso protegido por usuario y contraseña. Además puedes exportar tus datos en cualquier momento."
  },
  {
    question: "¿Cuántos usuarios puedo tener?",
    answer: "Depende de tu plan. El plan Básico incluye 1 usuario, Pro incluye 5 usuarios, y Empresa tiene usuarios ilimitados. Puedes agregar más usuarios en cualquier momento."
  },
  {
    question: "¿Puedo exportar mis datos?",
    answer: "Sí, en los planes Pro y Empresa puedes exportar tus ventas, clientes e inventario a Excel para análisis o control contable."
  },
  {
    question: "¿Cómo funciona la integración con WhatsApp?",
    answer: "Puedes enviar comprobantes de venta directamente a tus clientes por WhatsApp. El sistema genera un mensaje automático con los detalles de la compra que puedes enviar con un solo clic."
  },
  {
    question: "¿Hay contrato de permanencia?",
    answer: "No, no hay contratos de permanencia. Puedes cancelar tu suscripción en cualquier momento. Si cancelas, conservas acceso a tus datos hasta el final del período pagado."
  }
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-5 text-left hover:text-orange-500 transition-colors"
      >
        <span className="text-foreground font-medium pr-4 text-left">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="pb-5 text-muted-foreground text-sm leading-relaxed">
          {answer}
        </div>
      </motion.div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Preguntas frecuentes
          </h2>
          <p className="text-muted-foreground">
            Todo lo que necesitas saber sobre Avileo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
