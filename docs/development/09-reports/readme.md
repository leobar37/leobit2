# Fase 9: Reportes

> Dashboard y estadísticas para el admin

---

## 🎯 Objetivo

Mostrar reportes y estadísticas basados en datos sincronizados.

---

## 💻 Implementación

### Hook useReportes

```typescript
// apps/web/src/hooks/useReportes.ts
import { useMemo } from 'react'
import { ventasCollection } from '@/lib/db/collections'

export function useReportes() {
  const ventas = ventasCollection.useData()

  const reporteDelDia = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    const ventasHoy = ventas.filter(v => v.createdAt >= hoy.getTime())
    
    return {
      totalVentas: ventasHoy.length,
      montoTotal: ventasHoy.reduce((sum, v) => sum + v.totalAmount, 0),
      contado: ventasHoy.filter(v => v.saleType === 'contado').length,
      credito: ventasHoy.filter(v => v.saleType === 'credito').length,
      promedio: ventasHoy.length > 0 
        ? ventasHoy.reduce((sum, v) => sum + v.totalAmount, 0) / ventasHoy.length 
        : 0
    }
  }, [ventas])

  const ventasPorHora = useMemo(() => {
    const horas: number[] = Array(12).fill(0)
    
    ventas.forEach(v => {
      const hora = new Date(v.createdAt).getHours()
      if (hora >= 6 && hora <= 18) {
        horas[hora - 6]++
      }
    })
    
    return horas
  }, [ventas])

  return {
    reporteDelDia,
    ventasPorHora
  }
}
```

### Componente DashboardAdmin

```typescript
// apps/web/src/pages/admin/dashboard/page.tsx
import { useReportes } from '@/hooks/useReportes'
import { DollarSign, ShoppingCart, CreditCard, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const { reporteDelDia, ventasPorHora } = useReportes()

  const stats = [
    { label: 'Ventas Hoy', value: `S/ ${reporteDelDia.montoTotal.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'Total Ventas', value: reporteDelDia.totalVentas, icon: ShoppingCart, color: 'text-blue-400' },
    { label: 'A Crédito', value: reporteDelDia.credito, icon: CreditCard, color: 'text-orange-400' },
    { label: 'Promedio', value: `S/ ${reporteDelDia.promedio.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-400' }
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-sm mb-4">Ventas por Hora</h3>
        <div className="flex items-end gap-1 h-32">
          {ventasPorHora.map((count, i) => (
            <div
              key={i}
              className="flex-1 bg-orange-500/50 rounded-t"
              style={{ height: `${Math.max(5, count * 10)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
        </div>
      </div>
    </div>
  )
}
```

---

## ✅ Tests

1. Verificar stats se calculan correctamente
2. Verificar gráfico muestra datos
3. Actualizar al sincronizar nuevas ventas

---

## 📦 Entregable

- [ ] Hook useReportes
- [ ] Dashboard admin con stats
- [ ] Gráfico de ventas por hora

---

## 🔄 Siguiente Paso

→ Ve a `../10-configuracion/README.md`
