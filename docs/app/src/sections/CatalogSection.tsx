import { motion } from 'framer-motion';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';
import { ShoppingBag, Smartphone, Send, Package } from 'lucide-react';

export function CatalogSection() {
  return (
    <section id="catalogo" className="section-padding bg-gradient-to-b from-white to-orange-50/50">
      <div className="container-max mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
            <ShoppingBag className="w-4 h-4" />
            Catálogo Digital
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tu menú, <span className="text-gradient">siempre disponible</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comparte tu catálogo de productos con los clientes. Ellos arman su pedido 
            y te llega directamente al administrador. Fácil, rápido y sin errores.
          </p>
        </motion.div>

        {/* How it works steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {[
            {
              icon: Smartphone,
              title: '1. Muestra el catálogo',
              desc: 'El vendedor abre la app',
              color: 'bg-blue-500'
            },
            {
              icon: ShoppingBag,
              title: '2. Cliente elige',
              desc: 'Selecciona productos',
              color: 'bg-orange-500'
            },
            {
              icon: Package,
              title: '3. Arma el pedido',
              desc: 'Cantidad y variedad',
              color: 'bg-purple-500'
            },
            {
              icon: Send,
              title: '4. Envía al admin',
              desc: 'Llega en segundos',
              color: 'bg-green-500'
            }
          ].map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-5 text-center shadow-lg border border-gray-100 h-full">
                  <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <div className="w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">→</span>
                    </div>
                  </div>
                )}
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
          <ProductCatalog />
        </motion.div>

        {/* Product categories info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mb-4 text-3xl">
              🐔
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Pollo y Cortes</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                Pollo entero (vivo/pelado)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                Pechuga sin hueso
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                Pierna con encuentro
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                Alitas y menudencias
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-yellow-100">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mb-4 text-3xl">
              🥚
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Huevos</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                Caja completa (30 unid)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                Media caja (15 unid)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                Por unidad
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                Precios por volumen
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 text-3xl">
              🫒
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Otros Productos</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Aceitunas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Mondongo
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Menudencias
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Productos personalizados
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
