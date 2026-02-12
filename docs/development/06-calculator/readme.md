# Fase 6: Calculadora

> Cálculo de precios con resta de tara

---

## 🎯 Objetivo

Calculadora que determine precios de pollo ingresando 2 valores de 3 posibles.

---

## 🧮 Fórmulas

```
Kilos Netos = Kilos Brutos - Tara

Caso 1: Conoces Monto Total y Precio/kg
  → Kilos = Monto Total / Precio/kg

Caso 2: Conoces Monto Total y Kilos
  → Precio/kg = Monto Total / Kilos

Caso 3: Conoces Precio/kg y Kilos
  → Monto Total = Precio/kg * Kilos
```

---

## 💻 Implementación

```typescript
// apps/web/src/hooks/useCalculadora.ts
import { useState, useCallback, useMemo } from 'react'

interface CalculadoraState {
  montoTotal: number | null
  precioKg: number | null
  kilosBrutos: number | null
  tara: number
}

export function useCalculadora() {
  const [state, setState] = useState<CalculadoraState>({
    montoTotal: null,
    precioKg: null,
    kilosBrutos: null,
    tara: 0
  })

  const kilosNetos = useMemo(() => {
    if (!state.kilosBrutos) return null
    return state.kilosBrutos - state.tara
  }, [state.kilosBrutos, state.tara])

  const resultado = useMemo(() => {
    const { montoTotal, precioKg, kilosBrutos, tara } = state
    
    // Caso 1: Monto + Precio → Kilos
    if (montoTotal && precioKg && !kilosBrutos) {
      const kilos = montoTotal / precioKg
      return {
        kilosBrutos: kilos + tara,
        kilosNetos: kilos,
        montoTotal,
        precioKg
      }
    }
    
    // Caso 2: Monto + Kilos → Precio
    if (montoTotal && kilosBrutos && !precioKg) {
      const netos = kilosBrutos - tara
      return {
        kilosBrutos,
        kilosNetos: netos,
        montoTotal,
        precioKg: montoTotal / netos
      }
    }
    
    // Caso 3: Precio + Kilos → Monto
    if (precioKg && kilosBrutos && !montoTotal) {
      const netos = kilosBrutos - tara
      return {
        kilosBrutos,
        kilosNetos: netos,
        montoTotal: precioKg * netos,
        precioKg
      }
    }
    
    return null
  }, [state])

  const setValue = useCallback((key: keyof CalculadoraState, value: number | null) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setState({
      montoTotal: null,
      precioKg: null,
      kilosBrutos: null,
      tara: 0
    })
  }, [])

  return {
    state,
    resultado,
    kilosNetos,
    setValue,
    reset
  }
}
```

### Componente Calculadora

```typescript
// apps/web/src/components/Calculadora.tsx
import { useCalculadora } from '@/hooks/useCalculadora'

export function Calculadora() {
  const { state, resultado, setValue, reset } = useCalculadora()

  const inputClass = (hasValue: boolean) => 
    `w-full bg-gray-700 text-white rounded-lg px-4 py-3 text-lg ${
      hasValue ? 'border-2 border-orange-500' : ''
    }`

  return (
    <div className="space-y-4">
      {/* Resultado */}
      {resultado && (
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-6 text-center">
          <p className="text-white/70 text-sm">Total a Pagar</p>
          <p className="text-4xl font-bold text-white">
            S/ {resultado.montoTotal.toFixed(2)}
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <div>
              <p className="text-white/70">Kilos Netos</p>
              <p className="text-white font-medium">{resultado.kilosNetos.toFixed(2)} kg</p>
            </div>
            <div className="w-px bg-white/30" />
            <div>
              <p className="text-white/70">Precio/kg</p>
              <p className="text-white font-medium">S/ {resultado.precioKg.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Kilos Brutos</label>
          <input
            type="number"
            value={state.kilosBrutos || ''}
            onChange={(e) => setValue('kilosBrutos', e.target.value ? Number(e.target.value) : null)}
            placeholder="0.00"
            className={inputClass(!!state.kilosBrutos)}
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm">Tara (envase)</label>
          <input
            type="number"
            value={state.tara || ''}
            onChange={(e) => setValue('tara', Number(e.target.value))}
            placeholder="0.00"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm">Precio por Kg</label>
          <input
            type="number"
            value={state.precioKg || ''}
            onChange={(e) => setValue('precioKg', e.target.value ? Number(e.target.value) : null)}
            placeholder="0.00"
            className={inputClass(!!state.precioKg)}
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm">Monto Total</label>
          <input
            type="number"
            value={state.montoTotal || ''}
            onChange={(e) => setValue('montoTotal', e.target.value ? Number(e.target.value) : null)}
            placeholder="0.00"
            className={inputClass(!!state.montoTotal)}
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex-1 bg-gray-700 text-white py-3 rounded-lg"
        >
          Limpiar
        </button>
        <button
          onClick={() => {/* Usar en venta */}}
          disabled={!resultado}
          className="flex-1 bg-orange-500 text-white py-3 rounded-lg disabled:opacity-50"
        >
          Usar en Venta
        </button>
      </div>
    </div>
  )
}
```

---

## ✅ Tests

1. Ingresar Monto + Precio → Verificar Kilos calculados
2. Ingresar Monto + Kilos → Verificar Precio calculado
3. Ingresar Precio + Kilos → Verificar Monto calculado
4. Agregar tara → Verificar resta correcta

---

## 📦 Entregable

- [ ] Hook useCalculadora
- [ ] Componente Calculadora visual
- [ ] Cálculos correctos en los 3 casos
- [ ] Resta de tara funcionando

---

## 🔄 Siguiente Paso

→ Ve a `../07-inventario-distribucion/README.md`
