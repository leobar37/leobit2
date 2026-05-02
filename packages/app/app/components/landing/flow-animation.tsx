import { motion } from "framer-motion";
import { Building2, Truck, Cloud, Wifi, Package, TrendingUp, Users, Smartphone } from "lucide-react";

export function FlowAnimation() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Un dia de trabajo con Avileo
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Desde la asignacion de inventario hasta el cierre del dia.
            Todo actualizado en tiempo real.
          </p>
        </motion.div>

        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Admin Node */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">06:00 AM</p>
                    <h3 className="text-lg font-bold text-foreground">Admin</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <Package className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Asigna 50kg a Juan</p>
                      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8, duration: 0.8 }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <Package className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Asigna 40kg a Maria</p>
                      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "80%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 1, duration: 0.8 }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 mt-5 text-xs text-muted-foreground"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Disponible para tus vendedores...</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Vendor Node */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">08:00 AM - 06:00 PM</p>
                    <h3 className="text-lg font-bold text-foreground">Vendedores</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Juan - Mercado Central</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1 text-xs text-orange-500"
                      >
                        <Wifi className="w-3 h-3" />
                        <span>Online</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>35kg vendidos</span>
                      <span className="text-border">•</span>
                      <span>S/420</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Maria - Mercado Mayorista</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="flex items-center gap-1 text-xs text-orange-500"
                      >
                        <Wifi className="w-3 h-3" />
                        <span>Online</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>28kg vendidos</span>
                      <span className="text-border">•</span>
                      <span>S/340</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>2 vendedores activos</span>
                </div>
              </div>
            </motion.div>

            {/* Dashboard Node */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">07:00 PM</p>
                    <h3 className="text-lg font-bold text-foreground">Dashboard</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ventas del dia</p>
                    <p className="text-2xl font-bold text-foreground">S/760</p>
                    <div className="flex items-center gap-1 text-xs text-orange-500 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12% vs ayer</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Juan</p>
                      <p className="text-lg font-semibold text-foreground">S/420</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Maria</p>
                      <p className="text-lg font-semibold text-foreground">S/340</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 mt-5 text-xs text-muted-foreground"
                >
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>Informacion actualizada</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
