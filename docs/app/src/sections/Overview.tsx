import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  Server, 
  Database, 
  Smartphone, 
  Users, 
  Calculator, 
  ShoppingCart,
  CreditCard
} from 'lucide-react';

const architectureLayers = [
  {
    layer: 'Frontend',
    color: 'blue',
    items: [
      { name: 'Web App (Admin)', icon: Server, desc: 'Panel de administración' },
      { name: 'Mobile App (Vendedores)', icon: Smartphone, desc: 'Funciona offline' },
      { name: 'Catálogo Cliente', icon: ShoppingCart, desc: 'Vista de productos' }
    ]
  },
  {
    layer: 'Estado + Persistencia',
    color: 'purple',
    items: [
      { name: 'TanStack DB', icon: Database, desc: 'Colecciones reactivas' },
      { name: 'IndexedDB', icon: Database, desc: 'Persistencia local' },
      { name: 'Sync Engine', icon: Server, desc: 'Sync offline/online' }
    ]
  },
  {
    layer: 'Backend API',
    color: 'orange',
    items: [
      { name: 'Auth Service', icon: Users, desc: 'Autenticación JWT' },
      { name: 'Sales API', icon: Calculator, desc: 'Ventas y calculadora' },
      { name: 'Inventory API', icon: Database, desc: 'Stock y productos' },
      { name: 'Payments API', icon: CreditCard, desc: 'Cuentas por cobrar' }
    ]
  },
  {
    layer: 'Database',
    color: 'green',
    items: [
      { name: 'PostgreSQL', icon: Database, desc: 'Datos principales' },
      { name: 'Redis', icon: Server, desc: 'Cache y sesiones' }
    ]
  }
];

const modules = [
  { id: 'M1', name: 'Autenticación', status: 'core', desc: 'Login, logout, JWT' },
  { id: 'M2', name: 'Usuarios y Roles', status: 'core', desc: 'CRUD usuarios, permisos' },
  { id: 'M3', name: 'Distribución del Día', status: 'core', desc: 'Asigna inventario a vendedores' },
  { id: 'M4', name: 'Calculadora', status: 'core', desc: 'Cálculo de precios con tara' },
  { id: 'M5', name: 'Ventas', status: 'core', desc: 'Registro de ventas (offline)' },
  { id: 'M6', name: 'Clientes', status: 'core', desc: 'Gestión de cuentas (offline)' },
  { id: 'M7', name: 'Inventario', status: 'core', desc: 'Stock de pollo y productos' },
  { id: 'M8', name: 'Sync Engine', status: 'core', desc: 'Sincronización offline/online' },
  { id: 'M9', name: 'Catálogo', status: 'secondary', desc: 'Productos para pedidos' },
  { id: 'M10', name: 'Pedidos', status: 'secondary', desc: 'Sistema de pedidos online' },
  { id: 'M11', name: 'Reportes', status: 'secondary', desc: 'Estadísticas y reportes' },
  { id: 'M12', name: 'Recolección', status: 'future', desc: 'Registro de compra a proveedores' }
];

export function Overview() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <LayoutDashboard className="w-6 h-6 text-orange-500" />
          Arquitectura del Sistema
        </h2>
        <p className="text-gray-400 max-w-3xl">
          Vista general de la arquitectura técnica de PollosPro. El sistema está diseñado 
          como una aplicación web progresiva (PWA) con backend API REST.
        </p>
      </motion.div>

      {/* Architecture Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6">Diagrama de Arquitectura</h3>
        
        <div className="space-y-6">
          {architectureLayers.map((layer, idx) => (
            <div key={idx} className="relative">
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${
                layer.color === 'blue' ? 'bg-blue-500' :
                layer.color === 'orange' ? 'bg-orange-500' : 'bg-green-500'
              }`} />
              <div className="pl-6">
                <h4 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
                  layer.color === 'blue' ? 'text-blue-400' :
                  layer.color === 'orange' ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {layer.layer}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {layer.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={i}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                      >
                        <Icon className={`w-5 h-5 mb-2 ${
                          layer.color === 'blue' ? 'text-blue-400' :
                          layer.color === 'orange' ? 'text-orange-400' : 'text-green-400'
                        }`} />
                        <p className="text-white text-sm font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Connection arrows */}
        <div className="flex justify-center my-4">
          <div className="flex flex-col items-center text-gray-600">
            <span className="text-xs">HTTP/REST</span>
            <div className="w-px h-8 bg-gray-700" />
            <span className="text-xs">SQL/TCP</span>
          </div>
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Módulos del Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {modules.map((mod) => (
            <div 
              key={mod.id}
              className={`module-card ${
                mod.status === 'core' ? 'border-l-4 border-l-orange-500' :
                mod.status === 'secondary' ? 'border-l-4 border-l-blue-500' :
                'border-l-4 border-l-gray-600 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-gray-500">{mod.id}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  mod.status === 'core' ? 'bg-orange-500/20 text-orange-400' :
                  mod.status === 'secondary' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {mod.status === 'core' ? 'CORE' : mod.status === 'secondary' ? 'V2' : 'FUTURO'}
                </span>
              </div>
              <p className="text-white text-sm font-medium">{mod.name}</p>
              <p className="text-gray-500 text-xs mt-1">{mod.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tech Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Stack Tecnológico</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Frontend</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                React 18 + TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                Tailwind CSS
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                PWA (Progressive Web App)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                React Query (estado servidor)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Backend</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                Node.js + Express
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                JWT Auth
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                REST API
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Database & Infra</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                PostgreSQL 15
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                Redis (cache)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                Docker
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                AWS/VPS
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
