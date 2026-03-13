import { motion } from "framer-motion";
import { Building2, Truck, Cloud, Wifi, WifiOff, Package, TrendingUp, Users } from "lucide-react";

export function FlowAnimation() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-orange-500/5 via-blue-500/5 to-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Un dia de trabajo con Avileo
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Desde la asignacion de inventario hasta el cierre del dia. 
            Todo conectado, todo sincronizado.
          </p>
        </motion.div>

        {/* Animated Workflow Diagram */}
        <div className="relative">
          {/* Connection Line - subtler */}
          <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-0.5">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-500/30 via-orange-500/30 to-green-500/30 origin-left rounded-full"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Admin Node */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 lg:p-8 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-400 font-medium">06:00 AM</p>
                    <h3 className="text-xl font-bold text-white">Admin</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-slate-950/50 rounded-lg p-3">
                    <Package className="w-5 h-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">Asigna 50kg a Juan</p>
                      <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8, duration: 0.8 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-950/50 rounded-lg p-3">
                    <Package className="w-5 h-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">Asigna 40kg a Maria</p>
                      <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "80%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 1, duration: 0.8 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sync indicator */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 mt-4 text-xs text-blue-400"
                >
                  <Cloud className="w-3 h-3" />
                  <span>Sync a la nube...</span>
                </motion.div>
              </div>

  
            </motion.div>

            {/* Vendor Node */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/30 rounded-2xl p-6 lg:p-8 shadow-lg shadow-orange-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-400 font-medium">08:00 AM - 06:00 PM</p>
                    <h3 className="text-xl font-bold text-white">Vendedores</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-slate-950/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Juan - Mercado Central</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1 text-xs text-green-400"
                      >
                        <Wifi className="w-3 h-3" />
                        <span>Online</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>35kg vendidos</span>
                      <span className="text-slate-600">•</span>
                      <span>S/420</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-950/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Maria - Zona Rural</span>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="flex items-center gap-1 text-xs text-orange-400"
                      >
                        <WifiOff className="w-3 h-3" />
                        <span>Offline</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>28kg vendidos</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-orange-400">Sync pendiente</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                  <Users className="w-3 h-3" />
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
              className="relative"
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/30 rounded-2xl p-6 lg:p-8 shadow-lg shadow-green-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-400 font-medium">07:00 PM</p>
                    <h3 className="text-xl font-bold text-white">Dashboard</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-slate-950/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Ventas del dia</p>
                    <p className="text-2xl font-bold text-white">S/780</p>
                    <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12% vs ayer</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-400">Juan</p>
                      <p className="text-lg font-semibold text-white">S/420</p>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-400">Maria</p>
                      <p className="text-lg font-semibold text-white">S/360</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 mt-4 text-xs text-green-400"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Todo sincronizado</span>
                </motion.div>
              </div>
            </motion.div>
          </div>


        </div>
      </div>
    </section>
  );
}
