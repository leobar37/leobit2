# Fase 7: Inventario y Distribución (Opcional)

> Control de stock y asignación a vendedores

---

## 🎯 Objetivo

Permitir al admin:
- Registrar inventario disponible
- Asignar kilos a vendedores
- Controlar stock (opcional)

**Nota:** Esta fase es opcional. El sistema funciona sin ella en modo "libre".

---

## 💻 Implementación

### Modelo de Distribución

```typescript
interface Distribucion {
  id: string
  vendedorId: string
  puntoVenta: string
  kilosAsignados: number
  kilosVendidos: number
  fecha: string
  estado: 'activo' | 'cerrado' | 'pendiente'
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: number
}
```

### Hook useDistribucion

```typescript
// apps/web/src/hooks/useDistribucion.ts
import { useCallback, useMemo } from 'react'
import { distribucionesCollection } from '@/lib/db/collections'
import { ventasCollection } from '@/lib/db/collections'
import { useAuth } from '@/contexts/AuthContext'

export function useDistribucion() {
  const { user } = useAuth()
  const distribuciones = distribucionesCollection.useData()
  const ventas = ventasCollection.useData()

  // Distribución del día para el vendedor actual
  const miDistribucion = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return distribuciones.find(
      d => d.vendedorId === user?.id && d.fecha === hoy
    )
  }, [distribuciones, user])

  // Kilos vendidos hoy (calculado de ventas locales)
  const kilosVendidosHoy = useMemo(() => {
    if (!miDistribucion) return 0
    
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    return ventas
      .filter(v => 
        v.sellerId === user?.id && 
        v.createdAt >= hoy.getTime()
      )
      .reduce((sum, v) => sum + (v.netWeight || 0), 0)
  }, [ventas, user, miDistribucion])

  // Stock disponible
  const stockDisponible = useMemo(() => {
    if (!miDistribucion) return null
    return miDistribucion.kilosAsignados - kilosVendidosHoy
  }, [miDistribucion, kilosVendidosHoy])

  return {
    miDistribucion,
    kilosVendidosHoy,
    stockDisponible,
    distribuciones
  }
}
```

### Componente DistribucionAdmin

```typescript
// apps/web/src/components/admin/DistribucionForm.tsx
import { useState } from 'react'

interface Vendedor {
  id: string
  name: string
}

interface Props {
  vendedores: Vendedor[]
  onSubmit: (data: { vendedorId: string; puntoVenta: string; kilos: number }) => void
}

export function DistribucionForm({ vendedores, onSubmit }: Props) {
  const [vendedorId, setVendedorId] = useState('')
  const [puntoVenta, setPuntoVenta] = useState('')
  const [kilos, setKilos] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      vendedorId,
      puntoVenta,
      kilos: Number(kilos)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="text-white font-medium">Nueva Distribución</h3>
      
      <div>
        <label className="text-gray-400 text-sm">Vendedor</label>
        <select
          value={vendedorId}
          onChange={(e) => setVendedorId(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          required
        >
          <option value="">Seleccionar...</option>
          {vendedores.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-gray-400 text-sm">Punto de Venta</label>
        <input
          type="text"
          value={puntoVenta}
          onChange={(e) => setPuntoVenta(e.target.value)}
          placeholder="Ej: Carro A, Casa, Local"
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="text-gray-400 text-sm">Kilos Asignados</label>
        <input
          type="number"
          value={kilos}
          onChange={(e) => setKilos(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-orange-500 text-white py-2 rounded-lg"
      >
        Asignar
      </button>
    </form>
  )
}
```

---

## ✅ Tests

1. Crear distribución para vendedor
2. Vendedor ve su asignación en dashboard
3. Registrar venta → stock se reduce
4. Verificar cálculo de stock disponible

---

## 📦 Entregable

- [ ] Hook useDistribucion
- [ ] Componente DistribucionForm (admin)
- [ ] Dashboard vendedor muestra asignación
- [ ] Cálculo de stock en tiempo real

---

## 🔄 Siguiente Paso

→ Ve a `../08-sync-engine/README.md`
