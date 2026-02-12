import { useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, ChevronDown, CheckCircle2, Circle } from 'lucide-react';

interface Feature {
  name: string;
  desc: string;
  status: 'done' | 'pending' | 'future';
}

interface Module {
  id: string;
  name: string;
  desc: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  features: Feature[];
  inputs: string[];
  outputs: string[];
}

const modules: Module[] = [
  {
    id: 'auth',
    name: 'Módulo de Autenticación',
    desc: 'Login, logout y gestión de sesiones',
    priority: 'critical',
    features: [
      { name: 'Login con usuario/contraseña', desc: 'Autenticación básica', status: 'pending' },
      { name: 'Logout', desc: 'Cerrar sesión', status: 'pending' },
      { name: 'JWT Token', desc: 'Sesiones seguras con expiración', status: 'pending' },
      { name: 'Recuperar contraseña', desc: 'Por email/SMS', status: 'future' }
    ],
    inputs: ['username', 'password'],
    outputs: ['jwt_token', 'user_data', 'session_id']
  },
  {
    id: 'users',
    name: 'Módulo de Usuarios y Roles',
    desc: 'CRUD de usuarios y control de permisos por rol',
    priority: 'critical',
    features: [
      { name: 'Crear usuario', desc: 'Admin crea vendedores', status: 'pending' },
      { name: 'Editar usuario', desc: 'Modificar datos y estado', status: 'pending' },
      { name: 'Eliminar usuario', desc: 'Desactivar usuario', status: 'pending' },
      { name: 'Listar usuarios', desc: 'Ver todos los usuarios', status: 'pending' },
      { name: 'Roles del sistema', desc: 'ADMIN, VENDEDOR', status: 'pending' },
      { name: 'Permisos por rol', desc: 'Qué puede hacer cada rol', status: 'pending' },
      { name: 'Asignar carro a vendedor', desc: 'Relación vendedor-carro', status: 'pending' }
    ],
    inputs: ['nombre', 'username', 'password', 'rol', 'telefono', 'estado'],
    outputs: ['user_id', 'rol_asignado', 'permisos[]']
  },
  {
    id: 'calculator',
    name: 'Módulo Calculadora',
    desc: 'Cálculo inteligente de precios de pollo',
    priority: 'critical',
    features: [
      { name: 'Calcular por 2 valores', desc: 'Ingresa 2, calcula el 3ro', status: 'pending' },
      { name: 'Resta de tara', desc: 'Kilos netos = brutos - tara', status: 'pending' },
      { name: 'Precio por kg configurable', desc: 'Por tipo de pollo', status: 'pending' },
      { name: 'Historial de cálculos', desc: 'Últimas operaciones', status: 'future' }
    ],
    inputs: ['monto_total', 'precio_kg', 'kilos_brutos', 'tara'],
    outputs: ['kilos_netos', 'monto_calculado', 'precio_unitario']
  },
  {
    id: 'sales',
    name: 'Módulo de Ventas',
    desc: 'Registro de ventas al contado y crédito',
    priority: 'critical',
    features: [
      { name: 'Venta al contado', desc: 'Pago inmediato', status: 'pending' },
      { name: 'Venta a crédito', desc: 'Sin pago inmediato', status: 'pending' },
      { name: 'Venta sin cliente', desc: 'Cliente genérico', status: 'pending' },
      { name: 'Múltiples productos', desc: 'Pollo + huevos + otros', status: 'pending' },
      { name: 'Descuentos', desc: 'Por volumen o promoción', status: 'future' }
    ],
    inputs: ['cliente_id', 'productos[]', 'tipo_pago', 'monto', 'vendedor_id'],
    outputs: ['venta_id', 'comprobante', 'saldo_cliente']
  },
  {
    id: 'clients',
    name: 'Módulo de Clientes',
    desc: 'Gestión de cuentas por cobrar',
    priority: 'critical',
    features: [
      { name: 'CRUD Clientes', desc: 'Crear, leer, actualizar, eliminar', status: 'pending' },
      { name: 'Historial de compras', desc: 'Todas las ventas del cliente', status: 'pending' },
      { name: 'Registro de abonos', desc: 'Pagos parciales', status: 'pending' },
      { name: 'Saldo pendiente', desc: 'Deuda actual', status: 'pending' },
      { name: 'Límite de crédito', desc: 'Máximo permitido', status: 'future' },
      { name: 'Notificaciones de deuda', desc: 'Recordatorios', status: 'future' }
    ],
    inputs: ['dni', 'nombre', 'telefono', 'direccion', 'limite_credito'],
    outputs: ['cliente_id', 'saldo', 'historial', 'estado']
  },
  {
    id: 'inventory',
    name: 'Módulo de Inventario',
    desc: 'Control de stock de productos',
    priority: 'critical',
    features: [
      { name: 'Stock de pollo', desc: 'Por tipo y peso', status: 'pending' },
      { name: 'Stock de huevos', desc: 'Por presentación', status: 'pending' },
      { name: 'Otros productos', desc: 'Aceitunas, etc.', status: 'pending' },
      { name: 'Alertas de stock bajo', desc: 'Notificaciones', status: 'future' },
      { name: 'Kardex', desc: 'Movimientos detallados', status: 'future' }
    ],
    inputs: ['producto_id', 'cantidad', 'tipo_movimiento', 'fecha'],
    outputs: ['stock_actual', 'movimientos[]', 'alertas[]']
  },
  {
    id: 'catalog',
    name: 'Módulo Catálogo',
    desc: 'Productos disponibles para pedidos',
    priority: 'high',
    features: [
      { name: 'Lista de productos', desc: 'Con precios', status: 'pending' },
      { name: 'Categorías', desc: 'Pollo, huevos, otros', status: 'pending' },
      { name: 'Variantes', desc: 'Vivo, pelado, cortes', status: 'pending' },
      { name: 'Imágenes', desc: 'Fotos de productos', status: 'future' },
      { name: 'Precios por volumen', desc: 'Descuentos', status: 'future' }
    ],
    inputs: ['nombre', 'precio', 'categoria', 'variantes[]'],
    outputs: ['producto_id', 'catalogo[]']
  },
  {
    id: 'orders',
    name: 'Módulo de Pedidos',
    desc: 'Sistema de pedidos de clientes',
    priority: 'high',
    features: [
      { name: 'Crear pedido', desc: 'Desde catálogo', status: 'pending' },
      { name: 'Asociar cliente', desc: 'Por DNI o nuevo', status: 'pending' },
      { name: 'Notificación al admin', desc: 'Push/email', status: 'pending' },
      { name: 'Estados del pedido', desc: 'Pendiente, en proceso, entregado', status: 'pending' },
      { name: 'Historial de pedidos', desc: 'Todos los pedidos', status: 'future' }
    ],
    inputs: ['cliente_id', 'items[]', 'fecha_entrega', 'notas'],
    outputs: ['pedido_id', 'estado', 'total', 'notificacion']
  },
  {
    id: 'collection',
    name: 'Módulo de Recolección',
    desc: 'Registro de compras a proveedores',
    priority: 'medium',
    features: [
      { name: 'Registro de proveedor', desc: 'Datos del distribuidor', status: 'future' },
      { name: 'Compra de pollo', desc: 'Kilos y precio', status: 'future' },
      { name: 'Múltiples proveedores', desc: 'Varias compras del día', status: 'future' },
      { name: 'Costo promedio', desc: 'Precio de adquisición', status: 'future' }
    ],
    inputs: ['proveedor_id', 'kilos', 'precio_kg', 'total', 'fecha'],
    outputs: ['compra_id', 'costo_promedio', 'stock_actualizado']
  },
  {
    id: 'distribucion',
    name: 'Módulo Distribución del Día',
    desc: 'Asigna inventario a vendedores para sus puntos de venta',
    priority: 'critical',
    features: [
      { name: 'Crear distribución', desc: 'Nueva asignación del día', status: 'pending' },
      { name: 'Asignar vendedor', desc: 'Quién venderá', status: 'pending' },
      { name: 'Asignar punto de venta', desc: 'Carro A, Casa, Local, etc.', status: 'pending' },
      { name: 'Asignar kilos/productos', desc: 'Cuánto lleva cada vendedor', status: 'pending' },
      { name: 'Ventas por vendedor', desc: 'Todas las ventas de ese vendedor hoy', status: 'pending' },
      { name: 'Cierre de vendedor', desc: 'Recaudación y kilos vendidos', status: 'pending' },
      { name: 'Rendimiento por vendedor', desc: 'Quién vendió más/menos', status: 'pending' }
    ],
    inputs: ['vendedor_id', 'punto_venta', 'kilos_asignados', 'productos[]', 'fecha'],
    outputs: ['kilos_vendidos', 'monto_recaudado', 'ventas_por_vendedor[]']
  },
  {
    id: 'reports',
    name: 'Módulo de Reportes',
    desc: 'Estadísticas y análisis',
    priority: 'low',
    features: [
      { name: 'Ventas del día', desc: 'Total y por producto', status: 'future' },
      { name: 'Cuentas por cobrar', desc: 'Deudas pendientes', status: 'future' },
      { name: 'Clientes frecuentes', desc: 'Top compradores', status: 'future' },
      { name: 'Rentabilidad', desc: 'Ganancias del día', status: 'future' },
      { name: 'Exportar Excel/PDF', desc: 'Reportes descargables', status: 'future' }
    ],
    inputs: ['fecha_inicio', 'fecha_fin', 'tipo_reporte'],
    outputs: ['reporte_data', 'graficos[]', 'archivo']
  }
];

export function Modules() {
  const [expandedModule, setExpandedModule] = useState<string | null>('calculator');

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <Boxes className="w-6 h-6 text-orange-500" />
          Módulos del Sistema
        </h2>
        <p className="text-gray-400">
          Desglose detallado de cada módulo con sus funcionalidades, entradas y salidas.
        </p>
      </motion.div>

      {/* Priority Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" />
          Crítico (MVP)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-500 rounded" />
          Alto
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded" />
          Medio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-gray-500 rounded" />
          Bajo/Futuro
        </span>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module, idx) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`border rounded-xl overflow-hidden ${
              module.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' :
              module.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' :
              module.priority === 'medium' ? 'border-blue-500/30 bg-blue-500/5' :
              'border-gray-700 bg-gray-800/30'
            }`}
          >
            <button
              onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className={`text-xs font-mono px-2 py-1 rounded ${
                  module.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                  module.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  module.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {module.id.toUpperCase()}
                </span>
                <div className="text-left">
                  <h3 className="text-white font-medium">{module.name}</h3>
                  <p className="text-gray-500 text-sm">{module.desc}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedModule === module.id ? 'rotate-180' : ''
              }`} />
            </button>

            {expandedModule === module.id && (
              <div className="px-5 pb-5 border-t border-gray-700/50">
                {/* Features */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Funcionalidades</h4>
                  <div className="grid gap-2">
                    {module.features.map((feature, i) => (
                      <div 
                        key={i}
                        className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg"
                      >
                        {feature.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        ) : feature.status === 'pending' ? (
                          <Circle className="w-4 h-4 text-orange-500 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-600 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm text-gray-300">{feature.name}</p>
                          <p className="text-xs text-gray-500">{feature.desc}</p>
                        </div>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                          feature.status === 'done' ? 'bg-green-500/20 text-green-400' :
                          feature.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-700 text-gray-500'
                        }`}>
                          {feature.status === 'done' ? 'DONE' : feature.status === 'pending' ? 'TODO' : 'FUTURE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* I/O */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Inputs</h4>
                    <div className="flex flex-wrap gap-1">
                      {module.inputs.map((input, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded font-mono">
                          {input}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Outputs</h4>
                    <div className="flex flex-wrap gap-1">
                      {module.outputs.map((output, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded font-mono">
                          {output}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
