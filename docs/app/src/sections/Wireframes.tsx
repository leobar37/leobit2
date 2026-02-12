import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Monitor, 
  ChevronLeft, 
  ChevronRight,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  User,
  Calculator,
  ShoppingCart,
  Users,
  History,
  Package,
  Settings,
  LogOut,
  Plus,
  Search,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  DollarSign,
  CreditCard,
  BarChart3,
  Download,
  Filter,
  Edit,
  Trash2,
  Eye,
  Shield,
  Lock
} from 'lucide-react';

type ScreenType = 
  | 'login'
  | 'dashboard-vendedor'
  | 'dashboard-vendedor-libre'
  | 'calculadora'
  | 'nueva-venta'
  | 'clientes'
  | 'nuevo-cliente'
  | 'registrar-abono'
  | 'historial-ventas'
  | 'cierre-dia'
  | 'catalogo'
  | 'sync-status'
  | 'admin-dashboard'
  | 'admin-distribucion'
  | 'admin-usuarios'
  | 'admin-nuevo-usuario'
  | 'admin-reportes'
  | 'admin-clientes'
  | 'admin-config';

interface Screen {
  id: ScreenType;
  name: string;
  device: 'mobile' | 'desktop';
  description: string;
}

const screens: Screen[] = [
  { id: 'login', name: 'Login', device: 'mobile', description: 'Autenticación del vendedor' },
  { id: 'dashboard-vendedor', name: 'Dashboard (Con Inv.)', device: 'mobile', description: 'Dashboard con control de inventario' },
  { id: 'dashboard-vendedor-libre', name: 'Dashboard (Sin Inv.)', device: 'mobile', description: 'Dashboard sin control de inventario' },
  { id: 'calculadora', name: 'Calculadora', device: 'mobile', description: 'Cálculo de precios con tara' },
  { id: 'nueva-venta', name: 'Nueva Venta', device: 'mobile', description: 'Registro completo de venta' },
  { id: 'clientes', name: 'Clientes', device: 'mobile', description: 'Lista y gestión de clientes' },
  { id: 'nuevo-cliente', name: 'Nuevo Cliente', device: 'mobile', description: 'Formulario de registro' },
  { id: 'registrar-abono', name: 'Registrar Abono', device: 'mobile', description: 'Pago de deuda sin compra' },
  { id: 'historial-ventas', name: 'Historial', device: 'mobile', description: 'Ventas del día' },
  { id: 'cierre-dia', name: 'Cierre del Día', device: 'mobile', description: 'Resumen y cierre' },
  { id: 'catalogo', name: 'Catálogo', device: 'mobile', description: 'Productos para pedidos' },
  { id: 'sync-status', name: 'Estado Sync', device: 'mobile', description: 'Estado de sincronización' },
  { id: 'admin-dashboard', name: 'Dashboard Admin', device: 'desktop', description: 'Panel de administración' },
  { id: 'admin-distribucion', name: 'Distribución', device: 'desktop', description: 'Asignación a vendedores' },
  { id: 'admin-usuarios', name: 'Usuarios', device: 'desktop', description: 'Gestión de usuarios' },
  { id: 'admin-nuevo-usuario', name: 'Nuevo Usuario', device: 'desktop', description: 'Crear nuevo vendedor/admin' },
  { id: 'admin-reportes', name: 'Reportes', device: 'desktop', description: 'Reportes y estadísticas' },
  { id: 'admin-clientes', name: 'Clientes Admin', device: 'desktop', description: 'Gestión de clientes global' },
  { id: 'admin-config', name: 'Configuración', device: 'desktop', description: 'Configuración del sistema' },
];

// Mobile Status Bar Component
const MobileStatusBar = ({ offline = false, pendingOps = 0 }: { offline?: boolean; pendingOps?: number }) => (
  <div className="bg-gray-900 px-4 py-2 flex items-center justify-between text-white">
    <span className="text-xs font-medium">9:41</span>
    <div className="flex items-center gap-1.5">
      {offline ? (
        <div className="flex items-center gap-1 bg-gray-700 px-1.5 py-0.5 rounded">
          <WifiOff className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-400">Offline</span>
        </div>
      ) : pendingOps > 0 ? (
        <div className="flex items-center gap-1 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30">
          <RotateCcw className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] text-yellow-400">{pendingOps}</span>
        </div>
      ) : (
        <Wifi className="w-3.5 h-3.5 text-green-400" />
      )}
      <Signal className="w-3.5 h-3.5" />
      <Battery className="w-4 h-4" />
    </div>
  </div>
);

// Mobile Bottom Nav
const MobileBottomNav = ({ active }: { active: string }) => (
  <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-around">
    {[
      { id: 'home', icon: Package, label: 'Inicio' },
      { id: 'calc', icon: Calculator, label: 'Calc' },
      { id: 'clients', icon: Users, label: 'Clientes' },
      { id: 'history', icon: History, label: 'Historial' },
    ].map((item) => (
      <div key={item.id} className={`flex flex-col items-center gap-0.5 ${active === item.id ? 'text-orange-400' : 'text-gray-500'}`}>
        <item.icon className="w-5 h-5" />
        <span className="text-[10px]">{item.label}</span>
      </div>
    ))}
  </div>
);

// App Header
const AppHeader = ({ title, showBack = false, showSync = false, offline = false }: { title: string; showBack?: boolean; showSync?: boolean; offline?: boolean }) => (
  <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      {showBack && <ChevronLeft className="w-5 h-5 text-white" />}
      <span className="text-white font-semibold text-sm">{title}</span>
    </div>
    {showSync && (
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${offline ? 'bg-gray-700' : 'bg-white/20'}`}>
        {offline ? <WifiOff className="w-3.5 h-3.5 text-gray-400" /> : <RotateCcw className="w-3.5 h-3.5 text-white" />}
        <span className="text-[10px] text-white">{offline ? 'Offline' : 'Sync'}</span>
      </div>
    )}
  </div>
);

// Desktop Sidebar
const DesktopSidebar = ({ active }: { active: string }) => (
  <div className="w-56 bg-gray-900 border-r border-gray-700 flex flex-col">
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="text-white font-semibold">PollosPro</span>
      </div>
    </div>
    <nav className="flex-1 p-2 space-y-1">
      {[
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'distribucion', icon: MapPin, label: 'Distribución' },
        { id: 'usuarios', icon: Users, label: 'Usuarios' },
        { id: 'clientes', icon: User, label: 'Clientes' },
        { id: 'reportes', icon: BarChart3, label: 'Reportes' },
        { id: 'config', icon: Settings, label: 'Configuración' },
      ].map((item) => (
        <div 
          key={item.id} 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active === item.id ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:bg-gray-800'}`}
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
    <div className="p-4 border-t border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <LogOut className="w-4 h-4" />
        <span>Cerrar Sesión</span>
      </div>
    </div>
  </div>
);

// Desktop Header
const DesktopHeader = ({ title, user = 'Admin' }: { title: string; user?: string }) => (
  <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6">
    <h1 className="text-white font-semibold">{title}</h1>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <Wifi className="w-4 h-4" />
        <span>En línea</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.charAt(0)}
        </div>
        <span className="text-gray-300 text-sm">{user}</span>
      </div>
    </div>
  </div>
);

// ============ MOBILE WIREFRAMES ============

const LoginWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-white text-3xl font-bold">P</span>
      </div>
      <h2 className="text-white text-xl font-bold mb-1">PollosPro</h2>
      <p className="text-gray-500 text-sm mb-8">Sistema de Ventas</p>
      
      <div className="w-full space-y-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-500 text-xs mb-1">Usuario</div>
          <div className="text-gray-300">vendedor@pollospro.com</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-500 text-xs mb-1">Contraseña</div>
          <div className="text-gray-300">••••••••</div>
        </div>
        <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium">
          Iniciar Sesión
        </button>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-xs">Token válido por 24-48 horas</p>
      </div>
    </div>
  </div>
);

const DashboardVendedorWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline pendingOps={3} />
    <AppHeader title="Mi Día" showSync offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Selector de modo (para demo) */}
      <div className="flex gap-2 text-xs">
        <span className="bg-orange-500 text-white px-2 py-1 rounded">Modo: Con Inventario</span>
        <span className="bg-gray-700 text-gray-400 px-2 py-1 rounded cursor-pointer">Sin Inventario</span>
      </div>
      
      {/* Asignación del día - SOLO en modo inventario */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-orange-400 text-sm font-medium">Mi Asignación</span>
          <span className="bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded">Hoy</span>
        </div>
        <div className="flex items-end gap-1 mb-1">
          <span className="text-3xl font-bold text-white">45</span>
          <span className="text-gray-400 text-sm mb-1">kg</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Vendido: 32 kg</span>
          <span className="text-green-400">Restante: 13 kg</span>
        </div>
        <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: '71%' }} />
        </div>
        <p className="text-gray-500 text-[10px] mt-2">Punto de venta: Carro A</p>
      </div>
      
      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Calculator, label: 'Calculadora', color: 'bg-blue-500' },
          { icon: ShoppingCart, label: 'Nueva Venta', color: 'bg-green-500' },
          { icon: Users, label: 'Clientes', color: 'bg-purple-500' },
          { icon: History, label: 'Historial', color: 'bg-gray-600' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-300 text-xs">{item.label}</span>
          </div>
        ))}
      </div>
      
      {/* Estado offline */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-gray-300 text-sm">Modo Offline</p>
          <p className="text-gray-500 text-xs">3 operaciones pendientes</p>
        </div>
        <button className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded">
          Sync
        </button>
      </div>
      
      {/* Resumen rápido */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-3">Resumen del Día</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">S/ 480</div>
            <div className="text-gray-500 text-[10px]">Ventas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">8</div>
            <div className="text-gray-500 text-[10px]">Ventas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400">S/ 120</div>
            <div className="text-gray-500 text-[10px]">Crédito</div>
          </div>
        </div>
      </div>
    </div>
    
    <MobileBottomNav active="home" />
  </div>
);

// Dashboard en modo SIN inventario
const DashboardVendedorLibreWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline pendingOps={3} />
    <AppHeader title="Mi Día" showSync offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Selector de modo (para demo) */}
      <div className="flex gap-2 text-xs">
        <span className="bg-gray-700 text-gray-400 px-2 py-1 rounded cursor-pointer">Con Inventario</span>
        <span className="bg-green-500 text-white px-2 py-1 rounded">Modo: Sin Inventario</span>
      </div>
      
      {/* Info de modo libre - NO hay asignación */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Modo Libre</span>
        </div>
        <p className="text-gray-400 text-xs">Registra tus ventas sin control de stock. El sistema guarda todo localmente.</p>
      </div>
      
      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Calculator, label: 'Calculadora', color: 'bg-blue-500' },
          { icon: ShoppingCart, label: 'Nueva Venta', color: 'bg-green-500' },
          { icon: Users, label: 'Clientes', color: 'bg-purple-500' },
          { icon: History, label: 'Historial', color: 'bg-gray-600' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-300 text-xs">{item.label}</span>
          </div>
        ))}
      </div>
      
      {/* Estado offline */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-gray-300 text-sm">Modo Offline</p>
          <p className="text-gray-500 text-xs">3 operaciones pendientes</p>
        </div>
        <button className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded">
          Sync
        </button>
      </div>
      
      {/* Resumen rápido - SIN referencia a kilos */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-3">Resumen del Día</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">S/ 480</div>
            <div className="text-gray-500 text-[10px]">Ventas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">8</div>
            <div className="text-gray-500 text-[10px]">Ventas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400">S/ 120</div>
            <div className="text-gray-500 text-[10px]">Crédito</div>
          </div>
        </div>
      </div>
    </div>
    
    <MobileBottomNav active="home" />
  </div>
);

const CalculadoraWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <AppHeader title="Calculadora" showBack />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Resultado */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-6 text-center">
        <p className="text-white/70 text-sm mb-1">Total a Pagar</p>
        <p className="text-4xl font-bold text-white">S/ 84.00</p>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div>
            <p className="text-white/70 text-xs">Kilos Netos</p>
            <p className="text-white font-medium">7.00 kg</p>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <p className="text-white/70 text-xs">Precio/kg</p>
            <p className="text-white font-medium">S/ 12.00</p>
          </div>
        </div>
      </div>
      
      {/* Inputs */}
      <div className="space-y-3">
        {[
          { label: 'Kilos Brutos', value: '8.50', unit: 'kg' },
          { label: 'Tara (envase)', value: '1.50', unit: 'kg' },
          { label: 'Precio por Kg', value: '12.00', unit: 'S/' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-xs">{item.label}</span>
              <span className="text-gray-500 text-xs">{item.unit}</span>
            </div>
            <div className="text-white text-lg">{item.value}</div>
          </div>
        ))}
      </div>
      
      {/* Botones */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-gray-700 text-white py-3 rounded-lg font-medium">
          Limpiar
        </button>
        <button className="bg-orange-500 text-white py-3 rounded-lg font-medium">
          Usar en Venta
        </button>
      </div>
    </div>
  </div>
);

const NuevaVentaWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline />
    <AppHeader title="Nueva Venta" showBack offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Cliente */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-xs">Cliente</span>
          <button className="text-orange-400 text-xs">Sin cliente</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm">Buscar por DNI o nombre...</span>
          </div>
          <button className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
        {/* Opción venta sin cliente */}
        <button className="mt-2 w-full py-2 bg-gray-700/50 rounded-lg text-gray-400 text-xs flex items-center justify-center gap-2">
          <User className="w-4 h-4" />
          Vender sin registrar cliente
        </button>
      </div>
      
      {/* Producto seleccionado */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Pollo Entero</p>
            <p className="text-orange-400 text-xs">S/ 12.00 / kg</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-white">-</button>
            <span className="text-white w-8 text-center">7</span>
            <button className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-white">+</button>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-orange-500/20 flex items-center justify-between text-sm">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-white font-medium">S/ 84.00</span>
        </div>
      </div>
      
      {/* Tipo de pago */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-gray-500 text-xs mb-2">Tipo de Pago</div>
        <div className="flex gap-2">
          <button className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium">
            Contado
          </button>
          <button className="flex-1 bg-gray-700 text-gray-400 py-2 rounded-lg text-sm">
            Crédito
          </button>
        </div>
      </div>
      
      {/* Monto pagado (si es parcial) */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500 text-xs">Monto Pagado</span>
          <span className="text-gray-500 text-xs">S/</span>
        </div>
        <div className="text-white text-lg">84.00</div>
      </div>
      
      {/* Total */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total</span>
          <span className="text-2xl font-bold text-white">S/ 84.00</span>
        </div>
      </div>
      
      {/* Botón confirmar */}
      <button className="w-full bg-green-500 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2">
        <Check className="w-5 h-5" />
        Confirmar Venta
      </button>
      
      {/* Indicador offline */}
      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
        <WifiOff className="w-3 h-3" />
        <span>Se guardará localmente</span>
      </div>
    </div>
  </div>
);

const ClientesWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <AppHeader title="Clientes" showBack />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400 text-sm">Buscar cliente...</span>
        </div>
        <button className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Filtros */}
      <div className="flex gap-2">
        {['Todos', 'Con deuda', 'Al día'].map((f, i) => (
          <button 
            key={i} 
            className={`px-3 py-1 rounded-full text-xs ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      {/* Botón rápido: Registrar abono */}
      <button className="w-full bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-center gap-2">
        <DollarSign className="w-5 h-5 text-green-400" />
        <span className="text-green-400 text-sm font-medium">Registrar Abono (solo pago)</span>
      </button>
      
      {/* Lista de clientes */}
      <div className="space-y-2">
        {[
          { name: 'María González', dni: '45678912', debt: 450, status: 'debt' },
          { name: 'Juan Pérez', dni: '12345678', debt: 0, status: 'ok' },
          { name: 'Carmen Rodríguez', dni: '87654321', debt: 890.50, status: 'debt' },
          { name: 'Pedro López', dni: '34567890', debt: 0, status: 'ok' },
          { name: 'Ana Torres', dni: '56789012', debt: 120, status: 'debt' },
        ].map((client, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{client.name}</p>
                  <p className="text-gray-500 text-xs">DNI: {client.dni}</p>
                </div>
              </div>
              <div className="text-right">
                {client.debt > 0 ? (
                  <>
                    <p className="text-red-400 text-sm font-medium">S/ {client.debt.toFixed(2)}</p>
                    <p className="text-red-400/70 text-[10px]">Debe</p>
                  </>
                ) : (
                  <>
                    <p className="text-green-400 text-sm font-medium">Al día</p>
                    <p className="text-green-400/70 text-[10px]">Sin deuda</p>
                  </>
                )}
              </div>
            </div>
            {client.debt > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700 flex gap-2">
                <button className="flex-1 bg-green-500/20 text-green-400 text-xs py-1.5 rounded">
                  Registrar Abono
                </button>
                <button className="flex-1 bg-orange-500/20 text-orange-400 text-xs py-1.5 rounded">
                  Nueva Venta
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    
    <MobileBottomNav active="clients" />
  </div>
);

// Wireframe para Registrar Abono (pago de deuda sin compra)
const RegistrarAbonoWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline />
    <AppHeader title="Registrar Abono" showBack offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Info del cliente */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-500 text-xs mb-1">Cliente</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-white font-medium">María González</p>
            <p className="text-gray-500 text-xs">DNI: 45678912</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Deuda actual</span>
            <span className="text-red-400 text-xl font-bold">S/ 450.00</span>
          </div>
        </div>
      </div>
      
      {/* Monto del abono */}
      <div className="bg-gray-800 rounded-lg p-4">
        <label className="text-gray-400 text-sm block mb-2">Monto del abono</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-lg">S/</span>
          <input 
            type="number" 
            defaultValue="100.00"
            className="flex-1 bg-gray-700 text-white text-2xl font-bold rounded-lg px-4 py-3"
          />
        </div>
        {/* Botones rápidos */}
        <div className="flex gap-2 mt-3">
          {['Total', '50', '100', '200'].map((monto, i) => (
            <button 
              key={i} 
              className={`flex-1 py-2 rounded-lg text-sm ${monto === 'Total' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
              {monto === 'Total' ? 'Todo' : `S/${monto}`}
            </button>
          ))}
        </div>
      </div>
      
      {/* Método de pago */}
      <div className="bg-gray-800 rounded-lg p-4">
        <label className="text-gray-400 text-sm block mb-2">Método de pago</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
            { id: 'yape', label: 'Yape', icon: Smartphone },
            { id: 'plin', label: 'Plin', icon: Smartphone },
            { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
          ].map((method, i) => (
            <button 
              key={i} 
              className={`p-3 rounded-lg flex items-center gap-2 ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
              <method.icon className="w-4 h-4" />
              <span className="text-sm">{method.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Notas opcionales */}
      <div className="bg-gray-800 rounded-lg p-3">
        <label className="text-gray-400 text-sm block mb-1">Notas (opcional)</label>
        <div className="text-gray-500 text-sm">Pago parcial de deuda...</div>
      </div>
      
      {/* Resumen */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Deuda anterior</span>
          <span className="text-white">S/ 450.00</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Abono</span>
          <span className="text-green-400">- S/ 100.00</span>
        </div>
        <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Nueva deuda</span>
          <span className="text-orange-400 text-xl font-bold">S/ 350.00</span>
        </div>
      </div>
      
      {/* Botón confirmar */}
      <button className="w-full bg-green-500 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2">
        <Check className="w-5 h-5" />
        Confirmar Abono
      </button>
      
      {/* Info offline */}
      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
        <WifiOff className="w-3 h-3" />
        <span>Se guardará localmente y se sincronizará</span>
      </div>
    </div>
  </div>
);

const NuevoClienteWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline />
    <AppHeader title="Nuevo Cliente" showBack offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="space-y-4">
        {[
          { label: 'DNI', placeholder: 'Ingrese DNI', type: 'text' },
          { label: 'Nombres', placeholder: 'Ingrese nombres', type: 'text' },
          { label: 'Apellidos', placeholder: 'Ingrese apellidos', type: 'text' },
          { label: 'Teléfono', placeholder: 'Ingrese teléfono', type: 'tel' },
          { label: 'Dirección', placeholder: 'Ingrese dirección (opcional)', type: 'text' },
        ].map((field, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">{field.label}</div>
            <div className="text-gray-400 text-sm">{field.placeholder}</div>
          </div>
        ))}
      </div>
      
      {/* Info offline */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-400 text-xs font-medium">Modo Offline</p>
          <p className="text-gray-400 text-xs">El cliente se guardará localmente y se sincronizará cuando haya conexión.</p>
        </div>
      </div>
      
      <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium">
        Guardar Cliente
      </button>
    </div>
  </div>
);

const HistorialVentasWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <AppHeader title="Historial de Ventas" showBack />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">S/ 840</p>
          <p className="text-gray-500 text-[10px]">Total</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">12</p>
          <p className="text-gray-500 text-[10px]">Ventas</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-orange-400">S/ 320</p>
          <p className="text-gray-500 text-[10px]">Crédito</p>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="flex gap-2">
        {['Hoy', 'Ayer', 'Esta semana'].map((f, i) => (
          <button 
            key={i} 
            className={`px-3 py-1 rounded-full text-xs ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      {/* Lista de ventas */}
      <div className="space-y-2">
        {[
          { client: 'María González', time: '10:30 AM', amount: 84, type: 'cash', status: 'synced' },
          { client: 'Juan Pérez', time: '10:15 AM', amount: 120, type: 'credit', status: 'synced' },
          { client: 'Carmen R.', time: '9:45 AM', amount: 56, type: 'cash', status: 'pending' },
          { client: 'Pedro L.', time: '9:20 AM', amount: 98, type: 'cash', status: 'synced' },
          { client: 'Ana Torres', time: '8:55 AM', amount: 150, type: 'credit', status: 'pending' },
        ].map((sale, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sale.type === 'cash' ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                  {sale.type === 'cash' ? <DollarSign className="w-4 h-4 text-green-400" /> : <CreditCard className="w-4 h-4 text-orange-400" />}
                </div>
                <div>
                  <p className="text-white text-sm">{sale.client}</p>
                  <p className="text-gray-500 text-xs">{sale.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">S/ {sale.amount}</p>
                {sale.status === 'pending' ? (
                  <span className="text-yellow-400 text-[10px]">⏳ Pendiente</span>
                ) : (
                  <span className="text-green-400 text-[10px]">✓ Sincronizado</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <MobileBottomNav active="history" />
  </div>
);

const CierreDiaWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar offline pendingOps={2} />
    <AppHeader title="Cierre del Día" showSync offline />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Estado */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
        <p className="text-green-400 font-medium">Día Completado</p>
        <p className="text-gray-500 text-xs">Listo para sincronizar</p>
      </div>
      
      {/* Resumen */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-4">Resumen del Día</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Kilos Asignados</span>
            <span className="text-white">45 kg</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Kilos Vendidos</span>
            <span className="text-green-400">42 kg</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Kilos Devueltos</span>
            <span className="text-orange-400">3 kg</span>
          </div>
          <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Total Ventas</span>
            <span className="text-white font-bold">S/ 1,240</span>
          </div>
        </div>
      </div>
      
      {/* Desglose */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-4">Desglose de Pagos</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Efectivo</span>
            </div>
            <span className="text-green-400">S/ 920</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span className="text-gray-300 text-sm">Crédito</span>
            </div>
            <span className="text-orange-400">S/ 320</span>
          </div>
        </div>
      </div>
      
      {/* Operaciones pendientes */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">Operaciones Pendientes</span>
        </div>
        <p className="text-gray-400 text-xs">2 ventas y 1 cliente nuevo esperando sincronización</p>
      </div>
      
      {/* Botón sincronizar */}
      <button className="w-full bg-orange-500 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2">
        <RotateCcw className="w-5 h-5" />
        Sincronizar Ahora
      </button>
    </div>
  </div>
);

const CatalogoWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <AppHeader title="Catálogo" showBack />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {['Pollo', 'Huevos', 'Otros'].map((tab, i) => (
          <button 
            key={i} 
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Productos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'Pollo Entero', price: 'S/ 12.00/kg', stock: 'Disponible' },
          { name: 'Pechuga', price: 'S/ 18.00/kg', stock: 'Disponible' },
          { name: 'Pierna', price: 'S/ 14.00/kg', stock: 'Bajo stock' },
          { name: 'Alitas', price: 'S/ 15.00/kg', stock: 'Disponible' },
          { name: 'Menudencia', price: 'S/ 8.00/kg', stock: 'Disponible' },
          { name: 'Hígado', price: 'S/ 10.00/kg', stock: 'Agotado' },
        ].map((prod, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">🐔</div>
            <p className="text-white text-sm font-medium">{prod.name}</p>
            <p className="text-orange-400 text-sm">{prod.price}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full mt-2 inline-block ${
              prod.stock === 'Disponible' ? 'bg-green-500/20 text-green-400' :
              prod.stock === 'Bajo stock' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {prod.stock}
            </span>
          </div>
        ))}
      </div>
    </div>
    
    {/* Carrito flotante */}
    <div className="p-4">
      <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        Ver Carrito (2 items)
      </button>
    </div>
  </div>
);

const SyncStatusWireframe = () => (
  <div className="h-full flex flex-col bg-gray-950">
    <MobileStatusBar />
    <AppHeader title="Estado de Sync" showBack />
    
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* Estado general */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-green-400 font-medium text-lg">Sincronizado</p>
        <p className="text-gray-500 text-xs">Última sync: hace 5 minutos</p>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">47</p>
          <p className="text-gray-500 text-xs">Ventas sync</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">12</p>
          <p className="text-gray-500 text-xs">Clientes sync</p>
        </div>
      </div>
      
      {/* Cola de operaciones */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-4">Cola de Operaciones</h3>
        <div className="space-y-2">
          {[
            { type: 'Venta', desc: 'María G. - S/ 84.00', status: 'synced', time: '10:30' },
            { type: 'Cliente', desc: 'Nuevo: Pedro López', status: 'synced', time: '10:15' },
            { type: 'Abono', desc: 'Juan P. - S/ 50.00', status: 'synced', time: '9:45' },
            { type: 'Venta', desc: 'Carmen R. - S/ 120.00', status: 'synced', time: '9:30' },
          ].map((op, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-white text-xs">{op.desc}</p>
                  <p className="text-gray-500 text-[10px]">{op.type}</p>
                </div>
              </div>
              <span className="text-gray-500 text-xs">{op.time}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Configuración sync */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs mb-4">Configuración</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Sync automático</span>
            <div className="w-10 h-5 bg-green-500 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Intervalo</span>
            <span className="text-gray-400 text-sm">30 segundos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Solo WiFi</span>
            <div className="w-10 h-5 bg-gray-600 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Botón sync manual */}
      <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
        <RotateCcw className="w-5 h-5" />
        Sincronizar Ahora
      </button>
    </div>
  </div>
);

// ============ DESKTOP WIREFRAMES ============

const AdminDashboardWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="dashboard" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ventas Hoy', value: 'S/ 4,580', color: 'text-green-400', icon: DollarSign },
            { label: 'Total Ventas', value: '89', color: 'text-blue-400', icon: ShoppingCart },
            { label: 'Por Cobrar', value: 'S/ 2,340', color: 'text-orange-400', icon: CreditCard },
            { label: 'Vendedores', value: '5', color: 'text-purple-400', icon: Users },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-4">Ventas por Hora</h3>
            <div className="flex items-end gap-2 h-32">
              {[30, 45, 25, 60, 40, 55, 70, 50, 35, 45, 60, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-orange-500/50 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-4">Últimas Ventas</h3>
            <div className="space-y-2">
              {[
                { client: 'María González', amount: 150, time: '10:30 AM', vendor: 'Juan' },
                { client: 'Pedro López', amount: 80, time: '10:15 AM', vendor: 'María' },
                { client: 'Carmen R.', amount: 200, time: '9:45 AM', vendor: 'Juan' },
                { client: 'Ana Torres', amount: 120, time: '9:30 AM', vendor: 'Pedro' },
              ].map((sale, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{sale.client}</p>
                    <p className="text-gray-500 text-xs">{sale.vendor} • {sale.time}</p>
                  </div>
                  <span className="text-green-400 text-sm">S/ {sale.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <h3 className="text-gray-400 text-sm mb-4">Estado de Vendedores</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { name: 'Juan P.', status: 'online', sales: 23, amount: 1200 },
              { name: 'María G.', status: 'online', sales: 18, amount: 980 },
              { name: 'Pedro R.', status: 'offline', sales: 15, amount: 850 },
              { name: 'Carmen T.', status: 'online', sales: 20, amount: 1100 },
              { name: 'Luis M.', status: 'offline', sales: 13, amount: 450 },
            ].map((vendor, i) => (
              <div key={i} className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${vendor.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                <p className="text-white text-sm">{vendor.name}</p>
                <p className="text-gray-400 text-xs">{vendor.sales} ventas</p>
                <p className="text-green-400 text-sm">S/ {vendor.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminDistribucionWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="distribucion" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Distribución del Día" />
      <div className="flex-1 overflow-auto p-6">
        {/* Inventario disponible */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-400 text-sm">Inventario Disponible Hoy</p>
              <p className="text-3xl font-bold text-white">250 kg</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Asignado</p>
              <p className="text-xl text-white">200 kg</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: '80%' }} />
          </div>
        </div>
        
        {/* Tabla de distribución */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">Asignaciones de Hoy</h3>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Asignación
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left text-gray-400 text-xs p-3">Vendedor</th>
                <th className="text-left text-gray-400 text-xs p-3">Punto de Venta</th>
                <th className="text-left text-gray-400 text-xs p-3">Asignado</th>
                <th className="text-left text-gray-400 text-xs p-3">Vendido</th>
                <th className="text-left text-gray-400 text-xs p-3">Estado</th>
                <th className="text-left text-gray-400 text-xs p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[
                { vendor: 'Juan P.', point: 'Carro A', assigned: 50, sold: 42, status: 'active' },
                { vendor: 'María G.', point: 'Casa', assigned: 40, sold: 40, status: 'closed' },
                { vendor: 'Pedro R.', point: 'Local 1', assigned: 60, sold: 35, status: 'active' },
                { vendor: 'Carmen T.', point: 'Carro B', assigned: 50, sold: 0, status: 'pending' },
              ].map((row, i) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-3 text-white text-sm">{row.vendor}</td>
                  <td className="p-3 text-gray-400 text-sm">{row.point}</td>
                  <td className="p-3 text-orange-400 text-sm">{row.assigned} kg</td>
                  <td className="p-3 text-green-400 text-sm">{row.sold} kg</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      row.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      row.status === 'closed' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-600 text-gray-400'
                    }`}>
                      {row.status === 'active' ? 'En ruta' : row.status === 'closed' ? 'Cerrado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Eye className="w-4 h-4 text-gray-400 cursor-pointer" />
                      <Edit className="w-4 h-4 text-blue-400 cursor-pointer" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const AdminUsuariosWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="usuarios" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Gestión de Usuarios" />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Buscar usuario...</span>
              </div>
              <select className="bg-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
                <option>Todos los roles</option>
                <option>Admin</option>
                <option>Vendedor</option>
              </select>
            </div>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left text-gray-400 text-xs p-3">Usuario</th>
                <th className="text-left text-gray-400 text-xs p-3">Email</th>
                <th className="text-left text-gray-400 text-xs p-3">Rol</th>
                <th className="text-left text-gray-400 text-xs p-3">Estado</th>
                <th className="text-left text-gray-400 text-xs p-3">Último Acceso</th>
                <th className="text-left text-gray-400 text-xs p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Admin Principal', email: 'admin@pollospro.com', role: 'ADMIN', status: 'active', lastAccess: 'Hace 5 min' },
                { name: 'Juan Pérez', email: 'juan@pollospro.com', role: 'VENDEDOR', status: 'active', lastAccess: 'Hace 10 min' },
                { name: 'María González', email: 'maria@pollospro.com', role: 'VENDEDOR', status: 'active', lastAccess: 'Hace 1 hora' },
                { name: 'Pedro Rodríguez', email: 'pedro@pollospro.com', role: 'VENDEDOR', status: 'inactive', lastAccess: 'Hace 2 días' },
                { name: 'Carmen Torres', email: 'carmen@pollospro.com', role: 'VENDEDOR', status: 'active', lastAccess: 'Hace 30 min' },
              ].map((user, i) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-white text-sm">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{user.email}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${user.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{user.lastAccess}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Edit className="w-4 h-4 text-blue-400 cursor-pointer" />
                      <Trash2 className="w-4 h-4 text-red-400 cursor-pointer" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// Admin Nuevo Usuario Wireframe - Formulario para crear vendedores
const AdminNuevoUsuarioWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="usuarios" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Crear Nuevo Usuario" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm">
              <strong>Tip:</strong> El nuevo usuario recibirá un email con sus credenciales de acceso. 
              Podrá cambiar su contraseña al iniciar sesión por primera vez.
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            {/* Datos básicos */}
            <div>
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-400" />
                Datos del Usuario
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Nombre completo *</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Juan Pérez García"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">DNI *</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 45678912"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Email *</label>
                  <input 
                    type="email" 
                    placeholder="Ej: juan@pollospro.com"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Teléfono</label>
                  <input 
                    type="tel" 
                    placeholder="Ej: 987654321"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Rol y permisos */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                Rol y Permisos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Rol *</label>
                  <select className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2">
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Estado inicial</label>
                  <select className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
              
              {/* Permisos del rol */}
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">Permisos del rol seleccionado:</p>
                <div className="flex flex-wrap gap-2">
                  {['Ventas', 'Clientes', 'Calculadora', 'Catálogo', 'Historial'].map((perm, i) => (
                    <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Configuración adicional (solo para vendedores) */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-400" />
                Configuración del Vendedor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Punto de venta por defecto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Carro A, Casa, Local Centro"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Comisión (%)</label>
                  <input 
                    type="number" 
                    defaultValue="5"
                    className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Credenciales */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Credenciales de Acceso
              </h3>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Generar contraseña automática</span>
                  <div className="w-10 h-5 bg-green-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
                <p className="text-gray-500 text-xs">
                  Se generará una contraseña segura y se enviará al email del usuario.
                </p>
              </div>
            </div>
          </div>
          
          {/* Botones */}
          <div className="mt-6 flex justify-end gap-3">
            <button className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium">
              Cancelar
            </button>
            <button className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium flex items-center gap-2">
              <Check className="w-5 h-5" />
              Crear Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminReportesWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="reportes" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Reportes" />
      <div className="flex-1 overflow-auto p-6">
        {/* Filtros */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Desde</label>
              <input type="date" className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2" defaultValue="2024-01-01" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Hasta</label>
              <input type="date" className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2" defaultValue="2024-01-31" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Vendedor</label>
              <select className="bg-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
                <option>Todos</option>
                <option>Juan Pérez</option>
                <option>María González</option>
              </select>
            </div>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 ml-auto">
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Ventas', value: 'S/ 45,230', color: 'text-green-400' },
            { label: 'Total Transacciones', value: '892', color: 'text-blue-400' },
            { label: 'Ganancia', value: 'S/ 12,450', color: 'text-purple-400' },
            { label: 'Clientes Nuevos', value: '23', color: 'text-orange-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        
        {/* Gráfico */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-4">Ventas vs Compras</h3>
            <div className="flex items-end gap-1 h-40">
              {[40, 55, 45, 70, 60, 75, 65, 80, 70, 85, 75, 90].map((h, i) => (
                <div key={i} className="flex-1 flex gap-0.5">
                  <div className="flex-1 bg-orange-500/50 rounded-t" style={{ height: `${h}%` }} />
                  <div className="flex-1 bg-blue-500/30 rounded-t" style={{ height: `${h * 0.6}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Ene</span>
              <span>Jun</span>
              <span>Dic</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-4">Top Clientes</h3>
            <div className="space-y-3">
              {[
                { name: 'María González', amount: 3450 },
                { name: 'Juan Pérez', amount: 2800 },
                { name: 'Carmen Rodríguez', amount: 2100 },
                { name: 'Pedro López', amount: 1850 },
                { name: 'Ana Torres', amount: 1200 },
              ].map((client, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-orange-500/20 text-orange-400 rounded text-xs flex items-center justify-center">{i + 1}</span>
                    <span className="text-white text-sm">{client.name}</span>
                  </div>
                  <span className="text-green-400 text-sm">S/ {client.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminClientesWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="clientes" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Gestión de Clientes" />
      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Clientes', value: '156', color: 'text-blue-400' },
            { label: 'Con Deuda', value: '43', color: 'text-red-400' },
            { label: 'Al Día', value: '113', color: 'text-green-400' },
            { label: 'Deuda Total', value: 'S/ 8,450', color: 'text-orange-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        
        {/* Tabla */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Buscar cliente...</span>
              </div>
              <select className="bg-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
                <option>Todos</option>
                <option>Con deuda</option>
                <option>Al día</option>
              </select>
            </div>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left text-gray-400 text-xs p-3">Cliente</th>
                <th className="text-left text-gray-400 text-xs p-3">DNI</th>
                <th className="text-left text-gray-400 text-xs p-3">Teléfono</th>
                <th className="text-left text-gray-400 text-xs p-3">Compras</th>
                <th className="text-left text-gray-400 text-xs p-3">Deuda</th>
                <th className="text-left text-gray-400 text-xs p-3">Estado</th>
                <th className="text-left text-gray-400 text-xs p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'María González', dni: '45678912', phone: '987654321', purchases: 45, debt: 450, status: 'debt' },
                { name: 'Juan Pérez', dni: '12345678', phone: '912345678', purchases: 32, debt: 0, status: 'ok' },
                { name: 'Carmen Rodríguez', dni: '87654321', phone: '956789012', purchases: 28, debt: 890.50, status: 'debt' },
                { name: 'Pedro López', dni: '34567890', phone: '934567890', purchases: 15, debt: 0, status: 'ok' },
                { name: 'Ana Torres', dni: '56789012', phone: '978901234', purchases: 22, debt: 120, status: 'debt' },
              ].map((client, i) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-white text-sm">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{client.dni}</td>
                  <td className="p-3 text-gray-400 text-sm">{client.phone}</td>
                  <td className="p-3 text-gray-400 text-sm">{client.purchases}</td>
                  <td className="p-3">
                    <span className={client.debt > 0 ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>
                      S/ {client.debt.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${client.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {client.status === 'ok' ? 'Al día' : 'Debe'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Eye className="w-4 h-4 text-gray-400 cursor-pointer" />
                      <Edit className="w-4 h-4 text-blue-400 cursor-pointer" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// Admin Configuración Wireframe
const AdminConfigWireframe = () => (
  <div className="h-full flex bg-gray-950">
    <DesktopSidebar active="config" />
    <div className="flex-1 flex flex-col">
      <DesktopHeader title="Configuración del Sistema" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Modo de Operación */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-400" />
              Modo de Operación
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Tipo de operación</label>
                <select className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2">
                  <option value="inventario">Inventario Propio (control de stock)</option>
                  <option value="libre">Sin Inventario (solo registro)</option>
                  <option value="pedidos">Pedidos Primero (pre-venta)</option>
                  <option value="mixto">Mixto (flexible)</option>
                </select>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-orange-400 text-sm font-medium">Inventario Propio</p>
                <p className="text-gray-400 text-xs mt-1">Controla stock, distribuye kilos a vendedores, valida disponibilidad.</p>
              </div>
            </div>
          </div>
          
          {/* Opciones de Inventario */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Opciones de Inventario
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm">Control de stock</p>
                  <p className="text-gray-400 text-xs">Validar disponibilidad al vender</p>
                </div>
                <div className="w-10 h-5 bg-green-500 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm">Usar Distribución del Día</p>
                  <p className="text-gray-400 text-xs">Asignar kilos a vendedores</p>
                </div>
                <div className="w-10 h-5 bg-green-500 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm">Permitir venta sin stock</p>
                  <p className="text-gray-400 text-xs">Vender aunque no haya kilos asignados</p>
                </div>
                <div className="w-10 h-5 bg-gray-600 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Configuración Offline */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-400" />
              Sincronización
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm">Sync automático</p>
                  <p className="text-gray-400 text-xs">Sincronizar cuando hay internet</p>
                </div>
                <div className="w-10 h-5 bg-green-500 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Intervalo de sync</label>
                <select className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2">
                  <option>Cada 30 segundos</option>
                  <option>Cada 1 minuto</option>
                  <option>Cada 5 minutos</option>
                  <option>Solo manual</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Precios */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              Precios por Defecto
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Pollo Entero (S/kg)</label>
                <input type="number" defaultValue="12.00" className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Pechuga (S/kg)</label>
                <input type="number" defaultValue="18.00" className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Botón guardar */}
        <div className="mt-6 flex justify-end">
          <button className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
            <Check className="w-5 h-5" />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Layout wrapper components
const MobileWireframe = ({ children }: { children: React.ReactNode }) => (
  <div className="w-80 h-[600px] bg-gray-950 rounded-[2rem] border-4 border-gray-700 overflow-hidden mx-auto shadow-2xl">
    {children}
  </div>
);

const DesktopWireframe = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full h-96 bg-gray-950 rounded-xl border-4 border-gray-700 overflow-hidden shadow-2xl">
    {children}
  </div>
);

// Icon component for sidebar
const LayoutDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export function Wireframes() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenType>('dashboard-vendedor');
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');

  const currentScreen = screens.find(s => s.id === selectedScreen);

  const renderWireframe = () => {
    const wireframes: Record<ScreenType, React.ReactNode> = {
      'login': <LoginWireframe />,
      'dashboard-vendedor': <DashboardVendedorWireframe />,
      'dashboard-vendedor-libre': <DashboardVendedorLibreWireframe />,
      'calculadora': <CalculadoraWireframe />,
      'nueva-venta': <NuevaVentaWireframe />,
      'clientes': <ClientesWireframe />,
      'nuevo-cliente': <NuevoClienteWireframe />,
      'registrar-abono': <RegistrarAbonoWireframe />,
      'historial-ventas': <HistorialVentasWireframe />,
      'cierre-dia': <CierreDiaWireframe />,
      'catalogo': <CatalogoWireframe />,
      'sync-status': <SyncStatusWireframe />,
      'admin-dashboard': <AdminDashboardWireframe />,
      'admin-distribucion': <AdminDistribucionWireframe />,
      'admin-usuarios': <AdminUsuariosWireframe />,
      'admin-nuevo-usuario': <AdminNuevoUsuarioWireframe />,
      'admin-reportes': <AdminReportesWireframe />,
      'admin-clientes': <AdminClientesWireframe />,
      'admin-config': <AdminConfigWireframe />,
    };

    const content = wireframes[selectedScreen];
    
    if (deviceView === 'mobile') {
      return <MobileWireframe>{content}</MobileWireframe>;
    }
    return <DesktopWireframe>{content}</DesktopWireframe>;
  };

  const currentIndex = screens.filter(s => s.device === deviceView).findIndex(s => s.id === selectedScreen);
  const filteredScreens = screens.filter(s => s.device === deviceView);

  const goToPrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredScreens.length - 1;
    setSelectedScreen(filteredScreens[newIndex].id);
  };

  const goToNext = () => {
    const newIndex = currentIndex < filteredScreens.length - 1 ? currentIndex + 1 : 0;
    setSelectedScreen(filteredScreens[newIndex].id);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <Smartphone className="w-6 h-6 text-orange-500" />
          Wireframes de la App
        </h2>
        <p className="text-gray-400">
          Mockups detallados de todas las pantallas del sistema offline-first.
        </p>
      </motion.div>

      {/* Device Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setDeviceView('mobile');
            setSelectedScreen('dashboard-vendedor');
          }}
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
          onClick={() => {
            setDeviceView('desktop');
            setSelectedScreen('admin-dashboard');
          }}
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
        {filteredScreens.map(screen => (
          <button
            key={screen.id}
            onClick={() => setSelectedScreen(screen.id)}
            className={`px-3 py-2 rounded-lg text-sm transition-all ${
              selectedScreen === screen.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {screen.name}
          </button>
        ))}
      </div>

      {/* Wireframe Display */}
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
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPrev}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <span className="text-gray-500 text-sm px-2">
                {currentIndex + 1} / {filteredScreens.length}
              </span>
              <button 
                onClick={goToNext}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {renderWireframe()}

          {/* Screen Info */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Características Offline</h4>
              <div className="flex flex-wrap gap-2">
                {deviceView === 'mobile' ? (
                  <>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Funciona sin internet</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Sync automático</span>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Datos locales</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Panel centralizado</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Sync en tiempo real</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Reportes globales</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Tecnologías</h4>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">TanStack DB</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">IndexedDB</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">PWA</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
