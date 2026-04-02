# Avileo - Análisis de Funcionalidades Offline

> Detalle completo de qué funciona offline, qué no, y por qué.

---

## 🎯 Principio Fundamental

**"El vendedor nunca debe detenerse por falta de internet"**

Todo lo que el vendedor necesita para su trabajo diario debe funcionar offline.
Lo que requiere coordinación con el admin o datos globales puede esperar a tener internet.

---

## 📱 Funcionalidades por Módulo

### M1 - Autenticación

| Función | Offline | Detalle |
|---------|---------|---------|
| Login inicial | ❌ NO | Requiere validar credenciales en servidor |
| Login con token cacheado | ✅ SÍ | Token JWT guardado localmente (24-48h) |
| Logout | ✅ SÍ | Limpia datos locales, no requiere servidor |
| Cambiar contraseña | ❌ NO | Requiere servidor para seguridad |

**Flujo offline:**
```
Primera vez: Vendedor necesita internet para login
Después: Token se cachea, puede cerrar y abrir app sin internet
Cuando token expira: Debe reconectar para renovar
```

---

### M2 - Usuarios y Roles

| Función | Offline | Detalle |
|---------|---------|---------|
| Ver mis datos | ✅ SÍ | Cacheado al login |
| Ver otros vendedores | ⚠️ PARCIAL | Solo los cacheados, no actualizados |
| Crear usuario | ❌ NO | Solo ADMIN, requiere servidor |
| Editar usuario | ❌ NO | Solo ADMIN, requiere servidor |
| Cambiar permisos | ❌ NO | Solo ADMIN, requiere servidor |

**Nota:** El vendedor normal no necesita gestionar usuarios, solo usar la app.

---

### M3 - Distribución del Día (Opcional)

**Este módulo es OPCIONAL.** El sistema funciona con o sin distribución.

| Función | Offline | Detalle | Modo Inventario | Modo Libre |
|---------|---------|---------|-----------------|------------|
| Ver mi asignación | ✅ SÍ | Se descarga al inicio del día | ✅ | ❌ N/A |
| Ver kilos asignados | ✅ SÍ | Cacheado localmente | ✅ | ❌ N/A |
| Ver punto de venta | ✅ SÍ | "Carro A", "Casa", etc. | ✅ | ❌ N/A |
| Crear distribución | ❌ NO | Solo ADMIN al inicio del día | ✅ | ❌ N/A |
| Modificar asignación | ❌ NO | Requiere coordinación con admin | ✅ | ❌ N/A |
| **Vender sin asignación** | ✅ SÍ | **Registra venta directamente** | ✅* | ✅ |

*Requiere configuración: `permitir_venta_sin_stock = true`

**Flujo CON distribución (Modo Inventario):**
```
Mañana (con internet):
  Admin crea distribución
  Vendedor descarga su asignación
  
Resto del día (sin internet):
  Vendedor ve su asignación cacheada
  Sabe cuántos kilos tiene para vender
```

**Flujo SIN distribución (Modo Libre):**
```
Vendedor llega (sin internet):
  └─ Empieza a vender directamente
  └─ Registra cada venta localmente
  └─ No hay control de kilos asignados
  └─ El sistema solo guarda las ventas
```

---

### M4 - Calculadora

| Función | Offline | Detalle |
|---------|---------|---------|
| Calcular precios | ✅ SÍ | 100% offline, solo matemáticas |
| Restar tara | ✅ SÍ | Operación local |
| Ver historial de cálculos | ✅ SÍ | Guardado en memoria/IndexedDB |
| Cambiar precios base | ❌ NO | Precios vienen del admin |

**Esta es la función más offline de todas** - puro JavaScript, no necesita nada externo.

---

### M5 - Ventas ⭐

| Función | Offline | Detalle |
|---------|---------|---------|
| Registrar venta | ✅ SÍ | Guarda en IndexedDB inmediatamente |
| Buscar cliente | ✅ SÍ | De los clientes cacheados |
| Crear cliente nuevo | ✅ SÍ | Se crea local, synca después |
| Aplicar descuento | ✅ SÍ | Cálculo local |
| Generar comprobante | ✅ SÍ | PDF/JSON local |
| Ver ventas del día | ✅ SÍ | Desde datos locales |
| Anular venta | ✅ SÍ | Marca como anulada localmente |

**Flujo completo offline:**
```
1. Vendedor abre app (sin internet)
2. Ve clientes cacheados
3. Registra nueva venta
4. Se guarda en IndexedDB
5. Se agrega a cola de sync
6. Muestra: "Venta guardada ✓"
7. Vendedor continúa normalmente

Cuando vuelve internet:
8. Sync automático
9. Venta aparece en servidor
10. Admin la ve en dashboard
```

**Datos que se guardan localmente:**
- ID de venta (UUID generado localmente)
- Cliente (ID o datos si es nuevo)
- Productos vendidos
- Monto, tipo de pago
- Fecha/hora local
- Estado: "pending" → "synced"

---

### M6 - Clientes y Abonos

| Función | Offline | Detalle |
|---------|---------|---------|
| Buscar cliente existente | ✅ SÍ | Búsqueda en datos cacheados |
| Ver historial de compras | ✅ SÍ | Ventas locales del cliente |
| Ver saldo pendiente | ✅ SÍ | Calculado desde datos locales |
| Crear cliente nuevo | ✅ SÍ | Guarda local, synca después |
| Editar cliente | ✅ SÍ | Guarda local, synca después |
| **Registrar abono** | ✅ SÍ | **Guarda local, synca después** |
| **Pago de deuda sin compra** | ✅ SÍ | **Abono independiente de venta** |
| Ver todos los clientes | ⚠️ PARCIAL | Solo los cacheados |

**Flujo de abono (pago de deuda):**
```
1. Cliente llega SOLO a pagar (sin comprar nada)
2. Vendedor busca cliente
3. Vendedor ingresa monto del abono
4. Sistema calcula nueva deuda: deuda_actual - abono
5. Se guarda en IndexedDB local
6. Se agrega a cola de sync
7. Cliente recibe comprobante (local)

Todo esto funciona 100% offline.
```

**Cálculo de deuda (offline):**
```typescript
// Datos locales
const ventasCredito = ventas.filter(v => v.client_id === id && v.sale_type === 'credito')
const abonosCliente = abonos.filter(a => a.client_id === id)

const deudaTotal = ventasCredito.reduce((sum, v) => sum + v.balance_due, 0)
const totalAbonos = abonosCliente.reduce((sum, a) => sum + a.amount, 0)

const saldoPendiente = deudaTotal - totalAbonos
```

**Estrategia de cache de clientes:**
```
Clientes que se cachean localmente:
├─ Clientes frecuentes (más de 3 compras)
├─ Clientes con deuda pendiente
├─ Clientes que compraron esta semana
└─ Clientes creados recientemente

Clientes que NO se cachean:
└─ Clientes inactivos (más de 6 meses sin comprar)
```

**Límite práctico:** ~500 clientes cacheados = ~2-3 MB

---

### M7 - Inventario (Opcional)

**El control de inventario es OPCIONAL.** El admin puede desactivarlo completamente.

| Función | Offline | Detalle | Modo Inventario | Modo Libre |
|---------|---------|---------|-----------------|------------|
| Ver mi inventario asignado | ✅ SÍ | Descargado al inicio del día | ✅ | ❌ N/A |
| Ver stock disponible | ✅ SÍ | Calculado localmente | ✅ | ❌ N/A |
| Registrar venta (reduce stock) | ✅ SÍ | Actualiza local, synca después | ✅ | ❌ No aplica |
| Ver alertas de stock bajo | ✅ SÍ | Calculado localmente | ✅ | ❌ N/A |
| Modificar stock global | ❌ NO | Solo ADMIN | ✅ | ❌ N/A |
| **Vender sin validar stock** | ✅ SÍ | **Sin restricciones** | ✅* | ✅ |

*Requiere configuración: `control_kilos = false` o `permitir_venta_sin_stock = true`

**Stock local del vendedor (Modo Inventario):**
```
Kilos asignados: 50 kg
Kilos vendidos:  32 kg (calculado de ventas locales)
Stock disponible: 18 kg

Todo esto se calcula localmente sin internet.
```

**Modo Libre (Sin inventario):**
```
No hay control de stock.
El vendedor registra ventas libremente.
El sistema guarda: cliente, monto, producto, fecha.
No se controla: kilos disponibles, asignación, distribución.
```

---

### M8 - Sync Engine

| Función | Offline | Detalle |
|---------|---------|---------|
| Detectar cambios locales | ✅ SÍ | Escucha cambios en IndexedDB |
| Guardar en cola | ✅ SÍ | Cola persistida en IndexedDB |
| Reintentar automático | ✅ SÍ | Cuando detecta conexión |
| Mostrar estado de sync | ✅ SÍ | UI actualiza con estado |
| Forzar sync manual | ⚠️ PARCIAL | Botón disponible, pero requiere internet |
| Resolver conflictos | ⚠️ PARCIAL | Algoritmo simple local |

**Cola de operaciones:**
```typescript
interface OperacionPendiente {
  id: string;           // UUID local
  tipo: 'venta' | 'cliente' | 'abono';
  datos: any;           // Payload completo
  timestamp: number;    // Para ordenar (FIFO)
  intentos: number;     // Contador de reintentos
  estado: 'pending' | 'syncing' | 'error';
}
```

**Estrategia de reintentos:**
```
Intento 1: Inmediato (cuando hay conexión)
Intento 2: 2 segundos después
Intento 3: 4 segundos después
Intento 4: 8 segundos después
Intento 5: 16 segundos después
Máximo: 5 intentos, luego marca como "error"
```

---

### M9 - Catálogo

| Función | Offline | Detalle |
|---------|---------|---------|
| Ver productos | ✅ SÍ | Cacheado al inicio del día |
| Ver precios | ✅ SÍ | Cacheado con productos |
| Ver variantes | ✅ SÍ | "Vivo", "Pelado", etc. |
| Agregar al carrito | ✅ SÍ | Estado local de la app |
| Actualizar precios | ❌ NO | Solo ADMIN |
| Agregar productos nuevos | ❌ NO | Solo ADMIN |

---

### M10 - Pedidos

| Función | Offline | Detalle |
|---------|---------|---------|
| Ver catálogo | ✅ SÍ | Cacheado |
| Armar pedido | ✅ SÍ | Estado local |
| Enviar pedido | ❌ NO | Requiere internet para notificar admin |
| Ver mis pedidos | ⚠️ PARCIAL | Solo los ya sync'd |

**Nota:** Los pedidos son menos críticos offline porque el cliente típicamente tiene internet.

---

### M11 - Reportes

| Función | Offline | Detalle |
|---------|---------|---------|
| Ver ventas del día (mías) | ✅ SÍ | Calculado de datos locales |
| Ver total recaudado | ✅ SÍ | Suma de ventas locales |
| Ver kilos vendidos | ✅ SÍ | Suma de ventas locales |
| Ver reportes del negocio | ❌ NO | Requiere datos de todos los vendedores |
| Exportar Excel/PDF | ⚠️ PARCIAL | PDF local sí, Excel del servidor no |

**Reporte de cierre del día CON inventario (100% offline):**
```
┌─────────────────────────────────────┐
│  CIERRE DEL DÍA - Juan Pérez        │
│                                     │
│  Kilos asignados:     50 kg         │
│  Kilos vendidos:      42 kg         │
│  Ventas realizadas:   15            │
│  Total recaudado:     S/ 504.00     │
│  Ventas a crédito:    S/ 120.00     │
│                                     │
│  Estado: 3 ventas pendientes de sync│
└─────────────────────────────────────┘
```

**Reporte de cierre del día SIN inventario (100% offline):**
```
┌─────────────────────────────────────┐
│  CIERRE DEL DÍA - Juan Pérez        │
│                                     │
│  Ventas realizadas:   15            │
│  Total recaudado:     S/ 504.00     │
│  Ventas a crédito:    S/ 120.00     │
│  Efectivo:            S/ 384.00     │
│                                     │
│  Estado: 3 ventas pendientes de sync│
└─────────────────────────────────────┘
```

Todo calculado desde IndexedDB local.

---

## 📊 Matriz de Funcionalidades Offline

### Vendedor (Mobile App)

| Funcionalidad | Offline | Prioridad | Modo Inventario | Modo Libre |
|---------------|---------|-----------|-----------------|------------|
| Login | ⚠️ Primera vez | CRÍTICA | ✅ | ✅ |
| Ver asignación del día | ✅ SÍ | MEDIA | ✅ | ❌ N/A |
| Calcular precios | ✅ SÍ | CRÍTICA | ✅ | ✅ |
| Registrar venta | ✅ SÍ | CRÍTICA | ✅ | ✅ |
| Buscar cliente | ✅ SÍ | ALTA | ✅ | ✅ |
| Crear cliente | ✅ SÍ | ALTA | ✅ | ✅ |
| Registrar abono | ✅ SÍ | ALTA | ✅ | ✅ |
| Ver historial de ventas | ✅ SÍ | MEDIA | ✅ | ✅ |
| Ver catálogo | ✅ SÍ | MEDIA | ✅ | ✅ |
| Cierre del día | ✅ SÍ | CRÍTICA | ✅ | ✅ |
| Sync manual | ⚠️ Requiere internet | MEDIA | ✅ | ✅ |

**Diferencia clave:**
- **Modo Inventario:** El vendedor ve cuántos kilos tiene asignados y cuánto le queda.
- **Modo Libre:** El vendedor solo registra ventas, sin control de stock.

### Admin (Web App)

| Funcionalidad | Offline | Prioridad | Notas |
|---------------|---------|-----------|-------|
| Login | ❌ NO | CRÍTICA | Siempre requiere internet |
| Dashboard | ⚠️ Parcial | ALTA | Muestra datos sync'd + pendientes |
| Crear distribución | ❌ NO | CRÍTICA | Requiere servidor |
| Ver ventas en tiempo real | ❌ NO | MEDIA | Delay de 30s-5min |
| Gestionar usuarios | ❌ NO | BAJA | Tarea administrativa |
| Reportes globales | ❌ NO | MEDIA | Requiere todos los datos |
| Exportar datos | ❌ NO | BAJA | Requiere servidor |

---

## 🚫 Limitaciones Específicas

### L1: Clientes nuevos sin internet

**Problema:** Dos vendedores crean el mismo cliente (mismo DNI) offline.

**Escenario:**
```
Vendedor A (offline): Crea cliente "Juan Pérez" DNI 12345678
Vendedor B (offline): Crea cliente "Juan Pérez" DNI 12345678

Cuando sync:
- Servidor detecta DNI duplicado
- Solución: Merge automático (mismos datos) o notificación a admin
```

**Mitigación:**
- Al crear cliente offline, validar DNI contra clientes locales cacheados
- Si ya existe, usar el existente
- Si es nuevo, crear con flag "pendiente de validación"
- Servidor hace merge si es necesario

---

### L2: Stock inconsistente

**Problema:** Vendedor vende más de lo asignado porque no ve ventas de otros.

**Escenario:**
```
Asignación: 50 kg a Juan

Juan (offline): Vende 30 kg
              ↓
Juan (offline): Vende 25 kg (piensa que tiene 20 kg más)
              ↓
Total vendido: 55 kg (¡5 kg de más!)
```

**Mitigación:**
- App calcula stock disponible localmente: `asignado - vendido_local`
- Si intenta vender más de lo disponible: Advertencia + requerir confirmación
- Al sync, si hay inconsistencia, notificar a admin

---

### L3: Precios desactualizados

**Problema:** Admin cambia precios, vendedor offline tiene precios viejos.

**Escenario:**
```
Mañana: Precio pollo = S/ 12.00/kg (cacheado en app)
        
Mediodía: Admin cambia precio a S/ 13.00/kg
          
Tarde: Vendedor offline vende a S/ 12.00 (precio viejo)
```

**Mitigación:**
- Precios se actualizan al inicio del día
- Si hay cambio durante el día, se aplican al día siguiente
- O: Notificación push cuando vendedor vuelve a online
- Vendedor puede forzar sync de precios si tiene internet

---

### L4: Ventas duplicadas

**Problema:** Misma venta se envía dos veces por error de sync.

**Escenario:**
```
Vendedor: Registra venta
          ↓
Sync: Intenta enviar, timeout (pero servidor sí la recibió)
          ↓
Sync: Reintenta, envía de nuevo
          ↓
Resultado: Venta duplicada en servidor
```

**Mitigación:**
- Cada venta tiene UUID único generado localmente
- Servidor valida UUID, rechaza duplicados
- Idempotencia: mismo UUID = misma operación

---

### L5: Dispositivo perdido/roto

**Problema:** Vendedor pierde celular con ventas no sync'd.

**Pérdida potencial:**
- Ventas del día actual (si no syncó)
- Datos locales no respaldados

**Mitigación:**
- Sync automático cada 30 segundos cuando hay internet
- Botón "Forzar sync" visible para vendedor
- Backup obligatorio al final del día
- Mensaje en app: "Sync recomendado cada 2 horas"

---

## ✅ Checklist de Implementación Offline

### Fase 1: Core Offline
- [ ] IndexedDB setup con idb-keyval
- [ ] TanStack DB colecciones con persistencia
- [ ] Sync Engine básico (detectar cambios, cola, reintentos)
- [ ] Ventas 100% offline
- [ ] Clientes cacheados (búsqueda, creación)
- [ ] Calculadora offline
- [ ] Cierre del día offline

### Fase 2: Mejoras Offline
- [ ] Estrategia de cache inteligente (clientes frecuentes)
- [ ] Conflict resolution básico
- [ ] Indicadores de estado de sync
- [ ] Sync manual con botón
- [ ] Background sync (Service Worker)

### Fase 3: Robustez
- [ ] Manejo de errores de sync
- [ ] Recuperación de datos corruptos
- [ ] Duplicados prevention (UUID)
- [ ] Merge de clientes duplicados
- [ ] Alertas de sync fallido

---

## 📱 UX Offline - Mejores Prácticas

### 1. Indicadores claros

```
🟢 En línea - Todo sincronizado
🟡 3 operaciones pendientes - Se sincronizarán automáticamente  
📴 Sin conexión - Funcionando offline, datos seguros
⚠️ Error de sync - Toca para reintentar
```

### 2. Feedback inmediato

```
[Vendedor registra venta]
    ↓
[Toast aparece inmediatamente]
"✅ Venta guardada localmente"
    ↓
[Si hay internet]
"🟢 Sincronizado con el servidor"
    ↓
[Si NO hay internet]
"📴 Se sincronizará cuando haya conexión"
```

### 3. Acciones disponibles offline

Todas las acciones del vendedor deben:
1. Responder inmediatamente (sin esperar servidor)
2. Guardar localmente
3. Intentar sync en background
4. Mostrar estado actualizado

### 4. Acciones que requieren internet

Deben deshabilitarse o mostrar mensaje:
```
[Botón deshabilitado: "Enviar pedido"]
Texto: "Requiere conexión a internet"

[Botón deshabilitado: "Ver reportes globales"]
Texto: "Disponible solo con conexión"
```

---

## 📊 Métricas de Éxito Offline

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Tiempo de respuesta UI | < 100ms | Desde clic a feedback visual |
| Tasa de sync exitoso | > 99% | Operaciones sync'd / total operaciones |
| Tiempo promedio de sync | < 5s | Cuando hay internet |
| Operaciones perdidas | 0 | Ventas que no llegaron al servidor |
| Conflictos resueltos automáticamente | > 95% | Sin intervención de admin |

---

## 🎓 Conclusión

**El sistema puede prometer:**
- ✅ Funcionar todo el día sin internet
- ✅ Guardar todas las ventas localmente
- ✅ Sincronizar automáticamente cuando hay conexión
- ✅ Calcular cierres de caja offline
- ✅ **Adaptarse a tu modelo de negocio** (con o sin inventario)

**El sistema NO puede prometer:**
- ❌ Datos en tiempo real para el admin
- ❌ Crear nuevas distribuciones sin internet (si usas ese modo)
- ❌ Reportes globales sin sync previo
- ❌ Recuperar datos de dispositivo perdido sin backup

**Flexibilidad del sistema:**
```
┌─────────────────────────────────────────────────────────┐
│  ¿Tienes inventario propio?                             │
│  └─ SÍ → Usa modo "Inventario Propio" con distribución  │
│  └─ NO → Usa modo "Libre" sin control de stock          │
│                                                         │
│  ¿Quieres ser flexible?                                 │
│  └─ Usa modo "Mixto" y decide por cada venta            │
└─────────────────────────────────────────────────────────┘
```

**La clave:** Ser honesto sobre las limitaciones, diseñar la UX para manejarlas gracefully, y **dejar que el negocio elija su modo de operación**.
