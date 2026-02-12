import { motion } from 'framer-motion';
import { ChickenCalculator } from '@/components/calculator/ChickenCalculator';
import { Calculator, Info, Lightbulb } from 'lucide-react';

export function CalculatorSection() {
  return (
    <section id="calculadora" className="section-padding bg-white">
      <div className="container-max mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
            <Calculator className="w-4 h-4" />
            Calculadora Inteligente
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Calcula tu venta en <span className="text-gradient">segundos</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            La forma más rápida de calcular precios de pollo. Ingresa cualquier 2 valores 
            (monto total, precio por kg o kilos) y la calculadora completa automáticamente el tercero.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Calculator */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <ChickenCalculator />
          </motion.div>

          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {/* How it works */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">¿Cómo funciona?</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { text: 'Ingresa el Monto Total que el cliente debe pagar', example: 'Ej: S/ 120.00' },
                  { text: 'Ingresa el Precio por Kg de tu pollo', example: 'Ej: S/ 12.00/kg' },
                  { text: 'O ingresa los Kilos que está comprando', example: 'Ej: 10 kg' },
                  { text: 'Agrega la Tara si es necesario (envases, bolsas)', example: 'Ej: 0.5 kg' }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-orange-200 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-gray-700 text-sm">{item.text}</p>
                      <p className="text-orange-600 text-xs">{item.example}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">Características</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Cálculo automático',
                  'Resta de tara',
                  'Kilos netos/brutos',
                  'Precios al por mayor',
                  'Venta al contado',
                  'Venta a crédito'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
              <p className="text-blue-800 text-sm flex items-start gap-2">
                <span className="text-xl">💡</span>
                <span>
                  <strong>Consejo:</strong> Para pollo vivo, primero pesa con la bolsa/envase, 
                  luego resta la tara para obtener el peso neto real del pollo.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
