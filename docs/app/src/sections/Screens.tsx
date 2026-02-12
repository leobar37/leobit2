import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, ShoppingCart } from 'lucide-react';

interface Screen {
  id: string;
  name: string;
  device: 'mobile' | 'desktop';
  description: string;
  elements: string[];
}

const screens: Screen[] = [
  {
    id: 'calc',
    name: 'Calculadora',
    device: 'mobile',
    description: 'Pantalla principal para calcular precios de pollo',
    elements: [
      'Input: Monto Total',
      'Input: Precio por Kg',
      'Input: Kilos Brutos',
      'Input: Tara (kg)',
      'Resultado: Kilos Netos',
      'Resultado: Total a Pagar',
      'Botón: Registrar Venta'
    ]
  },
  {
    id: 'sale',
    name: 'Nueva Venta',
    device: 'mobile',
    description: 'Formulario completo de venta',
    elements: [
      'Buscar/Seleccionar Cliente',
      'Lista de Productos',
      'Calculadora integrada',
      'Tipo de Pago (Contado/Crédito)',
      'Monto Pagado (si es parcial)',
      'Botón: Confirmar Venta'
    ]
  },
  {
    id: 'clients',
    name: 'Clientes',
    device: 'mobile',
    description: 'Gestión de clientes y cuentas',
    elements: [
      'Buscador por DNI/Nombre',
      'Lista de Clientes',
      'Indicador: Saldo/Deuda',
      'Botón: Nuevo Cliente',
      'Botón: Registrar Abono',
      'Historial de Compras'
    ]
  },
  {
    id: 'catalog',
    name: 'Catálogo',
    device: 'mobile',
    description: 'Productos para pedidos',
    elements: [
      'Tabs: Pollo/Huevos/Otros',
      'Tarjetas de Productos',
      'Selector de Variantes',
      'Carrito de Compras',
      'Botón: Enviar Pedido'
    ]
  },
  {
    id: 'users',
    name: 'Gestión de Usuarios',
    device: 'desktop',
    description: 'Admin crea y gestiona vendedores',
    elements: [
      'Tabla: Lista de Usuarios',
      'Filtros: Por rol, estado',
      'Botón: Nuevo Usuario',
      'Form: Crear/Editar Usuario',
      'Selector: Asignar Rol',
      'Toggle: Activar/Desactivar',
      'Permisos por Rol'
    ]
  },
  {
    id: 'distribucion',
    name: 'Distribución del Día',
    device: 'desktop',
    description: 'Asigna inventario a vendedores para sus puntos de venta',
    elements: [
      'Kilos/Productos Disponibles Hoy',
      'Lista de Vendedores',
      'Asignar Punto de Venta (Carro, Casa, Local)',
      'Asignar Kilos/Productos a Cada Vendedor',
      'Ver Estado: En ruta / Cerrado',
      'Recaudación por Vendedor al Cierre'
    ]
  },
  {
    id: 'dashboard',
    name: 'Dashboard Admin',
    device: 'desktop',
    description: 'Panel de administración web',
    elements: [
      'Resumen del Día (ventas, recaudación)',
      'Gráfico: Ventas por hora',
      'Lista: Cuentas por Cobrar',
      'Tabla: Últimas Ventas',
      'Alertas: Stock Bajo',
      'Pedidos Pendientes'
    ]
  },
  {
    id: 'reports',
    name: 'Reportes',
    device: 'desktop',
    description: 'Reportes y estadísticas',
    elements: [
      'Filtros: Fecha, Vendedor, Producto',
      'Gráfico: Ventas vs Compras',
      'Tabla: Clientes con Deuda',
      'Exportar: Excel/PDF',
      'Resumen: Ganancias del período'
    ]
  }
];

export function Screens() {
  const [selectedScreen, setSelectedScreen] = useState('calc');
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');

  const currentScreen = screens.find(s => s.id === selectedScreen);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <Smartphone className="w-6 h-6 text-orange-500" />
          Mockups de Pantallas
        </h2>
        <p className="text-gray-400">
          Wireframes de las pantallas principales del sistema.
        </p>
      </motion.div>

      {/* Device Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setDeviceView('mobile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            deviceView === 'mobile'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile (Vendedor)
        </button>
        <button
          onClick={() => setDeviceView('desktop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            deviceView === 'desktop'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Desktop (Admin)
        </button>
      </div>

      {/* Screen Selector */}
      <div className="flex flex-wrap gap-2">
        {screens
          .filter(s => s.device === deviceView)
          .map(screen => (
            <button
              key={screen.id}
              onClick={() => setSelectedScreen(screen.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                selectedScreen === screen.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {screen.name}
            </button>
          ))}
      </div>

      {/* Screen Mockup */}
      {currentScreen && (
        <motion.div
          key={currentScreen.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{currentScreen.name}</h3>
              <p className="text-gray-500 text-sm">{currentScreen.description}</p>
            </div>
            <span className={`badge ${currentScreen.device === 'mobile' ? 'badge-orange' : 'badge-blue'}`}>
              {currentScreen.device.toUpperCase()}
            </span>
          </div>

          {/* Mockup Container */}
          <div className={`mx-auto bg-gray-900 rounded-2xl border-4 border-gray-700 overflow-hidden ${
            currentScreen.device === 'mobile' ? 'w-80 h-[600px]' : 'w-full h-96'
          }`}>
            {/* Mockup Header */}
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-white text-sm font-medium">PollosPro</span>
              </div>
              {currentScreen.device === 'mobile' && (
                <div className="text-gray-400 text-xs">9:41</div>
              )}
            </div>

            {/* Mockup Content */}
            <div className="p-4 space-y-3">
              {/* Render different content based on screen type */}
              {currentScreen.id === 'calc' && (
                <>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-orange-400">S/ 0.00</div>
                    <div className="text-gray-500 text-sm">Total a pagar</div>
                  </div>
                  {['Monto Total', 'Precio por Kg', 'Kilos Brutos', 'Tara'].map((label, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-500 text-xs mb-1">{label}</div>
                      <div className="text-gray-400">0.00</div>
                    </div>
                  ))}
                  <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium mt-4">
                    Calcular
                  </button>
                </>
              )}

              {currentScreen.id === 'sale' && (
                <>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">Cliente</div>
                    <div className="text-white flex items-center justify-between">
                      <span>Buscar por DNI...</span>
                      <span className="text-orange-400">+</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-2">Productos</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white">Pollo Entero</span>
                        <span className="text-orange-400">S/ 12.00/kg</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white">Huevos (caja)</span>
                        <span className="text-orange-400">S/ 15.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">Tipo de Pago</div>
                    <div className="flex gap-2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded text-xs">Contado</span>
                      <span className="bg-gray-700 text-gray-400 px-3 py-1 rounded text-xs">Crédito</span>
                    </div>
                  </div>
                  <button className="w-full bg-green-500 text-white py-3 rounded-lg font-medium mt-4">
                    Confirmar Venta
                  </button>
                </>
              )}

              {currentScreen.id === 'clients' && (
                <>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Buscar cliente...</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'María González', dni: '45678912', debt: 'S/ 450.00' },
                      { name: 'Juan Pérez', dni: '12345678', debt: 'Al día' },
                      { name: 'Carmen R.', dni: '87654321', debt: 'S/ 890.50' }
                    ].map((client, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm">{client.name}</div>
                          <div className="text-gray-500 text-xs">DNI: {client.dni}</div>
                        </div>
                        <span className={`text-xs ${client.debt === 'Al día' ? 'text-green-400' : 'text-red-400'}`}>
                          {client.debt}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {currentScreen.id === 'catalog' && (
                <>
                  <div className="flex gap-2 mb-3">
                    {['Pollo', 'Huevos', 'Otros'].map((tab, i) => (
                      <span key={i} className={`text-xs px-3 py-1 rounded-full ${
                        i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {tab}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Pollo Entero', price: 'S/ 12.00/kg' },
                      { name: 'Pechuga', price: 'S/ 18.00/kg' },
                      { name: 'Pierna', price: 'S/ 14.00/kg' },
                      { name: 'Alitas', price: 'S/ 15.00/kg' }
                    ].map((prod, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">🐔</div>
                        <div className="text-white text-xs">{prod.name}</div>
                        <div className="text-orange-400 text-xs">{prod.price}</div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium mt-3 flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Ver Carrito (2)
                  </button>
                </>
              )}

              {currentScreen.id === 'distribucion' && (
                <div className="space-y-3">
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                    <div className="text-orange-400 text-xs mb-1">Pollo Disponible Hoy</div>
                    <div className="text-2xl font-bold text-white">150 kg</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { vendedor: 'Juan P.', punto: 'Carro A', kilos: 50, vendido: 32, estado: 'En ruta' },
                      { vendedor: 'Pedro R.', punto: 'Casa', kilos: 40, vendido: 40, estado: 'Cerrado' },
                      { vendedor: 'María G.', punto: 'Local', kilos: 60, vendido: 0, estado: 'Pendiente' }
                    ].map((dist, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{dist.vendedor}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            dist.estado === 'En ruta' ? 'bg-blue-500/20 text-blue-400' :
                            dist.estado === 'Cerrado' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>{dist.estado}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-gray-500">Punto de Venta</div>
                            <div className="text-gray-300">{dist.punto}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Asignado</div>
                            <div className="text-orange-400">{dist.kilos} kg</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Vendido</div>
                            <div className="text-green-400">{dist.vendido} kg</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm">
                    + Nueva Asignación
                  </button>
                </div>
              )}

              {currentScreen.id === 'dashboard' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">S/ 2,450</div>
                    <div className="text-gray-500 text-xs">Ventas Hoy</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">47</div>
                    <div className="text-gray-500 text-xs">Ventas</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">S/ 1,230</div>
                    <div className="text-gray-500 text-xs">Por Cobrar</div>
                  </div>
                  <div className="col-span-3 bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-2">Ventas por Hora</div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 60, 30, 80, 50, 70, 90, 45].map((h, i) => (
                        <div key={i} className="flex-1 bg-orange-500/50 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3 bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-2">Últimas Ventas</div>
                    <div className="space-y-1">
                      {['María G. - S/ 150.00', 'Juan P. - S/ 80.00', 'Carmen R. - S/ 200.00'].map((sale, i) => (
                        <div key={i} className="text-gray-400 text-xs">{sale}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentScreen.id === 'users' && (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <button className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs">+ Nuevo Usuario</button>
                    <div className="bg-gray-800 rounded-lg px-3 py-1.5 flex-1">
                      <span className="text-gray-500 text-xs">Buscar...</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-700 text-xs text-gray-400">
                      <span>Nombre</span>
                      <span>Rol</span>
                      <span>Estado</span>
                      <span>Acciones</span>
                    </div>
                    {[
                      { name: 'Admin Principal', role: 'ADMIN', status: 'Activo' },
                      { name: 'Juan Vendedor', role: 'VENDEDOR', status: 'Activo' },
                      { name: 'Pedro Vendedor', role: 'VENDEDOR', status: 'Inactivo' }
                    ].map((user, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 border-t border-gray-700 text-xs">
                        <span className="text-white">{user.name}</span>
                        <span className={user.role === 'ADMIN' ? 'text-orange-400' : 'text-blue-400'}>{user.role}</span>
                        <span className={user.status === 'Activo' ? 'text-green-400' : 'text-gray-500'}>{user.status}</span>
                        <div className="flex gap-1">
                          <span className="text-blue-400 cursor-pointer">✎</span>
                          <span className="text-red-400 cursor-pointer">✕</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-2">Permisos por Rol</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-400">ADMIN</span>
                        <span className="text-gray-400">Todo el sistema</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-400">VENDEDOR</span>
                        <span className="text-gray-400">Ventas, Clientes, Catálogo</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentScreen.id === 'reports' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="bg-gray-800 rounded-lg p-2 flex-1">
                      <div className="text-gray-500 text-xs">Desde</div>
                      <div className="text-gray-400 text-sm">01/01/2024</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2 flex-1">
                      <div className="text-gray-500 text-xs">Hasta</div>
                      <div className="text-gray-400 text-sm">31/01/2024</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-green-400">S/ 45,230</div>
                      <div className="text-gray-500 text-xs">Total Ventas</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-blue-400">S/ 12,450</div>
                      <div className="text-gray-500 text-xs">Ganancia</div>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-2">Top Clientes</div>
                    <div className="space-y-1">
                      {['María G. - S/ 3,450', 'Juan P. - S/ 2,800', 'Carmen R. - S/ 2,100'].map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{i + 1}. {c.split(' - ')[0]}</span>
                          <span className="text-orange-400">{c.split(' - ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm">
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Screen Elements List */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Elementos de la pantalla</h4>
            <div className="flex flex-wrap gap-2">
              {currentScreen.elements.map((el, i) => (
                <span key={i} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg">
                  {el}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
