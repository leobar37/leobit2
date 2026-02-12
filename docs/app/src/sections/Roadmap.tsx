import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, Target, Rocket, Zap, TrendingUp } from 'lucide-react';

interface Phase {
  id: string;
  name: string;
  duration: string;
  status: 'completed' | 'in-progress' | 'pending';
  description: string;
  tasks: string[];
  deliverables: string[];
}

const phases: Phase[] = [
  {
    id: 'phase-1',
    name: 'Fase 1: MVP Core',
    duration: '4-6 semanas',
    status: 'pending',
    description: 'Funcionalidades esenciales para operar el negocio',
    tasks: [
      'Setup proyecto (React, Node, PostgreSQL)',
      'Autenticación básica (login, roles)',
      'Usuarios y permisos (admin, vendedores)',
      'Distribución del día (asignar inventario a vendedores)',
      'Calculadora de pollo con tara',
      'Registro de ventas (contado/crédito)',
      'CRUD de clientes',
      'Cuentas por cobrar básico',
      'Inventario simple'
    ],
    deliverables: [
      'App mobile funcional para vendedores',
      'Panel admin básico',
      'Base de datos operativa'
    ]
  },
  {
    id: 'phase-2',
    name: 'Fase 2: Mejoras',
    duration: '3-4 semanas',
    status: 'pending',
    description: 'Catálogo y sistema de pedidos',
    tasks: [
      'Catálogo de productos completo',
      'Sistema de pedidos online',
      'Notificaciones push/email',
      'Historial detallado de ventas',
      'Mejoras en UI/UX'
    ],
    deliverables: [
      'Catálogo digital para clientes',
      'Sistema de pedidos funcional',
      'App más pulida'
    ]
  },
  {
    id: 'phase-3',
    name: 'Fase 3: Escalabilidad',
    duration: '4-5 semanas',
    status: 'pending',
    description: 'Distribución y reportes avanzados',
    tasks: [
      'Distribución del día a múltiples vendedores',
      'Módulo de recolección de proveedores',
      'Reportes y estadísticas',
      'Exportar datos (Excel/PDF)',
      'Backup automático'
    ],
    deliverables: [
      'Sistema multi-usuario completo',
      'Reportes avanzados',
      'Dashboard administrativo'
    ]
  },
  {
    id: 'phase-4',
    name: 'Fase 4: Optimización',
    duration: 'Continuo',
    status: 'pending',
    description: 'Mejoras basadas en feedback',
    tasks: [
      'Integración con WhatsApp Business',
      'App nativa (opcional)',
      'Facturación electrónica',
      'Múltiples sucursales',
      'API para integraciones'
    ],
    deliverables: [
      'Producto maduro y estable',
      'Documentación completa',
      'Soporte continuo'
    ]
  }
];



const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <span className="badge badge-green">Completado</span>;
    case 'in-progress':
      return <span className="badge badge-orange">En Progreso</span>;
    default:
      return <span className="badge bg-gray-800 text-gray-500">Pendiente</span>;
  }
};

export function Roadmap() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <MapPin className="w-6 h-6 text-orange-500" />
          Roadmap de Desarrollo
        </h2>
        <p className="text-gray-400">
          Plan de desarrollo por fases. Priorizando funcionalidades críticas primero.
        </p>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-700" />

        {/* Phases */}
        <div className="space-y-8">
          {phases.map((phase, idx) => (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-16"
            >
              {/* Timeline dot */}
              <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                phase.status === 'completed' ? 'bg-green-500/20 border-green-500' :
                phase.status === 'in-progress' ? 'bg-orange-500/20 border-orange-500' :
                'bg-gray-800 border-gray-700'
              }`}>
                {phase.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : phase.status === 'in-progress' ? (
                  <Rocket className="w-5 h-5 text-orange-500" />
                ) : (
                  <Target className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {/* Phase Card */}
              <div className="glass-panel rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{phase.name}</h3>
                    <p className="text-gray-500 text-sm">{phase.description}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(phase.status)}
                    <p className="text-gray-500 text-xs mt-1">{phase.duration}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  {/* Tasks */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Tareas
                    </h4>
                    <ul className="space-y-1.5">
                      {phase.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="w-1 h-1 bg-gray-600 rounded-full mt-2" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Deliverables */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Entregables
                    </h4>
                    <ul className="space-y-1.5">
                      {phase.deliverables.map((del, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="w-1 h-1 bg-orange-500 rounded-full mt-2" />
                          {del}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Estimates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Estimaciones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">11-15</div>
            <div className="text-gray-500 text-xs">Semanas MVP</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">6-8</div>
            <div className="text-gray-500 text-xs">Tablas DB</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">10+</div>
            <div className="text-gray-500 text-xs">Pantallas</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">3</div>
            <div className="text-gray-500 text-xs">Roles Usuario</div>
          </div>
        </div>
      </motion.div>

      {/* Tech Stack Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Stack Tecnológico Recomendado</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Frontend</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                React 18 + TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                Tailwind CSS
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                React Query / Zustand
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                PWA (Progressive Web App)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Backend</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Node.js + Express
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                JWT Authentication
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                REST API
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-orange-400 mb-3">Database & Infra</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                PostgreSQL 15
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Redis (cache)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                Docker
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                AWS / DigitalOcean
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
