import { motion } from 'framer-motion';
import { WorkflowTimeline } from '@/components/flow/WorkflowTimeline';
import { Clock, MapPin, TrendingUp } from 'lucide-react';

export function WorkflowSection() {
  return (
    <section id="flujo" className="section-padding bg-gradient-to-b from-white to-orange-50/50">
      <div className="container-max mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Flujo de Trabajo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tu día a día, <span className="text-gradient">simplificado</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Desde la recolección del pollo por la mañana hasta el cierre y recolección de cuentas. 
            Cada paso del proceso optimizado para tu negocio.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12"
        >
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-orange-100">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-orange-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-800">13+ horas</h4>
            <p className="text-gray-600 text-sm">De trabajo diario</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-orange-100">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-7 h-7 text-blue-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-800">Múltiples</h4>
            <p className="text-gray-600 text-sm">Carros y rutas</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-orange-100">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-800">100%</h4>
            <p className="text-gray-600 text-sm">Control de ventas</p>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <WorkflowTimeline />
        </motion.div>

        {/* Key benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              title: 'Sin papeleo',
              desc: 'Olvídate de las libretas y calculadoras',
              icon: '📝'
            },
            {
              title: 'En tiempo real',
              desc: 'Sincronización entre carros y oficina',
              icon: '⚡'
            },
            {
              title: 'Sin cierres de caja',
              desc: 'Registro automático de recaudación',
              icon: '💰'
            },
            {
              title: 'Historial completo',
              desc: 'Todas las ventas guardadas en la nube',
              icon: '☁️'
            }
          ].map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all"
            >
              <span className="text-3xl mb-3 block">{benefit.icon}</span>
              <h4 className="font-semibold text-gray-800 mb-1">{benefit.title}</h4>
              <p className="text-sm text-gray-600">{benefit.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
