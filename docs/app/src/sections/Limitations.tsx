import { motion } from 'framer-motion';
import { AlertTriangle, Wifi, WifiOff, Clock, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type OfflineStatus = 'si' | 'no' | 'parcial';

const funcionalidadesVendedor: { nombre: string; offline: OfflineStatus; nota: string }[] = [
  { nombre: 'Login inicial', offline: 'no', nota: 'Token cacheado 24-48h después' },
  { nombre: 'Ver asignación del día', offline: 'si', nota: 'Descargada al inicio' },
  { nombre: 'Calcular precios', offline: 'si', nota: '100% local' },
  { nombre: 'Registrar venta', offline: 'si', nota: 'Guarda en IndexedDB' },
  { nombre: 'Buscar cliente', offline: 'si', nota: 'De cache local' },
  { nombre: 'Crear cliente nuevo', offline: 'si', nota: 'Guarda local, synca después' },
  { nombre: 'Registrar abono', offline: 'si', nota: 'Guarda local, synca después' },
  { nombre: 'Ver historial de ventas', offline: 'si', nota: 'Datos locales' },
  { nombre: 'Ver catálogo', offline: 'si', nota: 'Cacheado' },
  { nombre: 'Cierre del día', offline: 'si', nota: 'Calculado local' },
  { nombre: 'Sync manual', offline: 'no', nota: 'Requiere internet' },
];

const funcionalidadesAdmin: { nombre: string; offline: OfflineStatus; nota: string }[] = [
  { nombre: 'Login', offline: 'no', nota: 'Siempre requiere internet' },
  { nombre: 'Dashboard', offline: 'parcial', nota: 'Muestra sync+d + pendientes' },
  { nombre: 'Crear distribución', offline: 'no', nota: 'Requiere servidor' },
  { nombre: 'Gestionar usuarios', offline: 'no', nota: 'Requiere servidor' },
  { nombre: 'Reportes globales', offline: 'no', nota: 'Requiere todos los datos' },
  { nombre: 'Exportar datos', offline: 'no', nota: 'Requiere servidor' },
];

const limitaciones = [
  { 
    titulo: 'Clientes duplicados', 
    problema: 'Dos vendedores crean mismo cliente offline',
    solucion: 'Merge automático + notificación a admin'
  },
  { 
    titulo: 'Stock inconsistente', 
    problema: 'Vendedor vende más de lo asignado',
    solucion: 'Validación local + advertencia'
  },
  { 
    titulo: 'Precios desactualizados', 
    problema: 'Admin cambia precios, vendedor tiene viejos',
    solucion: 'Precios se actualizan al día siguiente'
  },
  { 
    titulo: 'Ventas duplicadas', 
    problema: 'Sync reintenta y duplica venta',
    solucion: 'UUID único por venta, servidor rechaza duplicados'
  },
  { 
    titulo: 'Dispositivo perdido', 
    problema: 'Ventas no sync se pierden',
    solucion: 'Sync cada 30s + backup obligatorio'
  },
];

export function Limitations() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          Análisis Offline
        </h2>
        <p className="text-gray-400">
          Qué funciona offline, qué no, y las limitaciones del sistema.
        </p>
      </motion.div>

      {/* Funcionalidades Vendedor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-orange-400" />
          Funcionalidades del Vendedor (Mobile)
        </h3>
        
        <div className="grid md:grid-cols-2 gap-3">
          {funcionalidadesVendedor.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              {f.offline === 'si' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : f.offline === 'parcial' ? (
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm">{f.nombre}</p>
                <p className="text-gray-500 text-xs">{f.nota}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                f.offline === 'si' ? 'bg-green-500/20 text-green-400' :
                f.offline === 'parcial' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {f.offline === 'si' ? 'OFFLINE' : f.offline === 'parcial' ? 'PARCIAL' : 'ONLINE'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Funcionalidades Admin */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-400" />
          Funcionalidades del Admin (Web)
        </h3>
        
        <div className="grid md:grid-cols-2 gap-3">
          {funcionalidadesAdmin.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              {f.offline === 'si' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : f.offline === 'parcial' ? (
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm">{f.nombre}</p>
                <p className="text-gray-500 text-xs">{f.nota}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                f.offline === 'si' ? 'bg-green-500/20 text-green-400' :
                f.offline === 'parcial' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {f.offline === 'si' ? 'OFFLINE' : f.offline === 'parcial' ? 'PARCIAL' : 'ONLINE'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Limitaciones Específicas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          Limitaciones Específicas
        </h3>
        
        <div className="space-y-3">
          {limitaciones.map((l, i) => (
            <div key={i} className="p-4 bg-gray-800/50 rounded-lg">
              <h4 className="text-orange-400 text-sm font-medium mb-2">{l.titulo}</h4>
              <p className="text-gray-400 text-xs mb-2">
                <span className="text-red-400">Problema:</span> {l.problema}
              </p>
              <p className="text-gray-400 text-xs">
                <span className="text-green-400">Solución:</span> {l.solucion}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Soporte Offline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          Soporte Offline
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">¿Cuánto tiempo funciona?</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300 text-sm">Operación normal</span>
                <span className="text-green-400 font-medium text-sm">Días completos</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300 text-sm">Alta demanda</span>
                <span className="text-green-400 font-medium text-sm">1 semana</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300 text-sm">Límite técnico</span>
                <span className="text-yellow-400 font-medium text-sm">~1 mes (50-100 MB)</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Promesa al cliente</h4>
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-300 text-sm leading-relaxed">
                "El sistema funciona <strong>todo el día sin internet</strong>. Al final del día, 
                cuando tengas conexión, se sincroniza automáticamente."
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Sync recomendado: al menos 1 vez al día</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Indicadores de Estado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-400" />
          Indicadores de Estado (UI)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <div className="text-green-400 text-lg mb-1">🟢</div>
            <div className="text-green-300 text-xs font-medium">En línea</div>
            <div className="text-gray-500 text-[10px]">Todo sincronizado</div>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <div className="text-yellow-400 text-lg mb-1">🟡</div>
            <div className="text-yellow-300 text-xs font-medium">Pendientes</div>
            <div className="text-gray-500 text-[10px]">3 ops. por sync</div>
          </div>
          <div className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-center">
            <div className="text-gray-400 text-lg mb-1">📴</div>
            <div className="text-gray-300 text-xs font-medium">Sin conexión</div>
            <div className="text-gray-500 text-[10px]">Funcionando offline</div>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <div className="text-red-400 text-lg mb-1">⚠️</div>
            <div className="text-red-300 text-xs font-medium">Error de sync</div>
            <div className="text-gray-500 text-[10px]">Toca para reintentar</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
