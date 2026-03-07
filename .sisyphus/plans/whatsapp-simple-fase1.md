# Plan: WhatsApp para Avileo (Versión Simplificada)

## TL;DR

> **FASE 1 (Este Plan)**: Sistema simple de plantillas + envío individual
> - Vendedor conecta WhatsApp vía QR
> - Crea plantillas con variables {nombre}, {monto}, etc.
> - Envía mensajes desde venta o deuda con 2 clicks
> 
> **FASE 2 (Futuro)**: Mensajería masiva (separado, no incluido aquí)
> 
> **Stack**: Evolution SDK + Inngest (como en Elena)
> **Duración**: 1 semana (versión simplificada)
> **Filosofía**: Simple: Generar mensaje → Enviar. Punto.

---

## Contexto

### Lección Aprendida de Elena
En Elena el sistema fue muy complejo con campañas, segmentación, filtros complejos, etc. **Aquí hacemos lo opuesto**: simple y directo.

### Flujo Simplificado
```
1. Vendedor escribe template: "Hola {nombre}, debes S/ {monto}"
2. Va a una venta/deuda
3. Clic "Enviar WhatsApp"
4. Elige template
5. Clic "Confirmar"
6. Listo - mensaje enviado
```

Sin campañas, sin programación compleja, sin filtros elaborados.

---

## Alcance FASE 1 (Este Plan)

### ✅ INCLUIR (Simple y Directo)

**1. Configuración WhatsApp**
- Conectar WhatsApp vía QR (1 vendedor = 1 WhatsApp)
- Ver estado de conexión
- Desconectar

**2. Plantillas de Mensajes**
- CRUD simple de plantillas
- Variables: {nombre_cliente}, {monto}, {fecha}, etc.
- Preview con datos de ejemplo
- Templates por defecto (deuda, venta)

**3. Enviar Mensajes (2 Flujos)**

**Flujo A - Desde Venta:**
- Botón "Enviar WhatsApp" en detalle de venta
- Seleccionar template
- Preview con datos reales de la venta
- Confirmar → Enviar vía Inngest

**Flujo B - Desde Deuda:**
- En pantalla de deudas, botón "Enviar Recordatorio"
- Seleccionar cliente con deuda
- Seleccionar template
- Confirmar → Enviar

**4. Historial Simple**
- Ver mensajes enviados
- Filtros básicos: fecha, cliente, estado
- Reintentar si falló

### ❌ EXCLUIR (Para FASE 2 o Nunca)
- "Campañas" complejas
- Mensajería masiva automática
- Programación de envíos
- Segmentación de clientes
- Reglas complejas
- Analytics avanzados

---

## Estrategia de Implementación

### Principios
1. **Simple**: Generar mensaje → Enviar. Nada más.
2. **Directo**: Sin pasos intermedios innecesarios
3. **Rápido**: MVP funcional en 1 semana
4. **Evolutivo**: Fase 1 sólida, Fase 2 después

### Waves Simplificados

```
Wave 1 (Fundamentos - 2 días):
├── T1: Database schema (3 tablas simples)
├── T2: Evolution SDK service
└── T3: Inngest function básica (send message)

Wave 2 (Backend API - 2 días):
├── T4: WhatsApp settings API
├── T5: Templates API (CRUD simple)
└── T6: Send message API (simple, sin complicaciones)

Wave 3 (Frontend - 3 días):
├── T7: Configuración WhatsApp + QR
├── T8: Gestor de plantillas
├── T9: Botón "Enviar WhatsApp" en venta
└── T10: Botón "Enviar" en deuda + Historial simple

Wave 4 (Polish - 1 día):
└── T11: Tests + UI polish + manejo de errores
```

**Total: 11 tareas (vs 17 del plan complejo)**

---

## Database Schema (Simplificado)

```typescript
// 1. business_user_whatsapp_settings
- id: uuid PK
- businessUserId: uuid FK → business_users.id
- businessId: uuid FK → businesses.id
- isConnected: boolean default false
- phoneNumber: varchar(20)
- instanceName: varchar(100) // Evolution instance
- createdAt, updatedAt

// 2. whatsapp_templates
- id: uuid PK
- businessUserId: uuid FK
- businessId: uuid FK
- name: varchar(100) // ej: "Recordatorio deuda"
- content: text // "Hola {nombre}, debes S/ {monto}"
- isDefault: boolean default false
- createdAt, updatedAt

// 3. whatsapp_messages (logs simple)
- id: uuid PK
- businessUserId: uuid FK
- customerId: uuid FK → customers.id
- templateId: uuid FK
- phoneNumber: varchar(20)
- messageContent: text // mensaje final enviado
- status: enum('enviado', 'fallido')
- errorMessage: text (nullable)
- sentAt: timestamp
- createdAt
```

**Nota**: NO hay tabla de campañas, NO hay filtros complejos, NO hay programación.

---

## API Endpoints (Simplificado)

```
# Configuración
GET    /api/whatsapp/settings
POST   /api/whatsapp/connect      # Inicia conexión QR
GET    /api/whatsapp/status       # Verifica estado
POST   /api/whatsapp/disconnect

# Plantillas
GET    /api/whatsapp/templates
POST   /api/whatsapp/templates
PUT    /api/whatsapp/templates/:id
DELETE /api/whatsapp/templates/:id

# Enviar Mensajes (SIMPLE)
POST   /api/whatsapp/send
Body: {
  customerId: string,
  templateId: string,
  variables: { nombre: "Juan", monto: "150.00" }
}

# Historial
GET    /api/whatsapp/messages?customerId=&status=&page=
POST   /api/whatsapp/messages/:id/retry
```

**Nota**: NO hay endpoints de campañas, NO hay programación, NO hay filtros complejos.

---

## TODOs (Versión Simplificada)

- [ ] 1. Database Schema (3 tablas)

  **What to do**:
  Crear 3 tablas simples:
  - `business_user_whatsapp_settings`
  - `whatsapp_templates`  
  - `whatsapp_messages`
  
  Sin campos complejos, sin JSONB anidados, sin foreign keys extrañas.

  **Skills**: `avileo`, `bun-elysia`

- [ ] 2. Evolution SDK Service

  **What to do**:
  - Instalar `@gymspace/evolution`
  - Service con 4 métodos:
    - `createInstance(instanceName)`
    - `connectInstance(instanceName)` → retorna QR
    - `getConnectionState(instanceName)`
    - `sendText(instanceName, phone, text)`
  
  Sin manejo de media, sin webhooks complejos.

  **Skills**: `bun-elysia`

- [ ] 3. Inngest Function Básica

  **What to do**:
  Una sola función Inngest:
  ```typescript
  export const sendWhatsAppMessage = inngest.createFunction(
    { id: "send-whatsapp", retries: 3 },
    { event: "whatsapp/send" },
    async ({ event, step }) => {
      const { instanceName, phone, message } = event.data;
      await step.sleep("3s"); // Rate limiting simple
      await evolutionService.sendText(instanceName, phone, message);
    }
  );
  ```
  
  **Skills**: `fullstack-inngest`

- [ ] 4. WhatsApp Settings API

  **What to do**:
  Endpoints para conectar/desconectar WhatsApp:
  - POST /connect → retorna QR code
  - GET /status → retorna estado
  - POST /disconnect
  
  **Skills**: `avileo`, `bun-elysia`

- [ ] 5. Templates API (CRUD Simple)

  **What to do**:
  CRUD simple de plantillas:
  - Crear: POST /templates
  - Listar: GET /templates
  - Actualizar: PUT /templates/:id
  - Eliminar: DELETE /templates/:id
  
  Variables: validar que solo uses {nombre}, {monto}, etc.
  
  **Skills**: `avileo`, `bun-elysia`

- [ ] 6. Send Message API (Simple)

  **What to do**:
  Un solo endpoint simple:
  ```typescript
  POST /api/whatsapp/send
  {
    customerId: "uuid",
    templateId: "uuid", 
    variables: { nombre: "Juan", monto: "150" }
  }
  ```
  
  Flujo:
  1. Obtener template
  2. Reemplazar variables
  3. Obtener teléfono del cliente
  4. Enviar evento a Inngest
  5. Guardar en log
  
  Sin validaciones complejas, sin filtros, sin lógica de negocio rara.
  
  **Skills**: `avileo`, `bun-elysia`, `fullstack-inngest`

- [ ] 7. Frontend: Configuración WhatsApp

  **What to do**:
  Pantalla simple en `/config/whatsapp`:
  - Botón "Conectar WhatsApp"
  - Muestra QR code
  - Polling cada 5s para verificar conexión
  - Muestra número conectado
  - Botón "Desconectar"
  
  **Skills**: `frontend`, `avileo`

- [ ] 8. Frontend: Gestor de Plantillas

  **What to do**:
  Pantalla simple `/config/whatsapp/templates`:
  - Lista de plantillas
  - Formulario: nombre + contenido
  - Preview en tiempo real
  - Botones de variable: {nombre}, {monto}, {fecha}
  
  **Skills**: `frontend`

- [ ] 9. Frontend: Botón "Enviar WhatsApp" en Venta

  **What to do**:
  En detalle de venta (`/ventas/:id`):
  - Botón "Enviar WhatsApp"
  - Modal simple:
    1. Seleccionar template (dropdown)
    2. Preview del mensaje con datos reales
    3. Botón "Enviar"
  - Feedback: "Enviando..." → "Enviado ✓" o "Error ✗"
  
  **Skills**: `frontend`, `avileo`

- [ ] 10. Frontend: Deuda + Historial

  **What to do**:
  Dos cosas simples:
  
  **A) Enviar desde Deuda:**
  - En pantalla de deudas, botón "Enviar Recordatorio" por cliente
  - Mismo modal que en venta (seleccionar template → enviar)
  
  **B) Historial simple:**
  - Lista de mensajes enviados
  - Filtros: cliente, fecha
  - Botón "Reintentar" si falló
  
  **Skills**: `frontend`

- [ ] 11. Tests + UI Polish

  **What to do**:
  - Tests básicos de los endpoints
  - Manejo de errores simple
  - Estados vacíos
  - Responsive básico
  
  **Skills**: `frontend`, `unspecified-high`

---

## Flujo de Usuario (Simple)

### Setup Inicial (Una vez)
1. Vendedor va a Config → WhatsApp
2. Clic "Conectar"
3. Escanea QR con su teléfono
4. Listo - WhatsApp conectado

### Crear Plantilla (Una vez)
1. Config → WhatsApp → Plantillas
2. Clic "Nueva Plantilla"
3. Nombre: "Recordatorio"
4. Contenido: "Hola {nombre}, debes S/ {monto}"
5. Guardar

### Enviar Mensaje (Uso diario)
**Opción A - Desde Venta:**
1. Ver detalle de venta
2. Clic "Enviar WhatsApp"
3. Seleccionar template
4. Ver preview: "Hola Juan, debes S/ 150"
5. Clic "Enviar"
6. Listo

**Opción B - Desde Deuda:**
1. Ir a Cobranza → Deudas
2. Encontrar cliente con deuda
3. Clic "Enviar Recordatorio"
4. Seleccionar template
5. Clic "Enviar"
6. Listo

---

## Variables Permitidas

```
{nombre_cliente} - Nombre del cliente
{monto} - Monto (de venta o deuda)
{fecha} - Fecha actual
{telefono} - Teléfono del cliente (opcional)
```

**Nota**: Solo 4 variables simples. Sin complicaciones.

---

## Success Criteria

### Verificación Simple
```bash
# Backend compila
cd packages/backend && bun run build

# Frontend compila
cd packages/app && bun run build

# Test manual:
# 1. Conectar WhatsApp ✓
# 2. Crear plantilla ✓
# 3. Enviar mensaje desde venta ✓
# 4. Enviar mensaje desde deuda ✓
# 5. Ver historial ✓
```

### Checklist
- [ ] Vendedor conecta WhatsApp en < 2 minutos
- [ ] Crea plantilla en < 1 minuto
- [ ] Envía mensaje desde venta en < 3 clicks
- [ ] Envía mensaje desde deuda en < 3 clicks
- [ ] Ve historial de envíos
- [ ] Reintenta mensaje fallido

---

## FASE 2 (Futuro - No incluido aquí)

Cuando la Fase 1 esté estable:

**Mensajería Masiva (Simple):**
- Seleccionar múltiples clientes con deuda
- Elegir template
- Enviar a todos (uno por uno, con delay)
- Ver progreso simple

**Nota**: Aún sin campañas complejas, sin programación, sin reglas.

---

## Diferencias con Elena

| Aspecto | Elena (Complejo) | Avileo Fase 1 (Simple) |
|---------|------------------|------------------------|
| Campañas | ✅ Complejas con filtros | ❌ No hay |
| Programación | ✅ Automática | ❌ No hay |
| Segmentación | ✅ Reglas complejas | ❌ No hay |
| Envío | 5+ pasos | 2-3 clicks |
| Templates | Variables complejas | 4 variables simples |
| Analytics | Dashboard completo | Lista simple |

**Filosofía**: En Elena hicimos un CRM de mensajería. Aquí hacemos un botón "Enviar WhatsApp".

---

## Pre-requisitos

1. **Inngest**: Ya configurado (usar mismos patrones de Elena)
2. **Evolution SDK**: `@gymspace/evolution` instalado
3. **Sin Redis**: No necesario con Inngest

---

## Commit Strategy

| Wave | Commit |
|------|--------|
| Wave 1 | `feat(whatsapp): schema, evolution service, inngest function` |
| Wave 2 | `feat(whatsapp): settings, templates, send api` |
| Wave 3 | `feat(whatsapp): frontend config, templates, send buttons` |
| Wave 4 | `feat(whatsapp): tests and polish` |

---

## Conclusión

Este plan es **intencionalmente simple**:
- 11 tareas (vs 17 del plan complejo)
- 1 semana (vs 2-3 semanas)
- Flujo simple: Generar → Enviar
- Sin campañas complejas
- Sin programación automática
- Sin filtros elaborados

**Resultado**: Vendedor conecta WhatsApp y envía mensajes en 2-3 clicks. Punto.

¿Listo para ejecutar esta versión simplificada?
