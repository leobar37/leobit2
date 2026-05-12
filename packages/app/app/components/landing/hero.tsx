import { Link } from "react-router";
import { CheckCircle, Shield, ArrowRight, Cloud, TrendingUp, Users, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:pt-32 sm:pb-20 sm:px-6 lg:px-8">
      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-foreground min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
              Adiós papel.
              <br />
              <span className="text-orange-500">Lleva tus cuentas desde el celular.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
              Vende, cobra y controla tus cuentas sin papel ni cálculos manuales.
              Todo desde tu celular. Sin dolores de cabeza.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Button size="lg" asChild className="h-[52px] w-full min-w-0 max-w-full rounded-xl bg-orange-500 px-4 text-sm text-white transition-colors hover:bg-orange-600 min-[380px]:text-base sm:h-14 sm:w-auto sm:px-8 sm:text-lg">
                <Link to="/register">
                  Comenzar prueba gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <a href="#how-it-works" className="inline-flex h-12 items-center justify-center gap-2 px-4 text-base text-muted-foreground transition-colors hover:text-foreground sm:h-14 sm:px-8 sm:text-lg group">
                Ver cómo funciona
                <ArrowRight className="w-5 h-5 rotate-90 transition-transform group-hover:translate-y-1" />
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 lg:justify-start"
            >
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-2 rounded-full">
                <CheckCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs sm:text-sm">Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-2 rounded-full">
                <Cloud className="w-4 h-4 text-orange-500" />
                <span className="text-xs sm:text-sm">Datos seguros en la nube</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-2 rounded-full">
                <Shield className="w-4 h-4 text-orange-500" />
                <span className="text-xs sm:text-sm">Reportes al instante</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mx-auto w-full max-w-sm lg:max-w-md"
            aria-label="Vista previa del panel de Avileo"
          >
            <div className="rounded-[2rem] border border-border bg-muted/30 p-3 shadow-xl shadow-orange-500/10">
              <div className="rounded-[1.5rem] border border-border bg-background p-4">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Hoy</p>
                    <p className="text-lg font-semibold text-foreground">Cuentas claras</p>
                  </div>
                  <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                    En vivo
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-orange-500 p-4 text-white">
                    <WalletCards className="mb-3 h-5 w-5" />
                    <p className="text-xs text-white/80">Cobrado</p>
                    <p className="text-2xl font-bold">S/520</p>
                  </div>
                  <div className="rounded-xl bg-muted p-4">
                    <TrendingUp className="mb-3 h-5 w-5 text-orange-500" />
                    <p className="text-xs text-muted-foreground">Por cobrar</p>
                    <p className="text-2xl font-bold text-foreground">S/240</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Venta registrada", "Cliente Rosa Huamán", "S/120"],
                    ["Abono recibido", "Distribuidora San Pablo", "S/80"],
                    ["Ingreso cochera", "Placa B8K-402", "S/12"],
                  ].map(([title, detail, amount]) => (
                    <div key={title} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                          <Users className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{title}</p>
                          <p className="text-xs text-muted-foreground">{detail}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
