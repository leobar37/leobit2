# PollosPro - Plan Técnico del Sistema

> Software de gestión para negocios de venta de pollo (vivo, pelado, cortes) y productos relacionados.
> **Arquitectura: Offline-First con TanStack DB**

**Versión:** 2.0  
**Última actualización:** 7 de febrero de 2026

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos del Sistema](#módulos-del-sistema)
4. [Modelo de Datos](#modelo-de-datos)
5. [Flujos de Procesos](#flujos-de-procesos)
6. [Pantallas Principales](#pantallas-principales)
7. [Roadmap de Desarrollo](#roadmap-de-desarrollo)
8. [Stack Tecnológico](#stack-tecnológico)
9. [Limitaciones y Contradicciones](#limitaciones-y-contradicciones)
10. [Soporte Offline](#soporte-offline)

---

## Resumen Ejecutivo

### Problemática
Los negocios de venta de pollo operan de manera artesanal:
- Cálculos de precios a mano o con calculadora
- Cuentas por cobrar en libretas de papel
- Sin seguimiento de quién vende qué
- Difícil saber cuánto se vendió al final del día
- **Los vendedores trabajan en zonas sin cobertura de internet**

### Solución
PollosPro es un sistema **offline-first** que permite:
- **Vender sin internet** - Los datos se guardan localmente
- **Sincronizar cuando hay conexión** - Automático y transparente
- **Calcular precios automáticamente** (con resta de tara)
- **Gestionar cuentas por cobrar** digitalmente
- **Asignar inventario a vendedores** *(opcional)*
- **Conocer la recaudación** en tiempo real

### Alcance del MVP
El MVP incluye funcionalidades esenciales para operar digitalmente, con soporte offline completo para vendedores en zonas sin cobertura.

---

## 🎯 Modos de Operación (Flexibilidad del Sistema)

El sistema **NO asume** que siempre hay inventario propio. Soporta múltiples modelos de negocio:

### Modo 1: Inventario Propio (Tradicional)
La empresa compra pollo a proveedores, lo procesa y distribuye a vendedores.

**Características:**
- ✅ Control de stock de kilos disponibles
- ✅ Distribución del día con asignación de kilos
- ✅ Control de rendimiento por vendedor
- ✅ Alertas de inventario bajo

**Flujo:**
```
Compra a proveedor → Pesaje → Distribución → Ventas → Cierre
```

---

### Modo 2: Sin Inventario (Comisión/Consigna)
Los vendedores venden pollo de terceros o trabajan por comisión. No hay control de stock.

**Características:**
- ❌ Sin control de kilos disponibles
- ❌ Sin distribución del día
- ✅ Solo registro de ventas y clientes
- ✅ Cálculo de comisiones por vendedor

**Flujo:**
```
Vendedor vende → Registra venta → Calcula comisión
```

---

### Modo 3: Pedidos Primero (Pre-venta)
Los clientes hacen pedidos primero, luego se compra el pollo para cumplirlos.

**Características:**
- ✅ Sistema de pedidos con anticipo
- ✅ Consolidación de pedidos para compra
- ✅ Entregas contra pedido
- ✅ Control de pedidos pendientes

**Flujo:**
```
Cliente pide → Registra pedido → Compra pollo → Entrega → Cierra pedido
```

---

### Modo 4: Mixto (Híbrido)
Combinación de los anteriores según el día o temporada.

**Ejemplo:**
- Lunes-Miércoles: Inventario propio
- Jueves-Viernes: Pedidos primero
- Fines de semana: Sin inventario (solo registra)

---

### Configuración del Modo

El admin puede configurar el modo de operación en la configuración del sistema:

```typescript
interface ConfiguracionSistema {
  modo_operacion: 'inventario_propio' | 'sin_inventario' | 'pedidos' | 'mixto';
  control_kilos: boolean;        // true = controla stock, false = no controla
  usar_distribucion: boolean;    // true = usa distribución del día
  permitir_venta_sin_stock: boolean; // true = vende aunque no haya kilos asignados
}
```

**Impacto en la UI:**

| Modo | Dashboard Vendedor | Nueva Venta | Distribución |
|------|-------------------|-------------|--------------|
| Inventario Propio | Muestra kilos asignados | Valida stock disponible | ✅ Activo |
| Sin Inventario | Solo resumen de ventas | Sin validación de stock | ❌ Oculto |
| Pedidos | Pedidos pendientes | Contra pedido registrado | ❌ Oculto |

---

### Venta Libre (Sin Distribución)

Incluso en modo "Inventario Propio", el sistema permite **vender sin tener una distribución asignada**:

```
Configuración: permitir_venta_sin_stock = true

Vendedor puede:
- Registrar ventas sin kilos asignados
- El sistema solo guarda la venta (no descuenta de ningún stock)
- Útil para: ventas ocasionales, días especiales, emergencias
```

**Ejemplo práctico:**
> "Hoy llegaron 100kg pero no hice distribución formal. Juan vendió 20kg, María 30kg. El sistema registra las ventas sin necesidad de una distribución previa."

---

## Arquitectura del Sistema

### Arquitectura Offline-First

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO DEL VENDEDOR                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  REACT APP                                                  │    │
│  │  ├─ UI Components                                           │    │
│  │  ├─ TanStack Query (cache HTTP)                            │    │
│  │  └─ TanStack DB (estado reactivo)                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  TANSTACK DB COLLECTIONS                                     │    │
│  │  ├─ ventasCollection                                         │    │
│  │  ├─ clientesCollection                                       │    │
│  │  ├─ inventarioCollection                                     │    │
│  │  └─ syncQueueCollection (cola de operaciones)               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  INDEXEDDB (Persistencia Local)                             │    │
│  │  ├─ Guarda colecciones automáticamente                      │    │
│  │  ├─ Carga al iniciar la app                                 │    │
│  │  └─ Capacidad: ~50-100 MB por origen                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  SYNC ENGINE (Custom Implementation)                        │    │
│  │  ├─ Detecta cambios en colecciones                          │    │
│  │  ├─ Si hay internet: envía al servidor                      │    │
│  │  ├─ Si NO hay internet: guarda en cola                      │    │
│  │  └─ Reintenta con backoff exponencial                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │      CONEXIÓN (HTTP/REST)     │
                    │      (Cuando disponible)      │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         SERVIDOR (Cloud)                             │
│  ├─ API REST (Node.js/Express)                                      │
│  ├─ PostgreSQL (fuente de verdad)                                   │
│  └─ WebSocket opcional (sync en tiempo real)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Offline

```
┌─────────────────────────────────────────────────────────────────┐
│  VENDEDOR HACE UNA VENTA (Sin Internet)                         │
│                                                                 │
│  1. Completa formulario de venta                               │
│  2. Clic en "Registrar"                                        │
│         ↓                                                      │
│  3. TanStack DB guarda en memoria (UI se actualiza)           │
│         ↓                                                      │
│  4. IndexedDB persiste localmente (automático)                │
│         ↓                                                      │
│  5. SyncEngine detecta: NO hay internet                       │
│         ↓                                                      │
│  6. Guarda en cola de operaciones pendientes                  │
│         ↓                                                      │
│  7. Muestra: "✅ Venta guardada. Se sincronizará luego."     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Cuando vuelve internet
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  SINCRONIZACIÓN AUTOMÁTICA                                      │
│                                                                 │
│  1. Browser detecta evento 'online'                            │
│  2. SyncEngine.processQueue() se ejecuta                       │
│  3. Envía operaciones pendientes en orden FIFO                │
│  4. Servidor confirma cada operación                           │
│  5. Actualiza estado a 'synced'                                │
│  6. UI muestra: "🟢 Sincronizado"                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulos del Sistema

### Módulos del Sistema (Vista General)

| ID | Módulo | Prioridad | Descripción |
|----|--------|-----------|-------------|
| M1 | Autenticación | CORE | Login, logout, JWT |
| M2 | Usuarios y Roles | CORE | CRUD usuarios, permisos |
| M3 | **Distribución del Día** | CONFIGURABLE | Asigna inventario a vendedores (opcional) |
| M4 | Calculadora | CORE | Cálculo de precios con tara |
| M5 | Ventas | CORE | Registro de ventas contado/crédito (offline) |
| M6 | Clientes | CORE | Gestión de cuentas por cobrar (offline) |
| M7 | Inventario | CONFIGURABLE | Stock de pollo y productos (opcional) |
| M8 | Sync Engine | CORE | Sincronización offline/online |
| M9 | Catálogo | V2 | Productos para pedidos |
| M10 | Pedidos | V2 | Sistema de pedidos online |
| M11 | Reportes | V2 | Estadísticas y reportes |
| M12 | Recolección | FUTURO | Registro de compra a proveedores |

---

### M1 - Autenticación
**Descripción:** Login, logout y gestión de sesiones seguras.

**Funcionalidades:**
- [ ] Login con usuario/contraseña
- [ ] Logout
- [ ] JWT Token con expiración
- [ ] Recuperar contraseña (FUTURO)

**Inputs:** `username`, `password`  
**Outputs:** `jwt_token`, `user_data`, `session_id`

**Nota offline:** El login requiere internet la primera vez. Después, el token se cachea localmente.

---

### M2 - Usuarios y Roles
**Descripción:** CRUD de usuarios y control de permisos por rol. Solo el **ADMIN** puede crear usuarios.

**Funcionalidades:**
- [ ] **Crear usuario** (Admin crea vendedores y otros admins)
- [ ] Editar usuario
- [ ] Eliminar usuario (desactivar)
- [ ] Listar usuarios
- [ ] Roles: **ADMIN**, **VENDEDOR**
- [ ] Permisos por rol
- [ ] Asignar vendedor a distribución

**Flujo de creación de usuario:**
```
1. Admin accede a "Gestión de Usuarios"
2. Clic en "Nuevo Usuario"
3. Completa datos: nombre, DNI, email, teléfono
4. Selecciona rol: Vendedor o Admin
5. Configura punto de venta (si es vendedor)
6. Sistema genera contraseña automática
7. Se envía email al nuevo usuario con credenciales
8. Usuario puede cambiar contraseña al primer login
```

**Datos del usuario:**
| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Nombre completo | Sí | Nombre del vendedor/admin |
| DNI | Sí | Documento de identidad |
| Email | Sí | Para enviar credenciales |
| Teléfono | No | Contacto |
| Rol | Sí | ADMIN o VENDEDOR |
| Punto de venta | No | Carro A, Casa, etc. |
| Comisión | No | % de comisión por venta |
| Estado | Sí | Activo / Inactivo |

**Roles y Permisos:**

| Rol | Permisos |
|-----|----------|
| ADMIN | Todo el sistema (crear usuarios, ver reportes, configurar) |
| VENDEDOR | Ventas, Clientes, Calculadora, Catálogo, Historial (solo sus datos) |

---

### M3 - Distribución del Día (Opcional)
**Descripción:** Asigna inventario a vendedores para sus puntos de venta. **Este módulo es opcional** y se activa según el modo de operación.

**¿Cuándo usarlo?**
- ✅ Tienes inventario propio y quieres controlar cuánto le das a cada vendedor
- ✅ Quieres saber cuánto vendió cada vendedor de su asignación
- ❌ No lo uses si vendes por comisión o sin control de stock

**Concepto clave:** Un vendedor puede vender desde:
- Un **Carro** (en la calle)
- Su **Casa** (venta a domicilio)
- Un **Local** (tienda fija)
- Cualquier **punto de venta** definido

**Funcionalidades:**
- [ ] Crear distribución del día (opcional)
- [ ] Asignar vendedor
- [ ] Asignar punto de venta (texto libre)
- [ ] Asignar kilos/productos
- [ ] Ventas por vendedor (con o sin distribución)
- [ ] Cierre de vendedor
- [ ] Rendimiento por vendedor

**Venta SIN distribución:**
```
Configuración: permitir_venta_sin_stock = true

Vendedor puede registrar ventas aunque no tenga una distribución asignada.
El sistema guarda la venta sin descontar de ningún stock.
```

**Ejemplo CON distribución:**
```
Mañana: Llegan 150kg de pollo
├─ Distribución 1: Juan P. → Carro A → 50kg
├─ Distribución 2: Pedro R. → Casa → 40kg
└─ Distribución 3: María G. → Local Centro → 60kg
```

**Ejemplo SIN distribución:**
```
Vendedores venden libremente, el sistema solo registra:
- Juan vendió 30kg → Registrado
- María vendió 45kg → Registrado
- (No hay control de cuánto tenían asignado)
```

---

### M4 - Calculadora
**Descripción:** Cálculo inteligente de precios de pollo.

**Funcionalidades:**
- [ ] Calcular por 2 valores (ingresa 2, calcula el 3ro)
- [ ] Resta de tara
- [ ] Precio por kg configurable

**Fórmulas:**
```
Kilos Netos = Kilos Brutos - Tara

Si conoces: Monto Total y Precio/kg → Calcula Kilos
Si conoces: Monto Total y Kilos → Calcula Precio/kg
Si conoces: Precio/kg y Kilos → Calcula Monto Total
```

---

### M5 - Ventas (Offline)
**Descripción:** Registro de ventas al contado y a crédito. Funciona **100% offline**.

**Funcionalidades:**
- [ ] Venta al contado
- [ ] Venta a crédito
- [ ] **Venta sin cliente** (cliente genérico)
- [ ] Múltiples productos
- [ ] Guarda localmente cuando no hay internet
- [ ] Sincroniza automáticamente cuando vuelve

**Flujo offline:**
```
1. Vendedor registra venta
2. Se guarda en IndexedDB local inmediatamente
3. Se agrega a cola de sync
4. Si hay internet → Sync inmediato
5. Si NO hay internet → Espera a que vuelva
```

**Venta sin cliente:**
```
- El vendedor puede registrar ventas sin seleccionar cliente
- Útil para: ventas rápidas, clientes ocasionales, clientes que no quieren registrar
- La venta se guarda con client_id = null
- En reportes aparece como "Cliente genérico" o "Sin nombre"
```

---

### M6 - Clientes y Abonos (Offline)
**Descripción:** Gestión de cuentas por cobrar y pagos de deuda. Funciona **100% offline**.

**Funcionalidades:**
- [ ] CRUD Clientes (crear, leer, actualizar)
- [ ] Historial de compras
- [ ] **Registro de abonos** (pago de deuda independiente)
- [ ] **Pago sin compra** (cliente solo viene a pagar)
- [ ] Saldo pendiente (calculado automáticamente)
- [ ] Búsqueda de clientes cacheados

**Flujo de abono (cliente solo paga, no compra):**
```
1. Cliente llega a pagar su deuda
2. Vendedor busca cliente → Ve deuda actual
3. Vendedor ingresa monto del abono
4. Sistema calcula: Deuda - Abono = Nueva deuda
5. Se guarda localmente (offline)
6. Cliente recibe comprobante
```

**Cálculo de deuda:**
```
Saldo Pendiente = SUM(ventas a crédito) - SUM(abonos)
```

**Nota offline:** Los clientes y abonos se cachean localmente. Todo funciona sin internet.

---

### M7 - Inventario
**Descripción:** Control de stock de productos.

**Funcionalidades:**
- [ ] Stock de pollo
- [ ] Stock de huevos
- [ ] Otros productos
- [ ] Alertas de stock bajo (FUTURO)

---

### M8 - Sync Engine ⭐
**Descripción:** Motor de sincronización offline/online.

**Funcionalidades:**
- [ ] Detectar estado de conexión
- [ ] Guardar operaciones en cola cuando offline
- [ ] Reintentar sync con backoff exponencial
- [ ] Resolver conflictos simples
- [ ] Mostrar estado de sync en UI
- [ ] Persistir cola en IndexedDB

**Estrategia de reintentos:**
```
Intento 1: Inmediato
Intento 2: Después de 2 segundos
Intento 3: Después de 4 segundos
Intento 4: Después de 8 segundos
Máximo: 3-5 intentos, luego marca como error
```

---

### M9-M12 - Futuras
- **Catálogo**: Productos para pedidos
- **Pedidos**: Sistema de pedidos online
- **Reportes**: Estadísticas y análisis
- **Recolección**: Registro de compra a proveedores

---

## Modelo de Datos

### Tablas Principales

#### `users`
Usuarios del sistema (admin, vendedores).

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| id | UUID | PK | Identificador único |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Nombre de usuario |
| password_hash | VARCHAR(255) | NOT NULL | Contraseña encriptada |
| role_id | UUID | FK, NOT NULL | Rol del usuario |
| name | VARCHAR(100) | NOT NULL | Nombre completo |
| phone | VARCHAR(20) | | Teléfono |
| is_active | BOOLEAN | DEFAULT true | Usuario activo |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha creación |

---

#### `distribuciones`
Asignación diaria de inventario a vendedores.

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| id | UUID | PK | Identificador único |
| vendedor_id | UUID | FK, NOT NULL | Vendedor asignado |
| punto_venta | VARCHAR(100) | | Carro A, Casa, Local, etc. |
| kilos_asignados | DECIMAL(8,3) | DEFAULT 0 | Kilos asignados hoy |
| kilos_vendidos | DECIMAL(8,3) | DEFAULT 0 | Kilos vendidos hoy |
| monto_recaudado | DECIMAL(10,2) | DEFAULT 0 | Dinero recaudado |
| fecha | DATE | NOT NULL | Fecha de la distribución |
| estado | ENUM | DEFAULT activo | activo, cerrado, en_ruta |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha creación |

---

#### `sales` (Con syncStatus)
Ventas realizadas.

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| id | UUID | PK | Identificador único |
| **client_id** | UUID | FK, **NULLABLE** | **Cliente (null = venta sin cliente)** |
| seller_id | UUID | FK, NOT NULL | Vendedor |
| **distribucion_id** | UUID | FK, **NULLABLE** | **Distribución del día (opcional)** |
| sale_type | ENUM | NOT NULL | contado, credito |
| total_amount | DECIMAL(10,2) | NOT NULL | Monto total |
| amount_paid | DECIMAL(10,2) | DEFAULT 0 | Monto pagado |
| balance_due | DECIMAL(10,2) | DEFAULT 0 | Saldo pendiente |
| tara | DECIMAL(8,3) | DEFAULT 0 | Tara en kg |
| net_weight | DECIMAL(8,3) | | Peso neto |
| **sync_status** | ENUM | DEFAULT pending | **pending, synced, error** |
| **sync_attempts** | INTEGER | DEFAULT 0 | **Intentos de sync** |
| sale_date | TIMESTAMP | DEFAULT NOW() | Fecha venta |

**Notas:**
- `client_id` puede ser NULL para **ventas sin cliente** (cliente genérico)
- `distribucion_id` puede ser NULL si el sistema opera sin control de inventario

---

#### `abonos` (Pagos de deuda)
Registra pagos que hacen los clientes sobre su deuda, **independientemente de una venta**.

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| id | UUID | PK | Identificador único |
| client_id | UUID | FK, NOT NULL | Cliente que paga |
| seller_id | UUID | FK, NOT NULL | Vendedor que recibe el pago |
| amount | DECIMAL(10,2) | NOT NULL | Monto del abono |
| payment_method | ENUM | DEFAULT efectivo | efectivo, yape, plin, transferencia |
| notes | TEXT | | Notas opcionales |
| **sync_status** | ENUM | DEFAULT pending | pending, synced, error |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha del abono |

**Casos de uso:**
- Cliente viene SOLO a pagar su deuda (sin comprar nada)
- Cliente hace un abono parcial de su deuda
- Cliente liquida su deuda completa

**Cálculo de deuda:**
```
Deuda del cliente = SUM(ventas a crédito) - SUM(abonos)
```

---

#### `sync_queue` (Local only)
Cola de operaciones pendientes de sincronizar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID de la operación |
| operation_type | ENUM | create, update, delete |
| collection | VARCHAR | ventas, clientes, etc. |
| data | JSON | Datos de la operación |
| created_at | TIMESTAMP | Cuándo se creó |
| attempts | INTEGER | Cuántas veces se intentó |
| last_error | TEXT | Mensaje de error |

---

## Flujos de Procesos

### Flujo Diario Completo (con Offline)

#### Flujo CON Inventario (Modo Tradicional)
```
05:00 AM ──▶ Recolección ──▶ Pesaje ──▶ Preparación
                │
                ▼
    Distribución del Día (OPCIONAL - con internet)
    ├─ Asignar Vendedor
    ├─ Asignar Punto de Venta
    └─ Asignar Kilos/Productos
                │
                ▼
            Ventas ──▶ ¿Internet?
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        SÍ: Sync inmediato      NO: Guarda local
              │                       │
              │              ┌────────┴────────┐
              │              ▼                 ▼
              │        Guarda en IndexedDB  Agrega a cola
              │              │                 │
              │              └────────┬────────┘
              │                       │
              └───────────┬───────────┘
                          ▼
              Cierre del Día
              └─ Reporte desde datos locales
                 (sync cuando haya internet)
```

#### Flujo SIN Inventario (Modo Libre)
```
Vendedor llega ──▶ Empieza a vender ──▶ Registra cada venta
                                              │
                                              ▼
                                    Guarda local (offline)
                                              │
                                              ▼
                                    Sync cuando hay internet
                                              │
                                              ▼
                                    Admin ve reportes
```

**Diferencia clave:** En modo SIN inventario, no hay distribución ni control de stock. Solo registro de ventas.

---

## Pantallas Principales

### Mobile (Vendedores) - Funcionan Offline

| Pantalla | Offline | Descripción | Modo Inventario | Modo Libre |
|----------|---------|-------------|-----------------|------------|
| **Calculadora** | ✅ 100% | Calcular precios de pollo | ✅ | ✅ |
| **Nueva Venta** | ✅ 100% | Registrar venta (guarda local) | ✅ | ✅ |
| **Clientes** | ✅ 100% | Buscar/crear clientes cacheados | ✅ | ✅ |
| **Catálogo** | ✅ 100% | Ver productos (cacheado) | ✅ | ✅ |
| **Cierre del Día** | ✅ 100% | Generar reporte desde datos locales | ✅ | ✅ |
| **Mi Asignación** | ✅ 100% | Ver kilos asignados | ✅ | ❌ Oculto |

### Desktop (Admin) - Requiere Internet

| Pantalla | Offline | Descripción | Modo Inventario | Modo Libre |
|----------|---------|-------------|-----------------|------------|
| **Gestión de Usuarios** | ❌ No | Crear/editar vendedores | ✅ | ✅ |
| **Distribución del Día** | ❌ No | Asignar inventario | ✅ | ❌ Oculto |
| **Configuración** | ❌ No | Modo de operación, stock | ✅ | ✅ |
| **Dashboard** | ⚠️ Parcial | Ver datos sync'd | ✅ | ✅ |
| **Reportes** | ⚠️ Parcial | Reportes de datos ya sync'd | ✅ | ✅ |

---

## Roadmap de Desarrollo

### Fase 1: MVP Core (6-8 semanas)

**Tareas:**
- [ ] Setup proyecto (React, Node, PostgreSQL)
- [ ] Autenticación básica
- [ ] Usuarios y permisos
- [ ] **Sync Engine** (offline/online)
- [ ] **Persistencia IndexedDB**
- [ ] Distribución del día
- [ ] Calculadora
- [ ] Ventas (con soporte offline)
- [ ] Clientes (con soporte offline)
- [ ] Inventario básico

**Entregables:**
- App mobile que funciona **sin internet**
- Sync automático cuando hay conexión
- Panel admin básico

---

### Fase 2: Mejoras (4-5 semanas)

- [ ] Catálogo de productos
- [ ] Sistema de pedidos
- [ ] Notificaciones
- [ ] Mejoras en UI/UX

---

### Fase 3: Escalabilidad (4-5 semanas)

- [ ] Reportes avanzados
- [ ] Módulo de recolección
- [ ] Exportar datos
- [ ] Backup automático

---

## Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| **Frontend** | React 18 + TypeScript | UI |
| **Estado** | TanStack DB | Colecciones reactivas |
| **Cache HTTP** | TanStack Query | Peticiones al servidor |
| **Persistencia** | IndexedDB + idb-keyval | Almacenamiento local |
| **Sync** | Custom Sync Engine | Nuestra implementación |
| **Backend** | Node.js + Express | API REST |
| **Database** | PostgreSQL | Fuente de verdad |

---

## Limitaciones y Contradicciones

### ⚠️ Limitaciones Técnicas

| # | Limitación | Impacto | Mitigación |
|---|------------|---------|------------|
| 1 | **Login requiere internet** | Primera vez sí necesita conexión | Cachear token JWT por 24-48h |
| 2 | **Datos del admin no son instantáneos** | Admin ve ventas con delay | Indicador de "X ventas pendientes de sync" |
| 3 | **Conflictos en ediciones simultáneas** | Dos vendedores editan mismo cliente | Estrategia: último gana + notificación |
| 4 | **Capacidad de IndexedDB** | ~50-100 MB por origen | Suficiente para días de operación |
| 5 | **No hay sync en tiempo real** | Admin no ve ventas instantáneamente | Sync cada 30s cuando hay internet, o manual |
| 6 | **Dispositivo perdido = datos locales perdidos** | Ventas no sync'd se pierden | Sync frecuente, backup diario obligatorio |

### 🔴 Contradicciones del Negocio

| Contradicción | Explicación | Decisión |
|---------------|-------------|----------|
| **"Quiero ver todo en tiempo real" vs "Vendedores no tienen internet"** | Admin quiere dashboard actualizado, pero vendedores están offline | Dashboard muestra último estado sync'd + indicador de pendientes |
| **"Quiero cerrar caja al instante" vs "Sync tarda"** | Cierre de caja requiere todas las ventas, pero algunas están offline | Cierre de caja se calcula desde datos locales del vendedor |
| **"No quiero perder ninguna venta" vs "El dispositivo puede fallar"** | Ventas solo en local hasta sync | Sync automático cada 30s + backup manual al final del día |

---

## Soporte Offline

### ¿Cuánto tiempo funciona offline?

| Escenario | Tiempo Offline | Datos Almacenados |
|-----------|---------------|-------------------|
| **Operación normal** | Días completos | ~10-20 ventas/día = < 1 MB |
| **Alta demanda** | 1 semana | ~100 ventas = ~5 MB |
| **Límite técnico** | ~1 mes | 50-100 MB (límite IndexedDB) |

**Promesa al cliente:**
> "El sistema funciona **todo el día sin internet**. Al final del día, cuando tengas conexión, se sincroniza automáticamente."

### Recomendaciones para el negocio

1. **Sync al menos 1 vez al día** - Al finalizar la jornada
2. **Si hay WiFi en algún punto** - Conectar y dejar syncar
3. **Backup manual opcional** - Botón "Forzar sync" cuando hay internet

### Indicadores de Estado (UI)

```
🟢 En línea - Todo sincronizado
🟡 3 operaciones pendientes - Se sincronizarán automáticamente
🔴 Sin conexión - Funcionando offline, datos seguros
⚠️ Error de sync - Toca para reintentar
```

---

## Glosario

| Término | Definición |
|---------|------------|
| **Offline-first** | La app funciona sin internet, sync cuando puede |
| **Sync** | Sincronizar datos locales con el servidor |
| **IndexedDB** | Base de datos local del navegador |
| **Tara** | Peso del envase que se resta |
| **Distribución del Día** | Asignación de inventario a vendedores (opcional) |
| **Cola de sync** | Operaciones pendientes de enviar al servidor |
| **Modo Inventario Propio** | Control de stock y distribución de kilos |
| **Modo Libre** | Solo registro de ventas, sin control de stock |
| **Venta sin distribución** | Vender sin tener kilos asignados previamente |

---

*Plan técnico con arquitectura Offline-First usando TanStack DB (100% open source).*
