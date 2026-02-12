# Fase 5: Clientes y Abonos

> Gestión de clientes y pagos de deuda (sin compra)

---

## 🎯 Objetivo

- CRUD de clientes (offline)
- Registrar abonos/pagos de deuda
- Calcular saldo pendiente

---

## 💻 Implementación

### Modelo de Cliente

```typescript
interface Cliente {
  id: string
  name: string
  dni: string
  phone?: string
  address?: string
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: number
}
```

### Modelo de Abono

```typescript
interface Abono {
  id: string
  clientId: string
  sellerId: string
  amount: number
  paymentMethod: 'efectivo' | 'yape' | 'plin' | 'transferencia'
  notes?: string
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: number
}
```

### Hook useClientes

```typescript
// apps/web/src/hooks/useClientes.ts
import { useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { clientesCollection } from '@/lib/db/collections'
import { ventasCollection } from '@/lib/db/collections'
import { abonosCollection } from '@/lib/db/collections'
import { useAuth } from '@/contexts/AuthContext'

export function useClientes() {
  const { user } = useAuth()
  const clientes = clientesCollection.useData()
  const ventas = ventasCollection.useData()
  const abonos = abonosCollection.useData()

  // Calcular deuda de un cliente
  const getDeuda = useCallback((clientId: string) => {
    const ventasCredito = ventas.filter(
      v => v.clientId === clientId && v.saleType === 'credito'
    )
    const abonosCliente = abonos.filter(a => a.clientId === clientId)

    const totalDeuda = ventasCredito.reduce((sum, v) => sum + v.balanceDue, 0)
    const totalAbonos = abonosCliente.reduce((sum, a) => sum + a.amount, 0)

    return totalDeuda - totalAbonos
  }, [ventas, abonos])

  // Clientes con deuda
  const clientesConDeuda = useMemo(() => {
    return clientes.filter(c => getDeuda(c.id) > 0)
  }, [clientes, getDeuda])

  const addCliente = useCallback(async (data: Omit<Cliente, 'id' | 'createdAt' | 'syncStatus'>) => {
    const cliente: Cliente = {
      ...data,
      id: uuidv4(),
      syncStatus: 'pending',
      createdAt: Date.now()
    }
    await clientesCollection.add(cliente)
    return cliente
  }, [])

  const addAbono = useCallback(async (data: Omit<Abono, 'id' | 'sellerId' | 'createdAt' | 'syncStatus'>) => {
    const abono: Abono = {
      ...data,
      id: uuidv4(),
      sellerId: user!.id,
      syncStatus: 'pending',
      createdAt: Date.now()
    }
    await abonosCollection.add(abono)
    return abono
  }, [user])

  return {
    clientes,
    clientesConDeuda,
    getDeuda,
    addCliente,
    addAbono
  }
}
```

### Componente RegistrarAbono

```typescript
// apps/web/src/components/clientes/RegistrarAbono.tsx
import { useState } from 'react'
import { useClientes } from '@/hooks/useClientes'

interface Props {
  clientId: string
  clientName: string
  deudaActual: number
  onSuccess: () => void
}

export function RegistrarAbono({ clientId, clientName, deudaActual, onSuccess }: Props) {
  const { addAbono } = useClientes()
  const [amount, setAmount] = useState(deudaActual)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')

  const handleSubmit = async () => {
    await addAbono({
      clientId,
      amount,
      paymentMethod: paymentMethod as any,
      notes: ''
    })
    onSuccess()
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-sm">Cliente</p>
        <p className="text-white font-medium">{clientName}</p>
        <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
          <span className="text-gray-400">Deuda actual</span>
          <span className="text-red-400 text-xl font-bold">S/ {deudaActual.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-sm">Monto del abono</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">S/</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 bg-gray-700 text-white text-2xl font-bold rounded-lg px-4 py-3"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {['Total', 50, 100, 200].map((m) => (
            <button
              key={m}
              onClick={() => setAmount(m === 'Total' ? deudaActual : m)}
              className="flex-1 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm"
            >
              {m === 'Total' ? 'Todo' : `S/${m}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-sm">Método de pago</label>
        <div className="grid grid-cols-2 gap-2">
          {['efectivo', 'yape', 'plin', 'transferencia'].map((m) => (
            <button
              key={m}
              onClick={() => setPaymentMethod(m)}
              className={`py-2 rounded-lg capitalize ${paymentMethod === m ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Deuda anterior</span>
          <span className="text-white">S/ {deudaActual.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Abono</span>
          <span className="text-green-400">- S/ {amount.toFixed(2)}</span>
        </div>
        <div className="pt-2 border-t border-gray-700 flex justify-between">
          <span className="text-gray-400">Nueva deuda</span>
          <span className="text-orange-400 text-xl font-bold">
            S/ {Math.max(0, deudaActual - amount).toFixed(2)}
          </span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-green-500 text-white py-3 rounded-lg font-medium"
      >
        Confirmar Abono
      </button>
    </div>
  )
}
```

---

## ✅ Tests

1. Crear cliente
2. Registrar venta a crédito para ese cliente
3. Verificar deuda calculada correctamente
4. Registrar abono
5. Verificar nueva deuda

---

## 📦 Entregable

- [ ] Hook useClientes con cálculo de deuda
- [ ] Componente RegistrarAbono
- [ ] Abonos guardándose localmente
- [ ] Cálculo de deuda en tiempo real

---

## 🔄 Siguiente Paso

→ Ve a `../06-calculadora/README.md`
