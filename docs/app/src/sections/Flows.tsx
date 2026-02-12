import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ArrowRight, ArrowDown, User, Package, DollarSign, Truck, Moon } from 'lucide-react';

interface FlowNode {
  id: string;
  label: string;
  icon?: React.ElementType;
  description?: string;
  type: 'start' | 'process' | 'decision' | 'end';
  next?: string[];
}

interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
}

const flows: Flow[] = [
  {
    id: 'daily',
    name: 'Flujo Diario Completo',
    description: 'Desde la recolección hasta el cierre',
    nodes: [
      { id: 'start', label: '05:00 AM', icon: Sun, type: 'start', description: 'Inicio del día', next: ['collect'] },
      { id: 'collect', label: 'Recolección', icon: Truck, type: 'process', description: 'Compra a distribuidoras', next: ['weigh'] },
      { id: 'weigh', label: 'Pesaje', icon: Scale, type: 'process', description: 'Registrar kilos comprados', next: ['prep'] },
      { id: 'prep', label: 'Preparación', icon: Package, type: 'process', description: 'Limpiar y dividir', next: ['distribute'] },
      { id: 'distribute', label: 'Distribución del Día', icon: Truck, type: 'process', description: 'Asignar inventario a cada vendedor', next: ['assign_seller'] },
      { id: 'assign_seller', label: 'Asignar Vendedor + Punto', icon: User, type: 'process', description: 'Juan → Carro A, Pedro → Casa, etc.', next: ['sell'] },
      { id: 'sell', label: 'Ventas', icon: DollarSign, type: 'process', description: 'Venta en ruta', next: ['payment'] },
      { id: 'payment', label: '¿Tipo pago?', type: 'decision', description: 'Contado o crédito', next: ['cash', 'credit'] },
      { id: 'cash', label: 'Pago Contado', icon: DollarSign, type: 'process', description: 'Recibe efectivo', next: ['continue'] },
      { id: 'credit', label: 'Venta Crédito', icon: User, type: 'process', description: 'Registrar deuda', next: ['continue'] },
      { id: 'continue', label: '¿Más ventas?', type: 'decision', description: 'Seguir vendiendo', next: ['sell', 'close'] },
      { id: 'close', label: 'Cierre 06:00 PM', icon: Moon, type: 'end', description: 'Entrega de recaudación' }
    ]
  },
  {
    id: 'sale',
    name: 'Proceso de Venta',
    description: 'Flujo detallado de una venta',
    nodes: [
      { id: 'start', label: 'Nueva Venta', type: 'start', next: ['client'] },
      { id: 'client', label: '¿Cliente registrado?', type: 'decision', next: ['select', 'new'] },
      { id: 'new', label: 'Crear Cliente', icon: UserPlus, type: 'process', next: ['select'] },
      { id: 'select', label: 'Seleccionar Cliente', icon: User, type: 'process', next: ['products'] },
      { id: 'products', label: 'Agregar Productos', icon: Package, type: 'process', next: ['calc'] },
      { id: 'calc', label: 'Calcular Total', type: 'process', next: ['payment'] },
      { id: 'payment', label: '¿Tipo de pago?', type: 'decision', next: ['cash', 'credit'] },
      { id: 'cash', label: 'Registrar Pago', icon: DollarSign, type: 'process', next: ['end'] },
      { id: 'credit', label: 'Actualizar Deuda', icon: TrendingUp, type: 'process', next: ['end'] },
      { id: 'end', label: 'Venta Completada', type: 'end' }
    ]
  },
  {
    id: 'payment',
    name: 'Proceso de Abono',
    description: 'Cliente realiza un pago parcial',
    nodes: [
      { id: 'start', label: 'Cliente Abona', type: 'start', next: ['find'] },
      { id: 'find', label: 'Buscar Cliente', icon: Search, type: 'process', next: ['verify'] },
      { id: 'verify', label: 'Verificar Deuda', icon: FileText, type: 'process', next: ['amount'] },
      { id: 'amount', label: 'Ingresar Monto', icon: DollarSign, type: 'process', next: ['check'] },
      { id: 'check', label: '¿Paga todo?', type: 'decision', next: ['full', 'partial'] },
      { id: 'full', label: 'Deuda Salda', icon: CheckCircle, type: 'process', next: ['end'] },
      { id: 'partial', label: 'Saldo Pendiente', icon: TrendingUp, type: 'process', next: ['end'] },
      { id: 'end', label: 'Abono Registrado', type: 'end' }
    ]
  },
  {
    id: 'users',
    name: 'Gestión de Usuarios y Roles',
    description: 'Admin crea y gestiona vendedores',
    nodes: [
      { id: 'start', label: 'Admin ingresa', type: 'start', next: ['menu'] },
      { id: 'menu', label: 'Menú Usuarios', type: 'process', next: ['action'] },
      { id: 'action', label: '¿Qué hacer?', type: 'decision', next: ['create', 'edit', 'list'] },
      { id: 'create', label: 'Crear Usuario', icon: UserPlus, type: 'process', description: 'Nombre, username, password, rol', next: ['assign'] },
      { id: 'assign', label: '¿Asignar carro?', type: 'decision', next: ['car', 'save'] },
      { id: 'car', label: 'Seleccionar Carro', type: 'process', next: ['save'] },
      { id: 'edit', label: 'Editar Usuario', icon: UserCog, type: 'process', description: 'Modificar datos o desactivar', next: ['save'] },
      { id: 'list', label: 'Listar Usuarios', icon: Users, type: 'process', description: 'Ver todos con filtros', next: ['end'] },
      { id: 'save', label: 'Guardar Cambios', icon: Save, type: 'process', next: ['end'] },
      { id: 'end', label: 'Operación Completa', type: 'end' }
    ]
  }
];

// Import missing icons
import { Sun, Scale, UserPlus, Search, FileText, CheckCircle, TrendingUp, UserCog, Save, Users } from 'lucide-react';

export function Flows() {
  const [activeFlow, setActiveFlow] = useState('daily');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const currentFlow = flows.find(f => f.id === activeFlow);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <GitBranch className="w-6 h-6 text-orange-500" />
          Flujos de Procesos
        </h2>
        <p className="text-gray-400">
          Diagramas de flujo que representan los procesos principales del negocio.
        </p>
      </motion.div>

      {/* Flow Selector */}
      <div className="flex gap-2">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => { setActiveFlow(flow.id); setSelectedNode(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFlow === flow.id
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {flow.name}
          </button>
        ))}
      </div>

      {/* Flow Description */}
      <div className="text-sm text-gray-500">
        {currentFlow?.description}
      </div>

      {/* Flow Diagram */}
      {currentFlow && (
        <motion.div
          key={currentFlow.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-xl p-6 overflow-x-auto"
        >
          <div className="flex flex-col items-center gap-4 min-w-max">
            {currentFlow.nodes.map((node, idx) => {
              const Icon = node.icon;
              const isSelected = selectedNode === node.id;
              
              return (
                <div key={node.id} className="flex flex-col items-center">
                  <motion.button
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative px-5 py-3 rounded-lg flex items-center gap-3 transition-all ${
                      node.type === 'start' || node.type === 'end'
                        ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400'
                        : node.type === 'decision'
                        ? 'bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 rotate-0'
                        : isSelected
                        ? 'bg-orange-500/30 border-2 border-orange-500 text-orange-400'
                        : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:border-gray-600'
                    } ${node.type === 'decision' ? 'rounded-xl' : ''}`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="font-medium">{node.label}</span>
                    {node.type === 'decision' && (
                      <span className="absolute -right-2 -top-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-black font-bold">
                        ?
                      </span>
                    )}
                  </motion.button>

                  {/* Arrow to next */}
                  {idx < currentFlow.nodes.length - 1 && (
                    <div className="flex flex-col items-center py-2">
                      <ArrowDown className="w-4 h-4 text-gray-600" />
                    </div>
                  )}

                  {/* Node Details */}
                  {isSelected && node.description && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 bg-gray-900 rounded-lg text-sm text-gray-400 max-w-xs text-center"
                    >
                      {node.description}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/20 border-2 border-green-500/50 rounded" />
          <span className="text-gray-400">Inicio/Fin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-800 border-2 border-gray-700 rounded" />
          <span className="text-gray-400">Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500/20 border-2 border-amber-500/50 rounded" />
          <span className="text-gray-400">Decisión</span>
        </div>
      </div>

      {/* Use Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Casos de Uso</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-orange-400">Vendedor (Mobile)</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Registrar venta con calculadora
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Buscar cliente por DNI
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Registrar abono
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Ver catálogo de productos
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-blue-400">Administrador (Web)</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Ver todas las ventas del día
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Gestión de cuentas por cobrar
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Recibir pedidos de clientes
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-gray-600 mt-0.5" />
                Reportes y estadísticas
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
