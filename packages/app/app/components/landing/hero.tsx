import { Link } from "react-router";
import { CheckCircle, Shield, ArrowRight, WifiOff, Cloud } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* New badge - dual capability */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-blue-500/20 border border-orange-500/30 rounded-full px-4 py-2 mb-8"
          >
            <Cloud className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300 text-sm font-medium">Online +</span>
            <WifiOff className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Respaldo Offline</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Tu negocio siempre
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-blue-400">
              en movimiento.
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Sistema de ventas en la nube con respaldo offline. 
            Cuando hay internet, todo synca automaticamente. 
            Cuando no, sigues vendiendo sin perder datos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg px-8 py-6 h-14 rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40">
                Comenzar prueba gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white text-lg px-8 py-3 h-14 transition-colors group">
              Ver como funciona
              <ArrowRight className="w-5 h-5 rotate-90 group-hover:translate-y-1 transition-transform" />
            </a>
          </div>

          {/* Trust Badges - updated messaging */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6"
          >
            <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Sin tarjeta de credito</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full">
              <Cloud className="w-5 h-5 text-blue-400" />
              <span>Datos en la nube</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full">
              <Shield className="w-5 h-5 text-orange-500" />
              <span>Respaldo offline incluido</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
