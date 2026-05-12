import { motion } from "framer-motion";
import { Settings, UserPlus, CheckCircle, DollarSign, Truck, Wifi, BarChart3, Smartphone } from "lucide-react";

export function FlowAnimation() {
  return (
    <section id="how-it-works" className="overflow-hidden py-20 px-4 sm:py-24 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Un día de trabajo con Avileo
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Configura, registra y cierra el día.
            Todo desde tu celular, sin papel.
          </p>
        </motion.div>

        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Step 1: Configure */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Al empezar el día</p>
                    <h3 className="text-lg font-bold text-foreground">Configura</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <Settings className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Define tus productos, servicios o precios</p>
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
                    <UserPlus className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Registra tus clientes, vendedores o espacios</p>
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
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Tu negocio listo para operar...</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Step 2: Register operations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Durante el día</p>
                    <h3 className="text-lg font-bold text-foreground">Registra operaciones</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Venta al contado o crédito</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1 text-xs text-orange-500"
                      >
                        <Wifi className="w-3 h-3" />
                        <span>Sincronizado</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>S/120 cobrados al instante</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Entrega o ingreso registrado</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="flex items-center gap-1 text-xs text-orange-500"
                      >
                        <Wifi className="w-3 h-3" />
                        <span>Sincronizado</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      <span>Productos o servicios entregados</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Cada operación queda registrada</span>
                </div>
              </div>
            </motion.div>

            {/* Step 3: Close the day */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Al final del día</p>
                    <h3 className="text-lg font-bold text-foreground">Cierra con cuentas claras</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total del día</p>
                    <p className="text-2xl font-bold text-foreground">S/760</p>
                    <div className="flex items-center gap-1 text-xs text-orange-500 mt-1">
                      <BarChart3 className="w-3 h-3" />
                      <span>Ventas, entregas e ingresos</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Cobrado</p>
                      <p className="text-lg font-semibold text-foreground">S/520</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Por cobrar</p>
                      <p className="text-lg font-semibold text-foreground">S/240</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 mt-5 text-xs text-muted-foreground"
                >
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>Cuentas claras sin cuaderno</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
