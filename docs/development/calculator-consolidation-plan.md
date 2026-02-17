# Plan Ejecutable: Consolidación de Calculadora en Flujo de Ventas

## Resumen Ejecutivo

Unificar el flujo de ventas eliminando la calculadora standalone (`/calculadora`) y consolidando toda la funcionalidad en `/ventas/nueva`. La calculadora estará siempre visible en la página de nueva venta, integrada con el selector de productos/variantes y con persistencia de últimos valores usados.

## Objetivos

1. **Eliminar duplicación**: Un solo punto de entrada para ventas
2. **Reducir pasos**: De ~8 pasos a ~4 pasos para una venta simple
3. **Mejorar UX**: Autoselección de primera variante, precio autoload, flujo continuo
4. **Persistencia**: Recordar último producto/variante/precio entre sesiones

---

## Cambios por Archivo

### 1. Dashboard (`app/routes/_protected.dashboard.tsx`)

**Acción**: Eliminar botón "Calculadora"

```typescript
// ELIMINAR este bloque (líneas 88-97):
<Link to="/calculadora" className="block">
  <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3">
    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
      <Calculator className="h-6 w-6 text-green-600" />
    </div>
    <p className="font-semibold text-foreground">Calculadora</p>
  </Card>
</Link>
```

**Razón**: Consolidar en un único punto de entrada "Nueva Venta"

---

### 2. Hook de Calculadora (`app/hooks/use-chicken-calculator.ts`)

**Acciones**:
1. Agregar persistencia localStorage
2. Agregar soporte para productId y variantId
3. Recordar último precio por variante

```typescript
// AGREGAR interfaces
export interface CalculatorPersistence {
  lastProductId?: string;
  lastVariantId?: string;
  lastPricePerKg?: string;
  timestamp: number;
}

// AGREGAR constantes
const STORAGE_KEY = 'avileo-calculator-last';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

// AGREGAR función helper
function loadPersistedState(): Partial<CalculatorState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed: CalculatorPersistence = JSON.parse(saved);
    const age = Date.now() - parsed.timestamp;
    
    // Expirar después de 24 horas
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return {
      pricePerKg: parsed.lastPricePerKg || '',
    };
  } catch {
    return null;
  }
}

function savePersistedState(state: CalculatorPersistence) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// MODIFICAR hook signature
export interface UseChickenCalculatorOptions {
  productPrice?: string;
  productId?: string;
  variantId?: string;
  persist?: boolean;
}

// MODIFICAR return type
export interface UseChickenCalculatorReturn {
  values: CalculatorState;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  kgNeto: number;
  filledCount: number;
  isReady: boolean;
  handleReset: () => void;
  handleChange: (field: keyof CalculatorState, value: string) => void;
  // NUEVO: Persistir selección
  persistSelection: (productId: string, variantId: string) => void;
}
```

---

### 3. Nueva Venta (`app/routes/_protected.ventas.nueva.tsx`)

**Acciones**:
1. Hacer calculadora siempre visible (no colapsable)
2. Integrar VariantSelector con autoselección de primera variante
3. Pre-llenar calculadora al seleccionar variante
4. Agregar botones de flujo rápido
5. Eliminar calculadora duplicada (líneas 201-261)

```typescript
// AGREGAR imports
import { useEffect, useCallback } from "react";
import { Calculator, RotateCcw, Plus, ShoppingCart, ArrowRight } from "lucide-react";

// AGREGAR estado para calculadora
const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(null);
const [calculatorVariant, setCalculatorVariant] = useState<ProductVariant | null>(null);
const [showCalculator, setShowCalculator] = useState(true); // Siempre visible

// AGREGAR estado para campos de calculadora
const [calcValues, setCalcValues] = useState({
  bruto: '',
  tara: '0',
  precio: '',
});

// AGREGAR efecto: Autoseleccionar primera variante al cargar producto
const handleProductSelect = (product: Product, variant: ProductVariant, quantity: number) => {
  setCalculatorProduct(product);
  setCalculatorVariant(variant);
  setCalcValues(prev => ({
    ...prev,
    precio: variant.price,
  }));
  setShowVariantSelector(false);
};

// AGREGAR función: Agregar desde calculadora
const handleAddFromCalculator = () => {
  if (!calculatorProduct || !calculatorVariant || !calcValues.bruto) return;
  
  const brutoNum = parseFloat(calcValues.bruto);
  const taraNum = parseFloat(calcValues.tara) || 0;
  const precioNum = parseFloat(calcValues.precio);
  const neto = brutoNum - taraNum;
  const subtotal = neto * precioNum;
  
  const existingIndex = cartItems.findIndex(
    (item) => item.productId === calculatorProduct.id && item.variantId === calculatorVariant.id
  );
  
  if (existingIndex >= 0) {
    // Actualizar cantidad si ya existe
    const updated = [...cartItems];
    updated[existingIndex].quantity += neto;
    updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
    setCartItems(updated);
  } else {
    // Agregar nuevo item
    setCartItems([
      ...cartItems,
      {
        productId: calculatorProduct.id,
        variantId: calculatorVariant.id,
        productName: calculatorProduct.name,
        variantName: calculatorVariant.name,
        quantity: neto,
        unitPrice: precioNum,
        subtotal,
      },
    ]);
  }
  
  // Resetear solo pesos, mantener producto/variante/precio
  setCalcValues({
    bruto: '',
    tara: '0',
    precio: calculatorVariant.price, // Mantener precio para siguiente
  });
};

// AGREGAR función: Misma variante, otro peso
const handleSameVariantAnotherWeight = () => {
  setCalcValues({
    bruto: '',
    tara: '0',
    precio: calculatorVariant?.price || '',
  });
  // Scroll a calculadora
  document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
};

// AGREGAR función: Otro producto
const handleAnotherProduct = () => {
  setShowVariantSelector(true);
};

// MODIFICAR JSX: Reemplazar calculadora embebida (líneas 201-261) con nueva versión
```

#### Nuevo Layout JSX:

```tsx
<main className="p-4 pb-32 space-y-4">
  {/* Cliente */}
  <section>
    <h2 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h2>
    <CustomerSearch
      selectedCustomer={selectedCustomer}
      onSelectCustomer={setSelectedCustomer}
    />
  </section>

  {/* Tipo de Venta */}
  <section>
    <h2 className="text-sm font-medium text-muted-foreground mb-2">Tipo de Venta</h2>
    <div className="flex gap-2">
      {/* Botones contado/credito */}
    </div>
  </section>

  {/* SECCIÓN CALCULADORA - Siempre Visible */}
  <section id="calculator-section" className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        Calcular Producto
      </h2>
      {calculatorVariant && (
        <Badge variant="secondary" className="text-xs">
          {calculatorProduct?.name} - {calculatorVariant.name}
        </Badge>
      )}
    </div>

    {!calculatorVariant ? (
      // Estado inicial: Seleccionar producto
      <Card className="border-0 shadow-md rounded-2xl bg-muted/50">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Selecciona un producto para comenzar
          </p>
          <Button
            onClick={() => setShowVariantSelector(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Seleccionar Producto
          </Button>
        </CardContent>
      </Card>
    ) : (
      // Calculadora activa
      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-4 space-y-4">
          {/* Header: Producto seleccionado */}
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">{calculatorProduct?.name}</p>
                <p className="text-sm text-muted-foreground">{calculatorVariant.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVariantSelector(true)}
            >
              Cambiar
            </Button>
          </div>

          {/* Campos de calculadora */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bruto (kg)</Label>
              <Input
                type="number"
                step="0.001"
                inputMode="decimal"
                value={calcValues.bruto}
                onChange={(e) => setCalcValues({ ...calcValues, bruto: e.target.value })}
                placeholder="0.000"
                className="rounded-xl text-lg"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Tara (kg)</Label>
              <Input
                type="number"
                step="0.001"
                inputMode="decimal"
                value={calcValues.tara}
                onChange={(e) => setCalcValues({ ...calcValues, tara: e.target.value })}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Precio/kg</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={calcValues.precio}
                onChange={(e) => setCalcValues({ ...calcValues, precio: e.target.value })}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Resultados */}
          {calcValues.bruto && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Neto</p>
                  <p className="text-lg font-bold text-orange-600">
                    {(parseFloat(calcValues.bruto) - (parseFloat(calcValues.tara) || 0)).toFixed(3)} kg
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-lg font-bold text-green-600">
                    S/ {((parseFloat(calcValues.bruto) - (parseFloat(calcValues.tara) || 0)) * parseFloat(calcValues.precio || '0')).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={handleAddFromCalculator}
              disabled={!calcValues.bruto || !calcValues.precio}
              className="w-full bg-orange-500 hover:bg-orange-600 h-12"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCalcValues({ bruto: '', tara: '0', precio: calculatorVariant.price })}
                className="flex-1 rounded-xl"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar Peso
              </Button>
              <Button
                variant="outline"
                onClick={handleAnotherProduct}
                className="flex-1 rounded-xl"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Otro Producto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </section>

  {/* Carrito */}
  {cartItems.length > 0 && (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">
        Carrito ({cartItems.length} items)
      </h2>
      <div className="space-y-2">
        {cartItems.map((item, index) => (
          <SaleCartItem
            key={`${item.productId}-${item.variantId}-${index}`}
            productName={item.productName}
            variantName={item.variantName}
            quantity={item.quantity}
            unitPrice={item.unitPrice}
            subtotal={item.subtotal}
            onRemove={() => handleRemoveFromCart(index)}
          />
        ))}
      </div>
    </section>
  )}

  {/* Total y Finalizar */}
  {cartItems.length > 0 && (
    <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-orange-100">Total</span>
          <span className="text-2xl font-bold">S/ {totalAmount.toFixed(2)}</span>
        </div>
        {/* ... resto del contenido */}
      </CardContent>
    </Card>
  )}
</main>
```

---

### 4. Variant Selector (`app/components/sales/variant-selector.tsx`)

**Acción**: Mejorar autoselección

```typescript
// MODIFICAR useEffect (línea 38-42)
useEffect(() => {
  if (step === "variants" && activeVariants.length > 0 && !selectedVariant) {
    // Siempre seleccionar primera variante activa
    setSelectedVariant(activeVariants[0]);
  }
}, [step, activeVariants, selectedVariant]);

// AGREGAR: Mostrar contador de variantes
<DialogTitle className="flex items-center gap-2">
  {step === "variants" && activeVariants.length > 1 && (
    <Badge variant="secondary" className="text-xs">
      {activeVariants.length} variantes
    </Badge>
  )}
  {/* ... */}
</DialogTitle>
```

---

### 5. Eliminar Ruta Calculadora

**Opción A**: Eliminar archivo `app/routes/_protected.calculadora.tsx`
**Opción B**: Redirigir a `/ventas/nueva`

Recomendado **Opción A** (eliminar completamente) para evitar confusión.

---

## Testing Checklist

### Funcionalidad
- [ ] Dashboard solo muestra "Nueva Venta" (no "Calculadora")
- [ ] `/calculadora` retorna 404 o redirige
- [ ] Al abrir `/ventas/nueva`, calculadora está visible
- [ ] Botón "Seleccionar Producto" abre VariantSelector
- [ ] Al seleccionar producto, primera variante se autoselecciona
- [ ] Precio de variante se carga automáticamente en calculadora
- [ ] Cálculo de neto (bruto - tara) es correcto
- [ ] Cálculo de total (neto × precio) es correcto
- [ ] "Agregar al Carrito" agrega item correctamente
- [ ] "Limpiar Peso" resetea bruto y tara, mantiene producto/precio
- [ ] "Otro Producto" abre selector manteniendo carrito
- [ ] Carrito muestra items correctamente
- [ ] Total acumula correctamente

### Persistencia
- [ ] Recargar página mantiene carrito (ya funciona con React state)
- [ ] Al volver después de tiempo, última variante se sugiere

### UX Mobile
- [ ] Layout responsive en 375px (iPhone SE)
- [ ] Campos numéricos muestran teclado correcto
- [ ] Scroll suave al agregar item
- [ ] Touch targets >= 44px

### Edge Cases
- [ ] Producto sin variantes: mostrar mensaje
- [ ] Todas variantes inactivas: mostrar mensaje
- [ ] Precio en 0: warning antes de agregar
- [ ] Bruto < Tara: mostrar neto = 0 (no negativo)
- [ ] Venta sin cliente: warning opcional

---

## Métricas de Éxito

| Métrica | Antes | Objetivo | Medición |
|---------|-------|----------|----------|
| Tiempo venta simple | 45-60s | < 25s | Analytics o logs |
| Errores de entrada | Alto | -80% | User testing |
| Pasos para venta | 8 | 4 | Task analysis |
| Satisfacción UX | N/A | > 4/5 | Encuesta vendedores |

---

## Rollout Plan

### Fase 1: Desarrollo (Esta semana)
1. Modificar hook useChickenCalculator
2. Refactor ventas.nueva.tsx con nueva calculadora
3. Actualizar variant-selector.tsx
4. Eliminar ruta calculadora
5. Quitar botón dashboard

### Fase 2: Testing (1 día)
1. Tests unitarios
2. Testing manual en móvil
3. Revisión con stakeholder

### Fase 3: Deploy
1. Merge a main
2. Deploy a staging
3. Validación con datos reales
4. Deploy a producción

---

## Notas Técnicas

### Dependencias
- No se agregan nuevas dependencias
- Usar hooks y componentes existentes
- Mantener patrón offline-first (TanStack Query)

### Performance
- localStorage es síncrono y rápido (< 1ms)
- No afecta renderizado inicial
- Lazy load de variantes ya implementado

### Accesibilidad
- Mantener labels en inputs
- ARIA labels en botones de acción
- Contraste suficiente en badges

---

## Archivos Modificados

| Archivo | Cambios | Líneas (aprox) |
|---------|---------|----------------|
| `app/routes/_protected.dashboard.tsx` | Eliminar botón | -10 |
| `app/hooks/use-chicken-calculator.ts` | Persistencia | +40 |
| `app/routes/_protected.ventas.nueva.tsx` | Refactor completo | +150/-100 |
| `app/components/sales/variant-selector.tsx` | Autoselección | +10 |
| `app/routes/_protected.calculadora.tsx` | **ELIMINAR** | -36 |

**Total**: ~5 archivos, ~200 líneas modificadas

---

## Próximos Pasos

1. ✅ Plan aprobado
2. ⏳ Implementar cambios
3. ⏳ Testing
4. ⏳ Deploy

**¿Listo para comenzar implementación?**
