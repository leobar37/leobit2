import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Listo para transformar tu negocio?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Empieza hoy mismo con tu prueba gratis de 14 dias. Sin compromiso.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-12 py-6 h-14 rounded-xl">
              Comenzar prueba gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="text-slate-500 mt-4 text-sm">
            No se requiere tarjeta de credito
          </p>
        </motion.div>
      </div>
    </section>
  );
}
