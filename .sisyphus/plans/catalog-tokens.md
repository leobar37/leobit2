# Plan de Trabajo: Catálogo con Tokens por Pedido

## TL;DR

> **Objetivo:** Permitir que admins generen links de pedido (tokens) para que clientes (conocidos o anónimos) completen/modifiquen pedidos directamente.
>
> **Flujo clave:** Admin crea pedido → Genera token → Manda link → Cliente edita/confirma → Token se bloquea automáticamente
>
> **Entregables:** Tabla orderTokens, API pública de pedidos, UI de pedido por token, toggle de edición en admin
>
> **Esfuerzo estimado:** Medium (2-3 semanas)
> **Ejecución paralela:** Sí - Backend y frontend pueden avanzar simultáneamente después de definir contratos

---

## Contexto

### Requerimientos Confirmados

1. **Token por pedido:** Cada pedido tiene un token único (12 chars aleatorios)
2. **Token toggleable:** Campo `isActive` para permitir/bloquear edición del cliente
3. **Token no expira:** Vive mientras el pedido exista
4. **Admin crea pedido:** Con items iniciales (para clientes conocidos) o vacío (para anónimos)
5. **Flujo anónimo seguro:** No hay catálogo público libre. Admin debe crear pedido + token
6. **Modificación post-confirmación:** Admin puede reactivar token para permitir cambios
7. **Todo va a orders:** Estado `draft` → `confirmed` (flujo existente)

### Flujos de Uso

#### Flujo A: Cliente Conocido
```
Admin: Pedidos → Nuevo → Selecciona cliente → Agrega items → Genera token
→ Copia link /pedido/{token} → Manda WhatsApp

Cliente: Abre link → Ve items propuestos → Modifica cantidades/productos
→ Elige fecha entrega → Confirma → Pedido pasa a "confirmed"
```

#### Flujo B: Cliente Anónimo
```
Admin: Pedidos → Nuevo → Cliente: "Nuevo anónimo" → Pedido vacío → Genera token
→ Manda link WhatsApp

Cliente: Abre link → Form: Nombre (obligatorio) + Teléfono (opcional)
→ Agrega productos → Elige fecha → Confirma
→ Se crea customer nuevo + pedido confirmed
```

#### Flujo C: Modificación Post-Confirmación
```
Cliente: "Necesito cambiar el pedido"
Admin: Busca pedido → Toggle "Permitir edición" ON → Misma link
Cliente: Abre link → Edita → Confirma
Admin: Toggle OFF → Pedido locked
```

---

## Estrategia de Verificación

### Estrategia de Testing
- **Infraestructura existe:** Sí - Vitest en frontend, bun test en backend
- **Testing approach:** Tests-after (implementar primero, tests después)
- **Solo Unit Tests:** Sin E2E, sin Playwright. Solo tests de lógica de negocio

### Testing Policy
- **Backend:** Unit tests para Services (lógica de negocio) con `bun test`
- **Frontend:** Unit tests para hooks y utils con `vitest` (si amerita)
- **NO E2E:** No Playwright, no flujos completos de navegación
- **Verificación manual:** El agente verifica que el código compile y los tests pasen

---

## Estrategia de Ejecución

### Olas de Ejecución (Maximizar Paralelismo)

```
Ola 1 (Fundamentos - Inicia inmediatamente):
├── Task 1: Migración DB orderTokens [quick]
├── Task 2: Repository orderTokens [quick]
├── Task 3: Service orderTokens [quick]
└── Task 4: Generar token al crear pedido [quick]

Ola 2 (Core Backend - Después Ola 1):
├── Task 5: API pública GET /public/pedido/:token [quick]
├── Task 6: API pública POST /public/pedido/:token/items [quick]
├── Task 7: API pública POST /public/pedido/:token/confirmar [quick]
└── Task 8: Endpoint toggle token isActive [quick]

Ola 3 (Frontend Público - Paralelo a Ola 2):
├── Task 9: Ruta pública /pedido/:token [visual-engineering]
├── Task 10: Componente OrderByTokenPage [visual-engineering]
├── Task 11: Formulario datos cliente anónimo [visual-engineering]
└── Task 12: UI edición de items del pedido [visual-engineering]

Ola 4 (Admin UI - Paralelo a Ola 2-3):
├── Task 13: Toggle isActive en detalle de pedido [visual-engineering]
├── Task 14: Botón "Generar link" en lista de pedidos [visual-engineering]
├── Task 15: Mostrar token en detalle de pedido [visual-engineering]
└── Task 16: Opción "Pedido para anónimo" en creación [visual-engineering]

Ola 5 (Integración y Polish):
├── Task 17: Validaciones y edge cases [quick]
└── Task 18: UI polish y responsive [visual-engineering]

Ola FINAL (Verificación):
├── Task F1: Auditoría de plan compliance [oracle]
└── Task F2: Review de calidad de código [unspecified-high]
```

### Dependencias Clave
- Ola 2 depende de Ola 1 (DB lista)
- Ola 3 y 4 pueden avanzar en paralelo después de Ola 2
- Ola 5 depende de Ola 3 y 4

---

## TODOs

### Wave 1: Fundamentos de Base de Datos y Backend Core

- [ ] 1. Crear migración para tabla orderTokens

  **Qué hacer:**
  - Crear archivo de migración en `packages/backend/drizzle/`
  - Definir tabla `orderTokens` con campos: id, orderId (FK), token (varchar 12), isActive (boolean), createdAt, lastUsedAt
  - Agregar índice único en `orderId`
  - Agregar índice en `token` para búsqueda rápida
  
  **References:**
  - Pattern: Ver `packages/backend/src/db/schema/staff-invitations.ts` para estructura de tokens
  - FK pattern: Usar `references(() => orders.id, { onDelete: "cascade" })`
  
  **Acceptance Criteria:**
  - [ ] Migración ejecuta sin errores: `bun run db:migrate`
  - [ ] Tabla aparece en base de datos

  **Commit:** `feat(db): add orderTokens table migration`
  **Agent Profile:** quick (backend/DB migrations)

- [ ] 2. Crear schema y types para orderTokens

  **Qué hacer:**
  - Crear archivo `packages/backend/src/db/schema/order-tokens.ts`
  - Definir tabla `orderTokens` con Drizzle ORM
  - Exportar tipos: `OrderToken`, `NewOrderToken`
  - Agregar relaciones con `orders`
  
  **References:**
  - Pattern: `packages/backend/src/db/schema/staff-invitations.ts` (líneas 1-48)
  - Relations pattern: Ver `ordersRelations` en orders.ts
  
  **Acceptance Criteria:**
  - [ ] Schema compila sin errores: `bun run build`
  - [ ] Tipos exportados correctamente

  **Commit:** `feat(db): add orderTokens schema definition`
  **Agent Profile:** quick (backend/schema definitions)

- [ ] 3. Crear OrderTokenRepository

  **Qué hacer:**
  - Crear archivo `packages/backend/src/services/repository/order-token.repository.ts`
  - Métodos:
    - `create(ctx, data)` - Crear nuevo token
    - `findByToken(ctx, token)` - Buscar por token string
    - `findByOrderId(ctx, orderId)` - Buscar token de un pedido
    - `updateStatus(ctx, id, isActive)` - Toggle isActive
    - `markUsed(ctx, id)` - Marcar como usado (lastUsedAt)
    - `deleteByOrderId(ctx, orderId)` - Eliminar token de un pedido (para regeneración)
  
  **References:**
  - Pattern: `packages/backend/src/services/repository/customer.repository.ts`
  - RequestContext: Ver AGENTS.md - ctx siempre primer parámetro
  
  **Acceptance Criteria:**
  - [ ] Todos los métodos implementados
  - [ ] Filtro por `businessId` en todas las queries (multi-tenancy)

  **Commit:** `feat(backend): add OrderTokenRepository`
  **Agent Profile:** quick (backend/repository pattern)

- [ ] 4. Crear OrderTokenService

  **Qué hacer:**
  - Crear archivo `packages/backend/src/services/business/order-token.service.ts`
  - Métodos:
    - `generateToken(ctx, orderId)` - Generar token único de 12 chars
    - `validateToken(ctx, token)` - Validar token (existe, isActive)
    - `toggleTokenStatus(ctx, orderId, isActive)` - Activar/desactivar
    - `regenerateToken(ctx, orderId)` - Eliminar viejo, crear nuevo
    - `getTokenByOrderId(ctx, orderId)` - Obtener token de un pedido
  
  **Token generation (lógica crítica - REQUIERE TEST):**
  ```typescript
  private generateUniqueToken(): string {
    // Generar 12 chars alfanuméricos
    return crypto.randomBytes(8).toString('base64url').slice(0, 12);
  }
  ```
  
  **Unit Tests Requeridos:**
  - `order-token.service.test.ts`:
    - Test: Generar token de exactamente 12 caracteres
    - Test: Tokens generados son únicos (generar 100, verificar no hay duplicados)
    - Test: Solo caracteres permitidos (a-z, A-Z, 0-9, -, _)
    - Test: validateToken retorna true para token válido
    - Test: validateToken retorna false para token inválido
    - Test: regenerateToken elimina el viejo y crea uno nuevo
  
  **References:**
  - Pattern: `packages/backend/src/services/business/customer.service.ts`
  - Tests: Ver ejemplos en `packages/backend/tests/` si existen
  
  **Acceptance Criteria:**
  - [ ] Generación de tokens únicos
  - [ ] Validación de tokens funciona
  - [ ] Tests unitarios pasan: `bun test`

  **Commit:** `feat(backend): add OrderTokenService with generation logic and tests`
  **Agent Profile:** quick (backend/service layer)

- [ ] 5. Auto-generar token al crear pedido

  **Qué hacer:**
  - Modificar `OrderService.create()` para generar token automáticamente
  - Inyectar `OrderTokenService` en constructor
  - Después de crear order, llamar `generateToken(ctx, order.id)`
  
  **References:**
  - Archivo: `packages/backend/src/services/business/order.service.ts`
  - Inyección DI: Ver cómo se inyectan otros servicios
  
  **Acceptance Criteria:**
  - [ ] Todo pedido nuevo tiene token asociado
  - [ ] Token se incluye en respuesta de API

  **Commit:** `feat(backend): auto-generate token on order creation`
  **Agent Profile:** quick (backend/integration)

---

### Wave 2: API Pública de Pedidos

- [ ] 6. Crear endpoint GET /public/pedido/:token

  **Qué hacer:**
  - Crear archivo `packages/backend/src/api/public-orders.ts`
  - Ruta pública: `GET /public/pedido/:token` (sin auth middleware)
  - Validar token con OrderTokenService
  - Si válido: retornar datos del pedido + items
  - Actualizar `lastUsedAt`
  
  **References:**
  - Pattern: `packages/backend/src/api/invitations.ts` (líneas 50-80) - rutas públicas
  - Ver cómo se usa `publicInvitationRoutes` sin auth
  
  **Acceptance Criteria:**
  - [ ] Endpoint accesible sin autenticación
  - [ ] Retorna datos correctos del pedido
  - [ ] 404 si token inválido

  **Commit:** `feat(api): public endpoint to get order by token`
  **Agent Profile:** quick (backend/API routes)

- [ ] 7. Crear endpoint POST /public/pedido/:token/items

  **Qué hacer:**
  - Endpoint: `POST /public/pedido/:token/items`
  - Validar token + isActive
  - Body: `{ productId, variantId, quantity }`
  - Agregar/actualizar item en el pedido
  - Recalcular totalAmount
  
  **Validaciones:**
  - Token debe ser válido y isActive = true
  - Pedido en estado "draft"
  - Producto pertenece al mismo business
  
  **References:**
  - Pattern: Ver `OrderService.addItem()` o similar
  - Validaciones: Ver `orders.ts` schema de items
  
  **Acceptance Criteria:**
  - [ ] Puede agregar items al pedido
  - [ ] Retorna pedido actualizado

  **Commit:** `feat(api): add items to order via public token endpoint`
  **Agent Profile:** quick (backend/API routes)

- [ ] 8. Crear endpoint DELETE /public/pedido/:token/items/:itemId

  **Qué hacer:**
  - Endpoint para eliminar item del pedido
  - Validar token + isActive + estado draft
  
  **Acceptance Criteria:**
  - [ ] Puede eliminar items
  - [ ] Recalcula totalAmount

  **Commit:** `feat(api): remove items from order via token`
  **Agent Profile:** quick (backend/API routes)

- [ ] 9. Crear endpoint POST /public/pedido/:token/confirmar

  **Qué hacer:**
  - Endpoint: `POST /public/pedido/:token/confirmar`
  - Validar token + isActive
  - Validar que order.status === "draft" (no permitir confirmar 2 veces)
  - Body opcional: `{ customerName?, customerPhone?, deliveryDate?, notes? }`
  
  **Flujo cliente anónimo (Transacción atómica - lógica compleja):**
  - Si `customerName` proporcionado y pedido.clientId es null:
    - Iniciar transacción DB
    - Crear nuevo customer: name = customerName, phone = customerPhone, businessId = order.businessId
    - Asignar customer.id a pedido.clientId
    - Si falla customer creation → rollback, retornar error 500
    - Confirmar transacción
  
  **Lógica de confirmación (TESTEAR):**
  ```typescript
  async confirmOrder(ctx: RequestContext, token: string, data: ConfirmData) {
    // 1. Validar token activo
    // 2. Validar pedido en draft
    // 3. Si anónimo: crear customer en transacción
    // 4. Cambiar status a "confirmed"
    // 5. Desactivar token permanentemente
    // 6. Crear orderEvent
  }
  ```
  
  **Unit Tests Requeridos:**
  - `public-order.service.test.ts` (si se extrae lógica a service):
    - Test: Confirmar pedido válido cambia status a confirmed
    - Test: Token se desactiva al confirmar
    - Test: Pedido confirmado no se puede reconfirmar (error)
    - Test: Anónimo: crear customer + vincular + confirmar
    - Test: Anónimo: rollback si falla creación de customer
    - Test: Rechazar confirmación si token.isActive = false
    - Test: Rechazar confirmación si order.status !== "draft"
  
  **Cambios en pedido:**
  - Cambiar estado: "draft" → "confirmed"
  - Desactivar token PERMANENTEMENTE: isActive = false (irreversible)
  - Actualizar deliveryDate si proporcionado
  - Crear orderEvent "confirmed"
  
  **IMPORTANTE:** Una vez confirmado, el token NO se puede re-activar. Admin debe usar "regenerar token" si quiere permitir modificaciones.
  
  **References:**
  - Pattern: Ver `OrderService.confirm()` existente
  - Customer creation: Ver `CustomerService.create()`
  - Transactions: Ver cómo se usan en otros services con `db.transaction()`
  
  **Acceptance Criteria:**
  - [ ] Confirma pedido correctamente
  - [ ] Crea customer para anónimos (con manejo de errores)
  - [ ] Desactiva token automáticamente E IRREVERSIBLEMENTE
  - [ ] No permite re-activar token de pedido confirmado
  - [ ] Crea orderEvent
  - [ ] Usa transacción para crear customer + confirmar pedido
  - [ ] Tests unitarios pasan

  **Commit:** `feat(api): confirm order via public token endpoint with tests`
  **Agent Profile:** quick (backend/API business logic)

- [ ] 10. Crear endpoint PATCH /api/orders/:id/token-status

  **Qué hacer:**
  - Endpoint protegido (requiere auth)
  - Body: `{ isActive: boolean }`
  - Buscar token por orderId y actualizar isActive
  
  **VALIDACIÓN CRÍTICA (TESTEAR):**
  - Solo permitir toggle si `order.status === "draft"`
  - Si order.status !== "draft", retornar error 400: "Cannot modify token on confirmed/cancelled orders"
  - Esta validación previene re-activar tokens de pedidos ya confirmados
  
  **Unit Tests:**
  - Test: Permitir toggle si order.status === "draft"
  - Test: Rechazar toggle si order.status === "confirmed"
  - Test: Rechazar toggle si order.status === "cancelled"
  
  **Usado por admin para:**
  - Permitir/bloquear edición de pedidos en draft
  - No funciona para pedidos confirmados (debe usar "regenerar token")
  
  **Acceptance Criteria:**
  - [ ] Solo admin del negocio puede cambiar
  - [ ] Actualiza isActive correctamente SOLO si order.status === "draft"
  - [ ] Retorna error 400 si se intenta modificar token de pedido confirmado
  - [ ] Tests unitarios pasan

  **Commit:** `feat(api): admin endpoint to toggle token status with validation and tests`
  **Agent Profile:** quick (backend/API admin routes)

- [ ] 11. Crear endpoint POST /api/orders/:id/regenerate-token

  **Qué hacer:**
  - Endpoint protegido (requiere auth)
  - Generar NUEVO token para el pedido
  - Invalidar token anterior (eliminar o marcar isActive=false)
  - Retornar nuevo token
  
  **Flujo de regeneración:**
  1. Buscar token existente por orderId
  2. Si existe: eliminar de DB (o marcar como "regenerated")
  3. Crear nuevo token con `generateToken()`
  4. Retornar nuevo token
  
  **Reglas:**
  - Solo funciona si order.status === "draft"
  - Si pedido está confirmado, debe crear primero una modificación (feature futura) o usar toggle
  - Nueva URL inmediatamente disponible
  - URL vieja deja de funcionar inmediatamente
  
  **Unit Tests:**
  - Test: Regenerar crea nuevo token diferente
  - Test: Token viejo ya no es válido después de regenerar
  - Test: Rechazar regeneración si order.status !== "draft"
  
  **Acceptance Criteria:**
  - [ ] Genera nuevo token único
  - [ ] Invalida token anterior (no funciona más)
  - [ ] Solo funciona en pedidos draft
  - [ ] Retorna nuevo token en respuesta
  - [ ] Tests unitarios pasan

  **Commit:** `feat(api): add token regeneration endpoint with tests`
  **Agent Profile:** quick (backend/API admin routes)

---

### Wave 3: Frontend - Página Pública de Pedido

- [ ] 12. Crear ruta pública /pedido/:token

  **Qué hacer:**
  - Crear archivo `packages/app/app/routes/pedido.$token.tsx`
  - Ruta pública (sin layout protegido)
  - Usar `useParams()` para obtener token
  - Llamar a API: `GET /public/pedido/:token`
  
  **References:**
  - Pattern: `packages/app/app/routes/invitations.$token.tsx`
  - No usar `_protected` en nombre del archivo
  
  **Acceptance Criteria:**
  - [ ] Ruta accesible sin login
  - [ ] Obtiene datos del pedido vía API

  **Commit:** `feat(ui): public order page route`
  **Agent Profile:** visual-engineering (frontend/React Router)

- [ ] 13. Crear componente OrderByTokenPage

  **Qué hacer:**
  - Crear componente principal en `packages/app/app/components/orders/order-by-token-page.tsx`
  - Estados:
    - Loading: Spinner mientras carga
    - Valid: Mostrar pedido editable
    - Invalid: Mensaje "Link inválido o expirado"
    - Submitted: Mensaje de confirmación
  
  **Layout:**
  - Header: Logo del negocio (obtenido del pedido.business)
  - Content: Lista de items del pedido (editable)
  - Footer: Botón confirmar
  
  **References:**
  - Pattern: Ver `packages/app/app/routes/invitations.$token.tsx` para estados
  - UI components: Usar Card, Button de `@/components/ui`
  
  **Acceptance Criteria:**
  - [ ] Muestra items del pedido
  - [ ] Permite agregar/quitar items (si token activo)

  **Commit:** `feat(ui): OrderByTokenPage component with item listing`
  **Agent Profile:** visual-engineering (frontend/components)

- [ ] 14. Crear formulario de datos para cliente anónimo

  **Qué hacer:**
  - Componente: `packages/app/app/components/orders/anonymous-customer-form.tsx`
  - Mostrar antes de confirmar si el pedido no tiene cliente asignado
  - Campos:
    - Nombre (obligatorio) - input text
    - Teléfono (opcional) - input tel
  - Validación con Zod
  
  **References:**
  - Form pattern: Ver `packages/app/app/components/customers/customer-form.tsx`
  - Zod schema: Ver `packages/app/app/lib/schemas.ts`
  
  **Acceptance Criteria:**
  - [ ] Formulario aparece para pedidos sin cliente
  - [ ] Validación de nombre obligatorio
  - [ ] Datos se envían al confirmar

  **Commit:** `feat(ui): anonymous customer form for token orders`
  **Agent Profile:** visual-engineering (frontend/forms)

- [ ] 15. Crear UI de edición de items

  **Qué hacer:**
  - Componente: `packages/app/app/components/orders/token-order-items-editor.tsx`
  - Lista de items con:
    - Nombre producto + variante
    - Input cantidad (editable)
    - Botón eliminar
    - Subtotal calculado
  - Botón "Agregar producto" → Abre selector de productos
  
  **Selector de productos:**
  - Modal/Sheet con lista de productos del negocio
  - Filtrar por `visibleInCatalog = true`
  - Permitir seleccionar variante y cantidad
  
  **References:**
  - Pattern: Ver calculadora de pollo en `packages/app/app/components/calculator/`
  - Modal: Usar Dialog de `@/components/ui/dialog`
  
  **Acceptance Criteria:**
  - [ ] Puede cambiar cantidades
  - [ ] Puede eliminar items
  - [ ] Puede agregar nuevos productos

  **Commit:** `feat(ui): order items editor for token-based orders`
  **Agent Profile:** visual-engineering (frontend/components)

---

### Wave 4: Admin UI - Gestión de Tokens

- [ ] 16. Agregar toggle isActive en detalle de pedido

  **Qué hacer:**
  - Modificar página de detalle de pedido: `packages/app/app/routes/_protected.pedidos.$id._index.tsx`
  - Agregar sección "Link del cliente" con:
    - URL completa: `${import.meta.env.VITE_APP_URL}/pedido/{token}`
    - Botón "Copiar link"
    - Botón "Regenerar link" (solo si order.status === "draft")
    - Toggle "Permitir edición" (isActive) - SOLO si order.status === "draft"
    - Badge de estado: "Activo" | "Bloqueado" | "Confirmado"
  
  **Environment Variable:**
  - Crear `VITE_APP_URL` en `.env` (ej: `http://localhost:5173` en dev, `https://app.avileo.app` en prod)
  - Usar `import.meta.env.VITE_APP_URL` para construir URL completa
  - Fallback: `window.location.origin` si no está definida
  
  **Comportamiento del Toggle:**
  - Solo visible/habilitado si order.status === "draft"
  - Si order.status !== "draft", mostrar deshabilitado con tooltip "No se puede modificar - pedido confirmado"
  
  **Botón "Regenerar link":**
  - Llama a `POST /api/orders/:id/regenerate-token`
  - Muestra modal con nueva URL
  - Vieja URL deja de funcionar inmediatamente
  
  **References:**
  - Pattern: Ver toggle switches en configuración
  - Copy to clipboard: `navigator.clipboard.writeText()`
  - Environment vars: Ver `.env.example` en packages/app
  
  **Acceptance Criteria:**
  - [ ] Muestra URL del token (usando VITE_APP_URL)
  - [ ] Toggle actualiza isActive vía API (solo para draft)
  - [ ] Toggle deshabilitado para pedidos confirmados
  - [ ] Botón "Regenerar link" funciona
  - [ ] Copiar link funciona

  **Commit:** `feat(ui): add token management toggle in order detail`
  **Agent Profile:** visual-engineering (frontend/admin UI)

- [ ] 17. Agregar botón "Generar link" en lista de pedidos

  **Qué hacer:**
  - En tabla/lista de pedidos, agregar columna "Link"
  - Botón que abre modal con:
    - URL del pedido
    - Botón "Copiar"
    - Botón "Compartir por WhatsApp" (opcional)
  - Solo mostrar para pedidos en estado "draft"
  
  **References:**
  - Lista de pedidos: `packages/app/app/routes/_protected.pedidos._index.tsx`
  - Table pattern: Ver `packages/app/app/components/ui/table.tsx`
  
  **Acceptance Criteria:**
  - [ ] Botón visible en lista
  - [ ] Modal muestra URL correcta
  - [ ] Copiar funciona

  **Commit:** `feat(ui): add generate link button to orders list`
  **Agent Profile:** visual-engineering (frontend/admin UI)

- [ ] 18. Agregar opción "Cliente anónimo" en creación de pedido

  **Qué hacer:**
  - Modificar formulario de creación de pedido: `packages/app/app/routes/_protected.pedidos.nuevo._index.tsx`
  - En selector de cliente, agregar opción: "Pedido para cliente nuevo (sin registrar)"
  - Al seleccionar, crear pedido con `clientId: null`
  - Generar token automáticamente
  - Mostrar link inmediatamente para compartir
  
  **References:**
  - Select component: Ver `packages/app/app/components/ui/select.tsx`
  - Customer selector: Buscar en formulario de pedidos
  
  **Acceptance Criteria:**
  - [ ] Opción "Cliente anónimo" disponible
  - [ ] Crea pedido sin clientId
  - [ ] Muestra link inmediatamente

  **Commit:** `feat(ui): anonymous order option in order creation`
  **Agent Profile:** visual-engineering (frontend/forms)

- [ ] 19. Mostrar indicador de origen en pedidos

  **Qué hacer:**
  - En lista de pedidos, agregar badge/icono indicando:
    - "Por token" - Pedido creado vía catálogo
    - "Manual" - Pedido creado directamente por admin
  - Usar campo `orders.createdVia` (agregar si no existe)
  
  **Acceptance Criteria:**
  - [ ] Badge visible en lista
  - [ ] Diferencia pedidos por token vs manuales

  **Commit:** `feat(ui): show order origin indicator in orders list`
  **Agent Profile:** visual-engineering (frontend/admin UI)

---

### Wave 5: Validaciones y Polish

- [ ] 20. Agregar validaciones y edge cases

  **Qué hacer:**
  - Validar:
    - Pedido en estado "draft" solo editable
    - Token inválido muestra error amigable
    - Token bloqueado (isActive=false) muestra mensaje
    - Producto sin stock no se puede agregar
  - Mensajes de error en español
  
  **Acceptance Criteria:**
  - [ ] Todos los edge cases manejados
  - [ ] Mensajes de error claros

  **Commit:** `feat(validation): add edge case handling`
  **Agent Profile:** quick (backend/frontend validations)

- [ ] 21. UI polish y responsive

  **Qué hacer:**
  - Revisar mobile: página pública debe funcionar bien en celular
  - Estilos consistentes con diseño existente (orange theme)
  - Loading states
  - Empty states
  
  **References:**
  - Diseño: Ver `docs/screens/` para mockups
  - Mobile-first: Ver componentes existentes responsive
  
  **Acceptance Criteria:**
  - [ ] Funciona en mobile (320px+)
  - [ ] Estilos consistentes
  - [ ] Loading/empty states implementados

  **Commit:** `feat(ui): polish and responsive improvements`
  **Agent Profile:** visual-engineering (frontend/UI polish)

---

## Final Verification Wave

### F1. Plan Compliance Audit (oracle)

**Task:** Revisar implementación contra plan
- Verificar todos los tasks completados
- Verificar contratos API cumplidos
- Verificar flujos de usuario funcionan

**Output:** Reporte de cumplimiento

### F2. Code Quality Review (unspecified-high)

**Task:** Review de calidad
- TypeScript sin `any`
- Sin console.logs en producción
- Errores manejados correctamente
- Consistente con codebase existente

---

## Estrategia de Commits

- **Wave 1:** `feat(db): add orderTokens table` + migración
- **Wave 2:** `feat(api): public order endpoints with token auth` + `feat(api): add token regeneration endpoint`
- **Wave 3:** `feat(ui): public order page by token`
- **Wave 4:** `feat(ui): admin token management` + environment config
- **Wave 5:** `feat(validation): edge cases` + `feat(ui): polish`

## Environment Variables Requeridas

Agregar a `packages/app/.env`:
```bash
VITE_APP_URL=http://localhost:5173  # Dev
# VITE_APP_URL=https://app.avileo.app  # Prod
```

Y a `packages/app/.env.example` para documentación.

---

## Tests Unitarios Requeridos

### Backend (bun test)

**Archivo:** `packages/backend/src/services/business/order-token.service.test.ts`
- `generateToken()` - Debe generar tokens de 12 caracteres
- `generateToken()` - Debe generar tokens únicos (100 tokens, sin duplicados)
- `validateToken()` - Retorna true para token válido y activo
- `validateToken()` - Retorna false para token inexistente
- `validateToken()` - Retorna false para token inactivo
- `regenerateToken()` - Crea token diferente al anterior
- `regenerateToken()` - Invalida token anterior

**Archivo:** `packages/backend/src/services/business/public-order.service.test.ts` (si aplica)
- `confirmOrder()` - Cambia status de draft a confirmed
- `confirmOrder()` - Desactiva token al confirmar
- `confirmOrder()` - No permite confirmar pedido ya confirmed
- `confirmOrder()` - Crea customer para anónimos
- `confirmOrder()` - Rollback si falla creación de customer
- `confirmOrder()` - Rechaza si token.isActive = false
- `confirmOrder()` - Rechaza si order.status !== "draft"

**Archivo:** `packages/backend/src/api/public-orders.test.ts` (si aplica)
- Toggle token status solo funciona si order.status === "draft"
- Toggle retorna error 400 si order.status === "confirmed"
- Regenerar token solo funciona si order.status === "draft"

### Frontend (vitest) - Opcional

Solo si hay lógica compleja en hooks/utilities:
- Validación de formularios
- Cálculos de totales/subtotales

---

## Criterios de Éxito

### Verificación Final
```bash
# Backend tests
bun test

# Frontend typecheck
cd packages/app && bun run typecheck

# Build
bun run build
```

### Checklist
- [ ] Admin puede crear pedido y generar token
- [ ] Cliente puede abrir pedido por token y editar
- [ ] Cliente anónimo puede crear pedido (form nombre)
- [ ] Al confirmar, token se bloquea automáticamente
- [ ] Admin puede toggle isActive para permitir re-edición
- [ ] Todo integrado con flujo existente de orders (draft → confirmed)
- [ ] Tests unitarios pasan (bun test)

---

*Plan generado para feature: Catálogo con Tokens por Pedido*
*Fecha: 2026-03-07*
*Actualizado: Sin tests E2E, solo unit tests*
