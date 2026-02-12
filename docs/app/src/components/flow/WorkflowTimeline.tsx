import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Truck, 
  Scale, 
  Users, 
  Moon,
  ChevronRight,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  time: string;
  details: string[];
  color: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'recoleccion',
    title: 'Recolección del Pollo',
    description: 'El pollero visita las distribuidoras al por mayor',
    icon: Sun,
    time: '05:00 AM',
    details: [
      'Visita múltiples distribuidoras',
      'Pesa el pollo comprado al por mayor',
      'Registra proveedores y cantidades',
      'Calcula costo de adquisición'
    ],
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'preparacion',
    title: 'Preparación y Distribución',
    description: 'El pollo se prepara y divide en los carros',
    icon: Scale,
    time: '06:30 AM',
    details: [
      'Limpieza y preparación del pollo',
      'División por kilajes específicos',
      'Asignación a cada carro/vendedor',
      'Registro de inventario inicial'
    ],
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'venta',
    title: 'Venta en Ruta',
    description: 'Los carros venden durante el recorrido',
    icon: Truck,
    time: '07:30 AM - 06:00 PM',
    details: [
      'Ventas con o sin cliente registrado',
      'Pagos al contado o a crédito',
      'Uso de calculadora para precios',
      'Registro de abonos y deudas'
    ],
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'clientes',
    title: 'Gestión de Clientes',
    description: 'Manejo de cuentas por cobrar',
    icon: Users,
    time: 'Durante el día',
    details: [
      'Clientes con cuenta acumulada',
      'Registro de abonos parciales',
      'Control de saldos pendientes',
      'Historial de compras y pagos'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'cierre',
    title: 'Cierre y Recolección',
    description: 'Los carros regresan y entregan cuentas',
    icon: Moon,
    time: '06:00 PM',
    details: [
      'Entrega de monto recolectado',
      'Registro de ventas del día',
      'Cálculo de ganancias',
      'Conciliación de inventario'
    ],
    color: 'from-indigo-500 to-purple-500'
  }
];

export function WorkflowTimeline() {
  const [activeStep, setActiveStep] = useState<string>('recoleccion');

  const currentStep = workflowSteps.find(s => s.id === activeStep);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Timeline vertical */}
      <div className="lg:col-span-1 space-y-3">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === activeStep;
          const isPast = workflowSteps.findIndex(s => s.id === activeStep) > index;

          return (
            <motion.button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white shadow-xl border-2 border-orange-500' 
                  : 'bg-white/50 hover:bg-white border-2 border-transparent hover:border-orange-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isActive 
                    ? `bg-gradient-to-br ${step.color}` 
                    : isPast 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                }`}>
                  {isPast && !isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {step.time}
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${
                  isActive ? 'text-orange-500 rotate-90' : 'text-gray-400'
                }`} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detalle del paso activo */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {currentStep && (
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-orange-100 h-full"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-lg`}>
                  <currentStep.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{currentStep.title}</h3>
                  <p className="text-gray-600 mt-1">{currentStep.description}</p>
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {currentStep.time}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Actividades principales:
                </h4>
                <ul className="space-y-3">
                  {currentStep.details.map((detail, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <span className="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700">{detail}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Indicador visual de progreso */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Progreso del día</span>
                  <span>{Math.round(((workflowSteps.findIndex(s => s.id === activeStep) + 1) / workflowSteps.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((workflowSteps.findIndex(s => s.id === activeStep) + 1) / workflowSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full bg-gradient-to-r ${currentStep.color}`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
