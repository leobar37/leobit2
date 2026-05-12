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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Deja el papel y ordena tu negocio hoy
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Cuentas claras, menos desorden y más control desde el primer día.
          </p>
          <Button size="lg" asChild className="h-[52px] w-full max-w-full rounded-xl bg-orange-500 px-4 text-sm text-white transition-colors hover:bg-orange-600 min-[380px]:text-base sm:h-14 sm:w-auto sm:px-12 sm:text-lg">
            <Link to="/register">
              Comenzar prueba gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            No se requiere tarjeta de crédito
          </p>
        </motion.div>
      </div>
    </section>
  );
}
