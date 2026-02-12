# Fase 4: Ventas

> Registro de ventas al contado y crédito (offline)

---

## 🎯 Objetivo

Permitir registrar ventas que se guarden **localmente inmediatamente**.

---

## 📋 Requisitos Previos

- Fase 3 completada (Core Offline)
- Colecciones de TanStack DB funcionando

---

## 💻 Implementación

### Modelo de Venta

```typescript
interface Venta {
  id: string           // UUID generado localmente
  clientId: string | null
  sellerId: string
  distribucionId: string | null
  
  // Productos
  items: {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  
  // Totales
  totalAmount: number
  amountPaid: number
  balanceDue: number
  
  // Metadata
  saleType: 'contado' | 'credito'
  tara: number
  netWeight: number
  
  // Sync
  syncStatus: 'pending' | 'synced' | 'error'
  syncAttempts: number
  
  // Timestamps
  createdAt: number
  updatedAt: number
}
```

### Hook useVentas

```typescript
// apps/web/src/hooks/useVentas.ts
import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ventasCollection } from '@/lib/db/collections'
import { useAuth } from '@/contexts/AuthContext'

export function useVentas() {
  const { user } = useAuth()
  const ventas = ventasCollection.useData()

  const addVenta = useCallback(async (data: Omit<Venta, 'id' | 'createdAt' | 'syncStatus'>) => {
    const venta: Venta = {
      ...data,
      id: uuidv4(),
      sellerId: user!.id,
      syncStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Guardar en colección (se persiste automáticamente en IndexedDB)
    await ventasCollection.add(venta)

    return venta
  }, [user])

  const getVentasDelDia = useCallback(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    return ventas.filter(v => 
      v.sellerId === user?.id && 
      v.createdAt >= hoy.getTime()
    )
  }, [ventas, user])

  const getTotalVentasHoy = useCallback(() => {
    return getVentasDelDia().reduce((sum, v) => sum + v.totalAmount, 0)
  }, [getVentasDelDia])

  return {
    ventas,
    addVenta,
    getVentasDelDia,
    getTotalVentasHoy
  }
}
```

### Componente NuevaVenta

```typescript
// apps/web/src/components/ventas/NuevaVenta.tsx
import { useState } from 'react'
import { useVentas } from '@/hooks/useVentas'
import { useClientes } from '@/hooks/useClientes'

export function NuevaVenta() {
  const { addVenta } = useVentas()
  const { clientes } = useClientes()
  const [clientId, setClientId] = useState<string | null>(null)
  const [items, setItems] = useState([{ productName: 'Pollo Entero', quantity: 1, unitPrice: 12, total: 12 }])
  const [saleType, setSaleType] = useState<'contado' | 'credito'>('contado')
  const [amountPaid, setAmountPaid] = useState(0)

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)
  const balanceDue = saleType === 'credito' ? totalAmount - amountPaid : 0

  const handleSubmit = async () => {
    await addVenta({
      clientId,
      distribucionId: null,
      items,
      totalAmount,
      amountPaid: saleType === 'contado' ? totalAmount : amountPaid,
      balanceDue,
      saleType,
      tara: 0,
      netWeight: 0
    })
    
    alert('Venta guardada localmente')
  }

  return (
    <div className="space-y-4">
      {/* Cliente */}
      <div>
        <label className="text-gray-400 text-sm">Cliente</label>
        <select 
          value={clientId || ''} 
          onChange={(e) => setClientId(e.target.value || null)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
        >
          <option value="">Sin cliente</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tipo de pago */}
      <div className="flex gap-2">
        <button
          onClick={() => setSaleType('contado')}
          className={`flex-1 py-2 rounded-lg ${saleType === 'contado' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
        >
          Contado
        </button>
        <button
          onClick={() => setSaleType('credito')}
          className={`flex-1 py-2 rounded-lg ${saleType === 'credito' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
        >
          Crédito
        </button>
      </div>

      {/* Total */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Total</span>
          <span className="text-2xl font-bold text-white">S/ {totalAmount.toFixed(2)}</span>
        </div>
        {saleType === 'credito' && (
          <div className="flex justify-between mt-2">
            <span className="text-gray-400">Saldo pendiente</span>
            <span className="text-orange-400">S/ {balanceDue.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSubmit}
        className="w-full bg-green-500 text-white py-3 rounded-lg font-medium"
      >
        Guardar Venta
      </button>
    </div>
  )
}
```

---

## ✅ Tests

1. Registrar venta al contado
2. Registrar venta a crédito
3. Verificar en IndexedDB que se guardó
4. Desconectar internet y registrar otra venta
5. Verificar que se guardó localmente

---

## 📦 Entregable

- [ ] Hook useVentas
- [ ] Componente NuevaVenta
- [ ] Ventas guardándose en IndexedDB
- [ ] Funciona 100% offline

---

## 🔄 Siguiente Paso

→ Ve a `../05-clientes-abonos/README.md`
