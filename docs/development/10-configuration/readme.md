# Fase 10: Configuración del Sistema

> Panel de configuración flexible

---

## 🎯 Objetivo

Permitir al admin configurar:
- Modo de operación (inventario/libre/mixto)
- Precios por defecto
- Opciones de sincronización

---

## 💻 Implementación

### Modelo de Configuración

```typescript
interface ConfiguracionSistema {
  modoOperacion: 'inventario_propio' | 'sin_inventario' | 'pedidos' | 'mixto'
  controlKilos: boolean
  usarDistribucion: boolean
  permitirVentaSinStock: boolean
  precios: {
    polloEntero: number
    pechuga: number
    pierna: number
    alitas: number
  }
  sync: {
    autoSync: boolean
    intervaloSegundos: number
    soloWifi: boolean
  }
}
```

### Hook useConfiguracion

```typescript
// apps/web/src/hooks/useConfiguracion.ts
import { useCallback } from 'react'
import { configCollection } from '@/lib/db/collections'

const defaultConfig: ConfiguracionSistema = {
  modoOperacion: 'inventario_propio',
  controlKilos: true,
  usarDistribucion: true,
  permitirVentaSinStock: false,
  precios: {
    polloEntero: 12,
    pechuga: 18,
    pierna: 14,
    alitas: 15
  },
  sync: {
    autoSync: true,
    intervaloSegundos: 30,
    soloWifi: false
  }
}

export function useConfiguracion() {
  const config = configCollection.useData() || defaultConfig

  const updateConfig = useCallback(async (updates: Partial<ConfiguracionSistema>) => {
    const newConfig = { ...config, ...updates }
    await configCollection.update(newConfig)
  }, [config])

  const esModoInventario = config.modoOperacion === 'inventario_propio'
  const esModoLibre = config.modoOperacion === 'sin_inventario'

  return {
    config,
    updateConfig,
    esModoInventario,
    esModoLibre
  }
}
```

### Componente Configuracion

```typescript
// apps/web/src/pages/admin/configuracion/page.tsx
import { useConfiguracion } from '@/hooks/useConfiguracion'

export default function ConfiguracionPage() {
  const { config, updateConfig, esModoInventario } = useConfiguracion()

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Configuración del Sistema</h1>

      {/* Modo de Operación */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-medium mb-4">Modo de Operación</h3>
        <select
          value={config.modoOperacion}
          onChange={(e) => updateConfig({ modoOperacion: e.target.value as any })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
        >
          <option value="inventario_propio">Inventario Propio (control de stock)</option>
          <option value="sin_inventario">Sin Inventario (solo registro)</option>
          <option value="pedidos">Pedidos Primero (pre-venta)</option>
          <option value="mixto">Mixto (flexible)</option>
        </select>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-white text-sm">Control de stock</span>
            <input
              type="checkbox"
              checked={config.controlKilos}
              onChange={(e) => updateConfig({ controlKilos: e.target.checked })}
              disabled={!esModoInventario}
              className="w-5 h-5"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-white text-sm">Usar distribución del día</span>
            <input
              type="checkbox"
              checked={config.usarDistribucion}
              onChange={(e) => updateConfig({ usarDistribucion: e.target.checked })}
              disabled={!esModoInventario}
              className="w-5 h-5"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-white text-sm">Permitir venta sin stock</span>
            <input
              type="checkbox"
              checked={config.permitirVentaSinStock}
              onChange={(e) => updateConfig({ permitirVentaSinStock: e.target.checked })}
              className="w-5 h-5"
            />
          </label>
        </div>
      </div>

      {/* Precios */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-medium mb-4">Precios por Defecto (S/kg)</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(config.precios).map(([key, value]) => (
            <div key={key}>
              <label className="text-gray-400 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => updateConfig({
                  precios: { ...config.precios, [key]: Number(e.target.value) }
                })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sync */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Sincronización</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-white text-sm">Sync automático</span>
            <input
              type="checkbox"
              checked={config.sync.autoSync}
              onChange={(e) => updateConfig({
                sync: { ...config.sync, autoSync: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </label>

          <div>
            <label className="text-gray-400 text-sm">Intervalo de sync (segundos)</label>
            <input
              type="number"
              value={config.sync.intervaloSegundos}
              onChange={(e) => updateConfig({
                sync: { ...config.sync, intervaloSegundos: Number(e.target.value) }
              })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## ✅ Tests

1. Cambiar modo de operación
2. Verificar UI se adapta
3. Cambiar precios
4. Verificar precios usados en calculadora

---

## 📦 Entregable

- [ ] Hook useConfiguracion
- [ ] Panel de configuración
- [ ] Persistencia de config
- [ ] UI adaptativa según modo

---

## 🎉 ¡Proyecto Completo!

Has terminado todas las fases del desarrollo de PollosPro.

### Resumen:
- ✅ Fases 1-5: MVP funcional
- ✅ Fases 6-10: Funcionalidades avanzadas

### Siguientes pasos:
1. Testing completo
2. Deploy a producción
3. Capacitación de usuarios
