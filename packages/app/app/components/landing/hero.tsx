import { Link } from "react-router";
import { CheckCircle, Shield, ArrowRight, Cloud } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Controla tu negocio
            <br />
            <span className="text-orange-500">en tiempo real.</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Ventas, inventario, clientes y cobranza. Todo en una sola plataforma online.
            Desde el celular de tu vendedor hasta tu panel de administracion.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 h-14 rounded-xl transition-colors">
              <Link to="/register">
                Comenzar prueba gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-lg px-8 py-3 h-14 transition-colors group">
              Ver como funciona
              <ArrowRight className="w-5 h-5 rotate-90 group-hover:translate-y-1 transition-transform" />
            </a>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6"
          >
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Sin tarjeta de credito</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Cloud className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Datos seguros en la nube</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Reportes al instante</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
