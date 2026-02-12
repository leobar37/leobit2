import { motion } from 'framer-motion';
import { ClientManagement } from '@/components/clients/ClientManagement';
import { Users, CreditCard, History, Bell } from 'lucide-react';

export function ClientsSection() {
  return (
    <section id="clientes" className="section-padding bg-white">
      <div className="container-max mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            Gestión de Clientes
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Controla tus <span className="text-gradient">cuentas por cobrar</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Administra fácilmente los pagos al contado y a crédito. Registra abonos, 
            saldos pendientes y mantén un historial completo de cada cliente.
          </p>
        </motion.div>

        {/* Features highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {[
            {
              icon: CreditCard,
              title: 'Pagos al contado',
              desc: 'Registro inmediato',
              color: 'green'
            },
            {
              icon: History,
              title: 'Cuentas por cobrar',
              desc: 'Abonos parciales',
              color: 'orange'
            },
            {
              icon: Users,
              title: 'Identificación',
              desc: 'Por DNI o nombre',
              color: 'blue'
            },
            {
              icon: Bell,
              title: 'Recordatorios',
              desc: 'Deudas pendientes',
              color: 'red'
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            const colorClasses: Record<string, string> = {
              green: 'bg-green-100 text-green-600',
              orange: 'bg-orange-100 text-orange-600',
              blue: 'bg-blue-100 text-blue-600',
              red: 'bg-red-100 text-red-600'
            };
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-2xl p-5 text-center hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-200"
              >
                <div className={`w-12 h-12 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <ClientManagement />
        </motion.div>

        {/* Info boxes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
              <span className="text-xl">💚</span>
              Cliente al día
            </h4>
            <p className="text-green-700 text-sm">
              Cuando el cliente no tiene deudas pendientes, aparece con etiqueta verde. 
              Puede seguir comprando al contado o a crédito.
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Cliente con deuda
            </h4>
            <p className="text-orange-700 text-sm">
              Los clientes con saldo pendiente aparecen destacados. Puedes registrar 
              abonos parciales o pagos totales fácilmente.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span className="text-xl">📊</span>
              Historial completo
            </h4>
            <p className="text-blue-700 text-sm">
              Cada cliente tiene su historial de compras y pagos. Consulta en cualquier 
              momento cuánto ha comprado y pagado en total.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
