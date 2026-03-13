import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Funciona realmente sin internet?",
    answer: "Si, Avileo esta disenado para funcionar 100% offline. Puedes registrar ventas, gestionar clientes y ver reportes sin conexion. Los datos se sincronizan automaticamente cuando recuperas la conexion."
  },
  {
    question: "Que pasa si pierdo mi telefono?",
    answer: "Tus datos estan seguros. Al sincronizar, toda la informacion se respalda en la nube. Si cambias de dispositivo, solo necesitas iniciar sesion y tus datos se descargaran automaticamente."
  },
  {
    question: "Cuantos usuarios puedo tener?",
    answer: "Depende de tu plan. El plan Basico incluye 1 usuario, Pro incluye 5 usuarios, y Empresa tiene usuarios ilimitados. Puedes agregar mas usuarios en cualquier momento."
  },
  {
    question: "Puedo exportar mis datos?",
    answer: "Si, en los planes Pro y Empresa puedes exportar tus ventas, clientes e inventario a Excel. Esto te permite hacer analisis adicionales o respaldos locales."
  },
  {
    question: "Como funciona la integracion con WhatsApp?",
    answer: "Puedes enviar comprobantes de venta directamente a tus clientes por WhatsApp. El sistema genera un mensaje automatico con los detalles de la compra que puedes enviar con un solo click."
  },
  {
    question: "Hay contrato de permanencia?",
    answer: "No, no hay contratos de permanencia. Puedes cancelar tu suscripcion en cualquier momento. Si cancelas, conservas acceso a tus datos hasta el final del periodo pagado."
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
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 text-slate-400">
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
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-slate-400 text-lg">
            Todo lo que necesitas saber sobre Avileo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
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
