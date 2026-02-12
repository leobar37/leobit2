import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Zap, 
  Shield, 
  TrendingUp, 
  Clock, 
  Users,
  Smartphone,
  Cloud
} from 'lucide-react';

const benefits = [
  {
    icon: Zap,
    title: 'Rápido y fácil',
    description: 'Calcula precios en segundos sin complicaciones. Interfaz intuitiva diseñada para polleros.',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Shield,
    title: 'Sin errores',
    description: 'Olvídate de las cuentas mal hechas. La app calcula todo automáticamente.',
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: TrendingUp,
    title: 'Aumenta tus ventas',
    description: 'Atiende más clientes en menos tiempo con un proceso de venta ágil.',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    icon: Clock,
    title: 'Ahorra tiempo',
    description: 'No más cierres de caja complicados. Todo se registra automáticamente.',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: Users,
    title: 'Fideliza clientes',
    description: 'Lleva el control de sus cuentas y ofrece un servicio más personalizado.',
    color: 'from-red-400 to-rose-500'
  },
  {
    icon: Smartphone,
    title: 'Funciona en cualquier celular',
    description: 'No necesitas equipo especial. Solo tu smartphone con internet.',
    color: 'from-indigo-400 to-purple-500'
  },
  {
    icon: Cloud,
    title: 'Datos en la nube',
    description: 'Tu información segura y accesible desde cualquier dispositivo.',
    color: 'from-sky-400 to-blue-500'
  },
  {
    icon: CheckCircle2,
    title: 'Sin papeleo',
    description: 'Olvídate de las libretas y papeles. Todo digital y organizado.',
    color: 'from-teal-400 to-green-500'
  }
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="section-padding bg-white">
      <div className="container-max mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Beneficios
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            ¿Por qué usar <span className="text-gradient">PollosPro</span>?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Diseñado específicamente para el negocio de venta de pollo, 
            entendiendo cada detalle de tu operación diaria.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Antes vs Después
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-4 px-6 text-left text-gray-500 font-medium">Proceso</th>
                  <th className="py-4 px-6 text-center text-gray-500 font-medium">Sistema Antiguo</th>
                  <th className="py-4 px-6 text-center text-orange-600 font-medium">Con PollosPro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    process: 'Calcular precio de venta',
                    old: 'Calculadora manual + libreta',
                    new: 'Calculadora inteligente automática'
                  },
                  {
                    process: 'Registro de clientes',
                    old: 'Libreta de apuntes',
                    new: 'Base de datos con historial'
                  },
                  {
                    process: 'Cuentas por cobrar',
                    old: 'Papeles fáciles de perder',
                    new: 'Registro digital permanente'
                  },
                  {
                    process: 'Cierre de caja',
                    old: 'Conteo manual al final del día',
                    new: 'Registro automático en tiempo real'
                  },
                  {
                    process: 'Catálogo de productos',
                    old: 'Memorizar precios',
                    new: 'Catálogo digital actualizado'
                  },
                  {
                    process: 'Pedidos de clientes',
                    old: 'Llamadas o mensajes dispersos',
                    new: 'Sistema centralizado de pedidos'
                  }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-800">{row.process}</td>
                    <td className="py-4 px-6 text-center text-gray-500 text-sm">{row.old}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                        {row.new}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
