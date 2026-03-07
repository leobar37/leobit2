# Plan: Integración WhatsApp para Avileo

## TL;DR

> **Objetivo**: Permitir que cada vendedor vincule su WhatsApp personal para enviar recibos de venta manualmente y gestionar campañas de recordatorio de deudas.
>
> **Tecnología**: Evolution SDK (@gymspace/evolution) con conexión QR
>
> **Deliverables**:
> - Sistema de configuración WhatsApp por vendedor
> - Botón "Enviar por WhatsApp" en detalle de venta
> - Sistema de plantillas configurables con variables
> - Campañas manuales y automáticas de recordatorio de deudas
> - Historial de mensajes con filtros
>
> **Estimated Effort**: Medium (2-3 semanas)
> **Plan Status**: ✅ CORREGIDO - Usa Inngest (como en Elena)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 → T2 → T3 → T7 → T8 → T12 → T14 → F1-F4
> **Background Jobs**: Inngest (NO BullMQ/Redis)

---

## Context

### Original Request
Implementar integración de WhatsApp en Avileo donde cada vendedor pueda:
1. Vincular su WhatsApp personal mediante QR
2. Enviar recibos de venta manualmente (botón en venta)
3. Configurar plantillas con variables dinámicas
4. Gestionar recordatorios de deudas (manuales y automáticos)

### Decisiones Confirmadas con Usuario

| Feature | Decisión | Detalle |
|---------|----------|---------|
| **Ventas** | Manual | Botón "Enviar WhatsApp" en detalle, NO automático |
| **Deudas** | Manual + Automático | Campañas masivas manuales + recordatorios programados |
| **Template** | Configurable + Default | Template editable por vendedor con variables |
| **Pedidos** | Excluir por ahora | Solo ventas y deudas en MVP |

### Arquitectura Validada

**✅ Decisiones de arquitectura:**
1. **Per-vendor config**: FK a `business_users.id` (correcto) - cada vendedor tiene su propia conexión
2. **Background Jobs**: Usar **Inngest** (como en Elena) - ya está en el stack del proyecto
3. **Offline handling**: Cola server-side - WhatsApp requiere internet de todos modos
4. **Rate limiting**: Implementar en el servicio de mensajes (20 msg/min, 300/hora) usando throttling

**⚠️ Risk Areas identificados:**
- Meta rate limits (necesitamos throttling en el servicio)
- QR expiration (30-60 segundos)
- Delivery failures (retry con backoff usando Inngest steps)
- Webhook security (validar origen Evolution)

### Stack Tecnológico

| Componente | Tecnología | Notas |
|------------|-----------|-------|
| WhatsApp SDK | `@gymspace/evolution` | Conexión QR y envío de mensajes |
| Background Jobs | **Inngest** | Como en Elena - step functions y scheduled jobs |
| Rate Limiting | In-memory throttling | 20 msg/min por vendedor |
| Retry Logic | Inngest built-in | Configurable retry con backoff |
| Database | PostgreSQL + Drizzle | Tablas de configuración y logs |

**Pre-requisitos antes de ejecutar Wave 1:**
- [ ] Inngest configurado (siguiendo patrones de Elena)
- [ ] Acceso a paquete `@gymspace/evolution` (verificar autenticación npm)

---

## Work Objectives

### Core Objective
Implementar sistema completo de WhatsApp que permita a cada vendedor enviar mensajes personalizados a clientes mediante Evolution API, con gestión de plantillas y campañas de cobranza.

### Concrete Deliverables

**Backend:**
- [ ] Tablas: `business_user_whatsapp_settings`, `whatsapp_templates`, `whatsapp_message_logs`
- [ ] EvolutionService: Conexión QR, envío de mensajes
- [ ] WhatsAppSettingsService: CRUD configuración
- [ ] WhatsAppTemplateService: Gestión de plantillas
- [ ] WhatsAppMessageService: Envío con Inngest (background jobs)
- [ ] WhatsAppCampaignService: Campañas masivas
- [ ] API endpoints REST para toda la funcionalidad

**Frontend:**
- [ ] Pantalla de configuración WhatsApp (/config/whatsapp)
- [ ] Gestor de plantillas (/config/whatsapp/templates)
- [ ] Botón "Enviar WhatsApp" en detalle de venta
- [ ] Pantalla de campañas de deuda (/cobranza/campanas)
- [ ] Historial de mensajes (/whatsapp/history)

### Definition of Done

**Backend verification:**
```bash
cd packages/backend
bun test  # Todos los tests pasan
bun run build  # Compila sin errores
```

**Frontend verification:**
```bash
cd packages/app
bun run build  # Compila sin errores
```

**Integration verification:**
- Vendedor puede conectar WhatsApp mediante QR
- Enviar recibo desde venta funciona
- Campaña de deuda se ejecuta correctamente
- Mensajes quedan registrados en historial

### Must Have
- ✅ Conexión WhatsApp por QR por vendedor
- ✅ Botón manual "Enviar WhatsApp" en ventas
- ✅ Sistema de plantillas con variables
- ✅ Campañas manuales de recordatorio de deuda
- ✅ Campañas automáticas programadas
- ✅ Historial de mensajes con filtros
- ✅ Rate limiting (20 msg/min)
- ✅ Retry automático (max 3 intentos)

### Must NOT Have (Guardrails)
- ❌ Envío automático al crear venta
- ❌ Chatbot conversacional
- ❌ Respuestas automáticas a mensajes entrantes
- ❌ Notificaciones de pedidos (out of scope MVP)
- ❌ Analíticas avanzadas (delivery rates, etc.)
- ❌ Multimedia (imágenes/videos) en MVP
- ❌ Múltiples templates por tipo en MVP (solo default + custom)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (need to set up Inngest functions)
- **Automated tests**: Tests-after (implementation first, tests after)
- **Framework**: bun test (already configured)

### QA Policy
Every task includes agent-executed QA scenarios. The executing agent verifies each deliverable by running it.

**Evidence saved to:** `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

**Verification methods:**
- **Frontend/UI**: Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) - Send requests, assert status + response
- **Database**: SQL queries - Verify data integrity

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - DB + Core Services):
├── Task 1: Database schema (4 tables) [starts immediately]
├── Task 2: Evolution SDK integration service [parallel with T1]
├── Task 3: Inngest setup + WhatsApp functions [after T2]
└── Task 4: WhatsApp configuration repository [after T1]

Wave 2 (Backend APIs - SEQUENTIAL due to dependencies):
├── Task 5: WhatsApp settings service + API [after T1, T4]
├── Task 6: WhatsApp template service + API [after T1]
├── Task 7: WhatsApp message service + API [after T1, T2, T3, T6]
└── Task 8: WhatsApp campaign service + API [after T1, T7]

Wave 3 (Frontend - MAX PARALLEL after backend ready):
├── Task 9: Frontend config screen (QR connection) [after T5]
├── Task 10: Frontend templates management [after T6]
├── Task 11: Botón "Enviar WhatsApp" en venta [after T6, T7]
├── Task 12: Campañas de deuda UI [after T7, T8]
└── Task 13: Historial de mensajes con filtros [after T7]

Wave 4 (Automation + Polish):
├── Task 14: Scheduled campaigns (cron) [after T8]
├── Task 15: Error handling + retry logic [after T7, T8]
├── Task 16: Integration tests [after all backend]
└── Task 17: UI polish + edge cases [after T9-T13]

Wave FINAL (Verification - PARALLEL):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T3 → T7 → T8 → T12 → T14 → F1-F4
Parallel Speedup: ~50% faster than fully sequential
```

### Dependency Matrix (CORRECTED per Metis review)

- **T1 (Schema)**: — → T4, T5, T6
- **T2 (Evolution)**: — → T3, T7, T8
- **T3 (Inngest)**: T2 → T7, T8
- **T4 (Repo)**: T1 → T5
- **T5 (Settings)**: T1, T4 → T9
- **T6 (Templates)**: T1 → T10, T11
- **T7 (Messages)**: T1, T2, T3, T6 → T8, T11, T12, T13
- **T8 (Campaigns)**: T1, T7 → T12, T14
- **T9 (UI Config)**: T5 → —
- **T10 (UI Templates)**: T6 → —
- **T11 (UI Sale Button)**: T6, T7 → —
- **T12 (UI Campaigns)**: T7, T8 → —
- **T13 (UI History)**: T7 → —
- **T14 (Cron)**: T8 → —
- **T15 (Error Handling)**: T7, T8, T14 → —
- **T16 (Tests)**: All → —
- **T17 (Polish)**: T9-T13 → —

### Agent Dispatch Summary (CORREGIDO - Usa Inngest como Elena)

- **Wave 1**: 4 tasks → `fullstack-backend` + `fullstack-inngest` (Inngest functions setup)
- **Wave 2**: 4 tasks → `fullstack-backend` + `bun-elysia` + `fullstack-inngest`
- **Wave 3**: 5 tasks → `frontend` + `avileo` (project-specific patterns)
- **Wave 4**: 4 tasks → Mixed: `fullstack-backend` + `frontend` + `fullstack-inngest`
- **Wave FINAL**: 4 tasks → `oracle`, `unspecified-high`, `unspecified-high`, `deep`

**Skill Assignments by Task (CORREGIDO):**
- T1: `avileo`, `bun-elysia`
- T2: `bun-elysia`
- T3: `bun-elysia`, `fullstack-inngest` ⬅️ Inngest functions (como en Elena)
- T4: `avileo`, `bun-elysia`
- T5-6: `avileo`, `bun-elysia`
- T7: `avileo`, `bun-elysia`, `fullstack-inngest` ⬅️ Integración con Inngest
- T8: `avileo`, `bun-elysia`, `fullstack-inngest` ⬅️ Inngest para campañas
- T9-13: `frontend`, `avileo`
- T14: `avileo`, `fullstack-inngest` ⬅️ Inngest scheduled functions
- T15-17: As specified in tasks

**Nota importante**: TODAS las tareas de background jobs usan **Inngest** (como en `/Users/leobar37/code/elena`), NO BullMQ/Redis.

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [ ] 1. Database Schema - WhatsApp Tables

  **What to do**:
  - Create 3 new tables in `packages/backend/src/db/schema/`:
    1. `business_user_whatsapp_settings` - Per-vendor WhatsApp config
    2. `whatsapp_templates` - Message templates with variables
    3. `whatsapp_message_logs` - Message history and status
  - Update `schema/index.ts` to export new tables
  - Generate migration with `bun run db:generate`
  
  **Schema details:**
  ```typescript
  // business_user_whatsapp_settings
  - id: uuid PK
  - businessUserId: uuid FK → business_users.id
  - businessId: uuid FK → businesses.id
  - isConnected: boolean default false
  - phoneNumber: varchar(20)
  - instanceName: varchar(100) // Evolution instance name
  - config: jsonb
  - createdAt, updatedAt
  
  // whatsapp_templates
  - id: uuid PK
  - businessUserId: uuid FK
  - businessId: uuid FK
  - name: varchar(100)
  - type: enum('venta', 'deuda', 'general')
  - content: text // template with {variables}
  - variables: jsonb // array of allowed variables
  - isDefault: boolean default false
  - isActive: boolean default true
  
  // whatsapp_campaigns
  - id: uuid PK
  - businessUserId: uuid FK
  - businessId: uuid FK
  - name: varchar(100)
  - type: enum('deuda', 'manual')
  - filters: jsonb // filter criteria
  - templateId: uuid FK → whatsapp_templates.id
  - status: enum('draft', 'scheduled', 'running', 'completed', 'cancelled')
  - scheduledAt: timestamp (nullable)
  - executedAt: timestamp (nullable)
  - stats: jsonb // { sent, failed, total }
  
  // whatsapp_message_logs
  - id: uuid PK
  - businessUserId: uuid FK
  - businessId: uuid FK
  - customerId: uuid FK → customers.id
  - saleId: uuid FK → sales.id (nullable)
  - campaignId: uuid FK → whatsapp_campaigns.id (nullable)
  - templateId: uuid FK → whatsapp_templates.id
  - phoneNumber: varchar(20)
  - messageContent: text // final message sent
  - status: enum('pendiente', 'enviado', 'fallido', 'cola')
  - errorMessage: text (nullable)
  - sentAt: timestamp (nullable)
  - createdAt
  ```

  **Must NOT do**:
  - Don't add foreign key constraints that cascade delete business data
  - Don't create indexes before understanding query patterns

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]
    - `avileo`: Project-specific Drizzle patterns and multi-tenancy
    - `bun-elysia`: Backend architecture conventions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 5, 6, 7, 8
  - **Blocked By**: None

  **References**:
  - `packages/backend/src/db/schema/business-payment-settings.ts` - Pattern for JSONB config
  - `packages/backend/src/db/schema/customers.ts` - FK pattern
  - `packages/backend/src/db/schema/index.ts` - Export pattern

  **Acceptance Criteria**:
  - [ ] Migration generated successfully: `bun run db:generate`
  - [ ] Typescript types exported: `WhatsAppSettings`, `WhatsAppTemplate`, `WhatsAppMessageLog`
  - [ ] Relations defined correctly for all FKs

  **QA Scenarios**:
  ```
  Scenario: Database migration applies cleanly
    Tool: Bash
    Preconditions: Database connection configured
    Steps:
      1. cd packages/backend && bun run db:generate
      2. Verify migration file created in drizzle/
      3. bun run db:migrate (if not production)
    Expected Result: Migration applies without errors
    Evidence: .sisyphus/evidence/task-1-migration.sql
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add database schema for whatsapp settings, templates, and logs`
  - Files: `packages/backend/src/db/schema/whatsapp-*.ts`, `packages/backend/src/db/schema/index.ts`, `drizzle/*.sql`

- [ ] 2. Evolution SDK Integration Service

  **What to do**:
  - Install `@gymspace/evolution` package
  - Create `EvolutionService` in `packages/backend/src/services/infrastructure/evolution.service.ts`
  - Implement methods:
    - `createInstance(instanceName, config)` - Create WhatsApp instance
    - `connectInstance(instanceName)` - Generate QR code
    - `getConnectionState(instanceName)` - Check connection status
    - `logoutInstance(instanceName)` - Disconnect
    - `sendText(instanceName, phone, text)` - Send text message
    - `fetchInstanceInfo(instanceName)` - Get connected phone info
  - Handle errors and rate limits
  - Add environment variables: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

  **Must NOT do**:
  - Don't implement media sending (images/videos) in MVP
  - Don't cache QR codes (they expire in 30-60 seconds)

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7, Task 8
  - **Blocked By**: None

  **References**:
  - `/Users/leobar37/code/elena/packages/backend/src/services/business/evolution.service.ts` - Elena implementation
  - `@gymspace/evolution` npm docs

  **Acceptance Criteria**:
  - [ ] Package installed: `@gymspace/evolution`
  - [ ] Service methods implemented with proper error handling
  - [ ] Environment variables documented in .env.example

  **QA Scenarios**:
  ```
  Scenario: Evolution service initializes correctly
    Tool: Bash (curl to Evolution API)
    Preconditions: EVOLUTION_API_URL and EVOLUTION_API_KEY set
    Steps:
      1. Create test instance: POST /instance/create
      2. Verify instance created
      3. Delete test instance
    Expected Result: API responds with 200 and instance data
    Evidence: .sisyphus/evidence/task-2-evolution-api.json
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add Evolution SDK integration service`
  - Files: `packages/backend/src/services/infrastructure/evolution.service.ts`, `packages/backend/package.json`, `.env.example`

- [ ] 3. Inngest Setup + WhatsApp Functions

  **What to do**:
  - Install `inngest` package (if not already installed)
  - Create Inngest client configuration in `packages/backend/src/lib/inngest.ts`
  - Create WhatsApp Inngest functions in `packages/backend/src/inngest/whatsapp-functions.ts`:
    - `sendWhatsAppMessage` - Function to send single message
    - `sendBulkWhatsAppMessages` - Function for campaign bulk sending
  - Implement rate limiting using Inngest step delays:
    - 20 messages/minute = 1 message every 3 seconds
    - Use `step.sleep("3s")` between messages in bulk operations
  - Configure retry logic using Inngest's built-in retry:
    - 3 attempts with exponential backoff (1min, 5min, 15min)
  - Add webhook handler for Evolution callbacks (validate signature)

  **Inngest Function Example:**
  ```typescript
  export const sendWhatsAppMessage = inngest.createFunction(
    { id: "send-whatsapp-message", retries: 3 },
    { event: "whatsapp/message.send" },
    async ({ event, step }) => {
      const { instanceName, phone, message, businessUserId } = event.data;
      
      // Rate limiting: sleep 3s between messages
      await step.sleep("3s");
      
      // Send message via Evolution
      await step.run("send-to-evolution", async () => {
        return await evolutionService.sendText(instanceName, phone, message);
      });
      
      // Update log status
      await step.run("update-log", async () => {
        await messageLogRepository.updateStatus(businessUserId, "enviado");
      });
    }
  );
  ```

  **Must NOT do**:
  - Don't use BullMQ or external Redis (use Inngest como en Elena)
  - Don't implement custom retry logic (use Inngest's built-in)
  - Don't skip webhook signature validation

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`bun-elysia`, `fullstack-inngest`]
    - `fullstack-inngest`: Para funciones de Inngest y step functions
    - Referencia: `/Users/leobar37/code/elena` - usar mismos patrones

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 2 for EvolutionService)
  - **Parallel Group**: Wave 1 (after T2)
  - **Blocks**: Task 7, Task 8
  - **Blocked By**: Task 2 (needs EvolutionService)

  **References**:
  - `/Users/leobar37/code/elena` - Patrones de Inngest del proyecto Elena
  - `packages/backend/src/inngest/` - Estructura de funciones Inngest
  - Inngest docs: https://www.inngest.com/docs

  **Acceptance Criteria**:
  - [ ] Inngest functions created and registered
  - [ ] Rate limiting implemented via step.sleep
  - [ ] Retry logic using Inngest's built-in retries
  - [ ] Webhook handler validates Evolution signatures

  **QA Scenarios**:
  ```
  Scenario: Inngest function sends message with rate limiting
    Tool: Bash + bun test
    Steps:
      1. Send event "whatsapp/message.send" con 5 mensajes
      2. Verificar que cada mensaje tiene 3s de delay
      3. Verificar que se ejecutan en orden
    Expected Result: Rate limiting funciona (3s entre mensajes)
    Evidence: .sisyphus/evidence/task-3-inngest-rate-limit.log
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add Inngest functions for WhatsApp messaging`
  - Files: `packages/backend/src/inngest/whatsapp-functions.ts`, `packages/backend/src/lib/inngest.ts`

- [ ] 4. WhatsApp Settings Repository

  **What to do**:
  - Create `WhatsAppSettingsRepository` in `packages/backend/src/services/repository/whatsapp-settings.repository.ts`
  - Follow pattern from `payment-method-config.repository.ts`
  - Methods:
    - `findByBusinessUserId(ctx, businessUserId)`
    - `getOrCreate(ctx, businessUserId)` - Returns existing or creates default
    - `update(ctx, businessUserId, config)`
    - `updateConnectionState(ctx, businessUserId, isConnected, phoneNumber)`
  - All methods filter by `ctx.businessId` for multi-tenancy
  - Use `RequestContext` as first parameter (critical pattern)

  **Must NOT do**:
  - Don't skip multi-tenancy filters (MUST use ctx.businessId)
  - Don't use findById without businessId filter

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1-3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 1 (needs schema)

  **References**:
  - `packages/backend/src/services/repository/payment-method-config.repository.ts` - Pattern to follow
  - `packages/backend/src/context/request-context.ts` - RequestContext usage

  **Acceptance Criteria**:
  - [ ] Repository methods implemented following Avileo patterns
  - [ ] All queries filter by businessId
  - [ ] RequestContext is first parameter

  **QA Scenarios**:
  ```
  Scenario: Repository respects multi-tenancy
    Tool: bun test
    Preconditions: Database with test data
    Steps:
      1. Create settings for vendor A in business X
      2. Try to read settings with vendor A in business Y (different ctx)
      3. Verify returns null or creates new (not leaking data)
    Expected Result: No cross-tenant data leakage
    Evidence: .sisyphus/evidence/task-4-repo-tenancy.test.ts
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add WhatsApp settings repository`
  - Files: `packages/backend/src/services/repository/whatsapp-settings.repository.ts`

- [ ] 5. WhatsApp Settings Service + API

  **What to do**:
  - Create `WhatsAppSettingsService` in `packages/backend/src/services/business/whatsapp-settings.service.ts`
  - Methods:
    - `getSettings(ctx)` - Get or create settings for current vendor
    - `updateSettings(ctx, config)` - Update configuration
    - `connectWhatsApp(ctx)` - Initiate QR connection flow
    - `getQRCode(ctx)` - Get QR code for pairing
    - `disconnectWhatsApp(ctx)` - Logout and cleanup
    - `getConnectionStatus(ctx)` - Check if connected
  - Create API routes in `packages/backend/src/api/whatsapp/settings.ts`
  - Mount routes in main router

  **API Endpoints:**
  ```
  GET    /api/whatsapp/settings        - Get current settings
  PUT    /api/whatsapp/settings        - Update settings
  POST   /api/whatsapp/connect         - Start connection (returns QR)
  GET    /api/whatsapp/status          - Get connection status
  POST   /api/whatsapp/disconnect      - Logout
  ```

  **Must NOT do**:
  - Don't expose instanceName or internal Evolution IDs to frontend
  - Don't allow updating settings for other vendors

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9 (UI Config)
  - **Blocked By**: Task 4 (Repository)

  **References**:
  - `packages/backend/src/services/business/payment-method-config.service.ts` - Pattern
  - `packages/backend/src/api/businesses/payment-methods.ts` - API pattern

  **Acceptance Criteria**:
  - [ ] Service methods implemented with Zod validation
  - [ ] API routes working (test with curl)
  - [ ] Proper error handling (NotFoundError, ForbiddenError)

  **QA Scenarios**:
  ```
  Scenario: API endpoints respond correctly
    Tool: Bash (curl)
    Steps:
      1. GET /api/whatsapp/settings → Returns settings or default
      2. PUT /api/whatsapp/settings → Updates successfully
      3. GET /api/whatsapp/status → Returns connection state
    Expected Result: All endpoints return 200 with correct data
    Evidence: .sisyphus/evidence/task-5-api-curls.sh
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add settings service and API endpoints`
  - Files: `packages/backend/src/services/business/whatsapp-settings.service.ts`, `packages/backend/src/api/whatsapp/settings.ts`, `packages/backend/src/index.ts`

- [ ] 6. WhatsApp Template Service + API

  **What to do**:
  - Create `WhatsAppTemplateRepository` and `WhatsAppTemplateService`
  - Methods for templates:
    - `findAll(ctx)` - List templates
    - `findById(ctx, id)` - Get specific template
    - `create(ctx, data)` - Create new template
    - `update(ctx, id, data)` - Update template
    - `delete(ctx, id)` - Delete template (soft or hard)
    - `getDefault(ctx, type)` - Get default template by type
  - Variable validation: Check that all {variables} in template are valid
  - API routes for template CRUD

  **Default Templates (create on first get):**
  ```typescript
  // Deuda template
  "Hola {nombre_cliente}, te recordamos que tienes una deuda pendiente de S/ {monto_deuda_total}. " +
  "Tu última compra fue el {fecha_ultima_compra}. Por favor regulariza tu pago. Gracias!"
  
  // Venta template  
  "Hola {nombre_cliente}, tu compra del {fecha_venta} por S/ {total_venta} ha sido registrada. " +
  "Gracias por tu preferencia!"
  ```

  **Must NOT do**:
  - Don't allow SQL injection in template content (sanitize)
  - Don't allow infinite nesting of variables

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10, Task 11
  - **Blocked By**: Task 1 (Schema)

  **References**:
  - `/Users/leobar37/code/elena/packages/backend/src/services/business/whatsapp-template.service.ts`

  **Acceptance Criteria**:
  - [ ] Template CRUD operations working
  - [ ] Default templates created automatically
  - [ ] Variable validation implemented

  **QA Scenarios**:
  ```
  Scenario: Template variable validation
    Tool: Bash (curl)
    Steps:
      1. POST template with invalid variable {invalid_var}
      2. Verify error response with list of valid variables
      3. POST template with valid variables
      4. Verify created successfully
    Expected Result: Only valid variables allowed
    Evidence: .sisyphus/evidence/task-6-template-validation.json
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add template service and API with variable validation`
  - Files: `packages/backend/src/services/repository/whatsapp-template.repository.ts`, `packages/backend/src/services/business/whatsapp-template.service.ts`, `packages/backend/src/api/whatsapp/templates.ts`

- [ ] 7. WhatsApp Message Service + Inngest Integration

  **What to do**:
  - Create `WhatsAppMessageService` in `packages/backend/src/services/business/whatsapp-message.service.ts`
  - Methods:
    - `sendMessage(ctx, customerId, templateId, variables)` - Send Inngest event
    - `sendBulkMessages(ctx, customerIds[], templateId, variables)` - Send bulk events
    - `getMessageHistory(ctx, filters)` - Get logs with filters
    - `retryFailedMessage(ctx, logId)` - Retry by re-sending Inngest event
  - Integrate with Inngest functions from Task 3
  - Send events to Inngest: `whatsapp/message.send` y `whatsapp/message.bulk`
  - Integrate with EvolutionService from Task 2
  - Update message log status (pendiente → enviado/fallido)
  - Handle phone number formatting (add +51 for Peru)

  **API Endpoints:**
  ```
  POST   /api/whatsapp/send              - Send single message (triggers Inngest)
  POST   /api/whatsapp/send-bulk         - Send bulk messages (for campaigns)
  GET    /api/whatsapp/messages          - Get message history with filters
  POST   /api/whatsapp/messages/:id/retry - Retry failed message
  ```

  **Send Flow:**
  1. Validate vendor has connected WhatsApp
  2. Get template and replace variables
  3. Format and validate phone number
  4. Send event to Inngest: `whatsapp/message.send`
  5. Inngest function processes and calls Evolution API
  6. Update log status based on result

  **Phone Number Validation:**
  - Validate format (Peru: +51 followed by 9 digits)
  - Normalize: Remove spaces, dashes
  - Add +51 prefix if missing
  - Reject invalid numbers (don't send event)

  **Must NOT do**:
  - Don't send messages if vendor is not connected
  - Don't block API response waiting for message delivery
  - Don't send events with invalid phone numbers
  - Don't use BullMQ (usar Inngest como en Elena)

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Tasks 2, 3, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11, Task 12, Task 13
  - **Blocked By**: Tasks 2, 3, 6

  **References**:
  - `/Users/leobar37/code/elena/packages/backend/src/services/business/whatsapp.service.ts`

  **Acceptance Criteria**:
  - [ ] Message queuing works end-to-end
  - [ ] Status updates correctly (pendiente → enviado/fallido)
  - [ ] Phone number formatting (+51)
  - [ ] Rate limiting enforced

  **QA Scenarios**:
  ```
  Scenario: End-to-end message sending
    Tool: Bash (curl + check DB)
    Preconditions: Vendor connected to WhatsApp (mock or real)
    Steps:
      1. POST /api/whatsapp/send with customerId and templateId
      2. Check queue has job
      3. Wait for processor
      4. Check DB log status = 'enviado'
    Expected Result: Message queued, processed, logged
    Evidence: .sisyphus/evidence/task-7-message-flow.log
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add message service with queue integration`
  - Files: `packages/backend/src/services/business/whatsapp-message.service.ts`, `packages/backend/src/api/whatsapp/messages.ts`

- [ ] 8. WhatsApp Campaign Service + API

  **What to do**:
  - Create `WhatsAppCampaignService` for bulk messaging
  - Methods:
    - `createCampaign(ctx, name, filters, templateId)` - Create campaign
    - `executeCampaign(ctx, campaignId)` - Execute immediately
    - `scheduleCampaign(ctx, campaignId, schedule)` - Schedule for later
    - `getCampaigns(ctx)` - List campaigns
    - `getCampaignStats(ctx, campaignId)` - Stats: sent, failed, pending
  - Support filters:
    - By customer tags
    - By debt amount (> X)
    - By last purchase date
    - Manual selection
  - Integration with message service for bulk sending

  **Campaign Entity:**
  - Methods:
    - `createCampaign(ctx, name, filters, templateId)` - Create campaign
    - `executeCampaign(ctx, campaignId)` - Execute immediately (async, queues messages)
    - `scheduleCampaign(ctx, campaignId, schedule)` - Schedule for later
    - `cancelCampaign(ctx, campaignId)` - Cancel scheduled campaign
    - `getCampaigns(ctx)` - List campaigns
    - `getCampaignStats(ctx, campaignId)` - Stats: sent, failed, pending
  - Support filters:
    - By customer tags
    - By debt amount (> X)
    - By last purchase date
    - Manual selection
  - Integration with message service for bulk sending

  **Campaign Status Flow:**
  ```
  draft → scheduled → running → completed
            ↓
        cancelled
  ```

  **Must NOT do**:
  - Don't execute campaigns synchronously (must use queue)
  - Don't allow campaigns without filters (safety)
  - Don't allow cancelling campaigns already running

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`, `fullstack-inngest`]
    - `fullstack-inngest`: Para integración con Inngest functions

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12, Task 14
  - **Blocked By**: Tasks 1, 7

  **References**:
  - `/Users/leobar37/code/elena/docs/tech/13/02b-plan-campanas-segmentacion-servicios.md`

  **Acceptance Criteria**:
  - [ ] Campaign creation with filters
  - [ ] Bulk message queuing
  - [ ] Campaign stats tracking

  **QA Scenarios**:
  ```
  Scenario: Campaign sends to filtered customers
    Tool: Bash (curl)
    Preconditions: Multiple customers with debts in DB
    Steps:
      1. POST campaign with filter: debt > 100
      2. Execute campaign
      3. Verify only customers with debt > 100 get messages
      4. Check stats: total matches filter count
    Expected Result: Filtering works correctly
    Evidence: .sisyphus/evidence/task-8-campaign-filter.json
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add campaign service for bulk messaging`
  - Files: `packages/backend/src/services/business/whatsapp-campaign.service.ts`, `packages/backend/src/api/whatsapp/campaigns.ts`, schema update

- [ ] 9. Frontend: Configuración WhatsApp (QR Connection)

  **What to do**:
  - Create page: `packages/app/app/routes/_protected.config.whatsapp.tsx`
  - Follow pattern from `_protected.config.payment-methods.tsx`
  - Features:
    - Show connection status (connected/disconnected)
    - "Conectar WhatsApp" button → Shows QR code
    - QR code display (polling status every 5 seconds)
    - Show connected phone number when connected
    - "Desconectar" button
    - Connection error handling
  - Create hook: `useWhatsAppSettings()` (TanStack Query)
  - Add link in config menu: `_protected.config._index.tsx`

  **QR Flow UI:**
  1. User clicks "Conectar"
  2. Show loading + text "Generando código QR..."
  3. Display QR code
  4. Poll status every 5s
  5. When connected: Show success + phone number
  6. If timeout (60s): Show "Código expirado, intenta de nuevo"

  **Must NOT do**:
  - Don't store QR code in localStorage (security)
  - Don't auto-refresh page when connected (use state update)

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`, `avileo`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11)
  - **Parallel Group**: Wave 3
  - **Blocks**: —
  - **Blocked By**: Task 5 (API)

  **References**:
  - `packages/app/app/routes/_protected.config.payment-methods.tsx` - UI pattern
  - `packages/app/app/hooks/use-payment-methods-config.ts` - Hook pattern
  - `/Users/leobar37/code/elena/packages/app/app/hooks/use-whatsapp.ts` - QR polling

  **Acceptance Criteria**:
  - [ ] Config page accessible from menu
  - [ ] QR code displays and updates
  - [ ] Connection status updates in real-time
  - [ ] Mobile responsive design

  **QA Scenarios**:
  ```
  Scenario: User connects WhatsApp via QR
    Tool: Playwright
    Steps:
      1. Navigate to /config/whatsapp
      2. Click "Conectar WhatsApp"
      3. Verify QR code appears
      4. (Simulate QR scan or wait for timeout)
      5. Verify status updates
    Expected Result: Full connection flow works
    Evidence: .sisyphus/evidence/task-9-qr-flow.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add whatsapp configuration page with QR connection`
  - Files: `packages/app/app/routes/_protected.config.whatsapp.tsx`, `packages/app/app/hooks/use-whatsapp-settings.ts`, `packages/app/app/routes/_protected.config._index.tsx`

- [ ] 10. Frontend: Gestión de Plantillas

  **What to do**:
  - Create page: `packages/app/app/routes/_protected.config.whatsapp.templates.tsx`
  - Features:
    - List all templates with type badges
    - Create new template button
    - Edit template modal/drawer
    - Delete template with confirmation
    - Template preview with sample data
    - Variable helper (show available variables)
  - Variables available per type:
    - Venta: {nombre_cliente}, {total_venta}, {fecha_venta}, {productos_venta}
    - Deuda: {nombre_cliente}, {monto_deuda_total}, {fecha_ultima_compra}, {dias_mora}

  **Template Editor Features:**
  - Textarea for content
  - Variable buttons (insert at cursor)
  - Live preview with sample data
  - Validation messages (invalid variables)

  **Must NOT do**:
  - Don't allow editing default templates (or mark clearly)
  - Don't allow empty template names

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 11)
  - **Parallel Group**: Wave 3
  - **Blocks**: —
  - **Blocked By**: Task 6 (API)

  **References**:
  - `packages/app/app/routes/_protected.clientes._index.tsx` - List pattern
  - `packages/app/app/routes/_protected.ventas._index.tsx` - Table pattern

  **Acceptance Criteria**:
  - [ ] Template list displays
  - [ ] Create/edit/delete works
  - [ ] Variable buttons insert correctly
  - [ ] Preview shows replaced variables

  **QA Scenarios**:
  ```
  Scenario: Create and preview template
    Tool: Playwright
    Steps:
      1. Navigate to templates page
      2. Click "Nueva Plantilla"
      3. Select type: deuda
      4. Type: "Hola {nombre_cliente}, debes S/ {monto_deuda_total}"
      5. Click variable buttons to insert
      6. Click preview
    Expected Result: Preview shows replaced values
    Evidence: .sisyphus/evidence/task-10-template-editor.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add template management UI`
  - Files: `packages/app/app/routes/_protected.config.whatsapp.templates.tsx`, `packages/app/app/hooks/use-whatsapp-templates.ts`

- [ ] 11. Frontend: Botón "Enviar WhatsApp" en Venta

  **What to do**:
  - Modify: `packages/app/app/routes/_protected.ventas.$id._index.tsx`
  - Add button "Enviar por WhatsApp" in sale detail page
  - Features:
    - Button disabled if vendor not connected
    - Show tooltip: "Conecta tu WhatsApp primero"
    - Click opens modal with:
      - Template selector (dropdown)
      - Message preview (with actual sale data)
      - "Enviar" button
      - Success/error feedback
  - Use customer's phone from sale.customer.phone
  - Show loading state while sending

  **Send Flow:**
  1. User views sale detail
  2. Clicks "Enviar por WhatsApp"
  3. Selects template (default pre-selected)
  4. Sees preview with actual data
  5. Clicks "Enviar"
  6. Shows "Enviando..." → "¡Enviado!" or "Error"

  **Must NOT do**:
  - Don't auto-send without preview
  - Don't allow sending if customer has no phone

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`, `avileo`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 10)
  - **Parallel Group**: Wave 3
  - **Blocks**: —
  - **Blocked By**: Tasks 6, 7 (API)

  **References**:
  - `packages/app/app/routes/_protected.ventas.$id._index.tsx` - Sale detail page

  **Acceptance Criteria**:
  - [ ] Button appears in sale detail
  - [ ] Modal shows template selector + preview
  - [ ] Send triggers API call
  - [ ] Success/error feedback shown

  **QA Scenarios**:
  ```
  Scenario: Send receipt from sale detail
    Tool: Playwright
    Preconditions: Sale exists with customer having phone
    Steps:
      1. Navigate to /ventas/[id]
      2. Click "Enviar por WhatsApp"
      3. Verify modal opens with template selector
      4. Verify preview shows sale data
      5. Click "Enviar"
      6. Verify success message
    Expected Result: Message sent, success shown
    Evidence: .sisyphus/evidence/task-11-sale-whatsapp.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add send whatsapp button to sale detail`
  - Files: `packages/app/app/routes/_protected.ventas.$id._index.tsx`, modal component

- [ ] 12. Frontend: Campañas de Deuda

  **What to do**:
  - Create page: `packages/app/app/routes/_protected.cobranza.campanas.tsx` (or appropriate path)
  - Features:
    - List campaigns with status badges
    - "Nueva Campaña" button
    - Campaign creation modal:
      - Name input
      - Filter builder (debt > X, last purchase > Y days)
      - Template selector
      - Preview customer count
      - Execute now or schedule
    - Campaign detail view with stats
    - Cancel scheduled campaign

  **Filter Builder UI:**
  - Debt amount: "Deuda mayor a S/ [input]"
  - Last purchase: "Última compra hace más de [input] días"
  - Customer tags: Multi-select
  - Preview count: "[N] clientes coinciden"

  **Must NOT do**:
  - Don't allow executing campaign without filters
  - Don't show other vendors' campaigns

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9-11)
  - **Parallel Group**: Wave 3
  - **Blocks**: —
  - **Blocked By**: Tasks 7, 8 (API)

  **References**:
  - `packages/app/app/routes/_protected.clientes._index.tsx` - Filters pattern

  **Acceptance Criteria**:
  - [ ] Campaign list page
  - [ ] Campaign creation with filters
  - [ ] Execute now and schedule options
  - [ ] Stats display

  **QA Scenarios**:
  ```
  Scenario: Create and execute debt campaign
    Tool: Playwright
    Preconditions: Multiple customers with debts
    Steps:
      1. Navigate to campaigns page
      2. Click "Nueva Campaña"
      3. Set filter: Deuda > 50
      4. Select template
      5. Verify preview shows correct count
      6. Click "Ejecutar Ahora"
      7. Verify campaign status changes to running
    Expected Result: Campaign created and executed
    Evidence: .sisyphus/evidence/task-12-campaign-creation.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add debt campaigns UI`
  - Files: `packages/app/app/routes/_protected.cobranza.campanas.tsx`, `packages/app/app/hooks/use-whatsapp-campaigns.ts`

- [ ] 13. Frontend: Historial de Mensajes con Filtros

  **What to do**:
  - Create page: `packages/app/app/routes/_protected.whatsapp.historial.tsx`
  - Features:
    - Message list with:
      - Customer name
      - Phone number
      - Template name
      - Status (badge: pendiente/enviado/fallido)
      - Sent date
      - Error message (if failed)
    - Filters:
      - Status dropdown
      - Customer search
      - Date range
    - Pagination
    - Retry button for failed messages

  **Must NOT do**:
  - Don't show message content preview (privacy)
  - Don't allow editing sent messages

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9-12)
  - **Parallel Group**: Wave 3
  - **Blocks**: —
  - **Blocked By**: Task 7 (API)

  **References**:
  - `packages/app/app/routes/_protected.clientes._index.tsx` - Table + filters pattern

  **Acceptance Criteria**:
  - [ ] Message history list
  - [ ] Filters work correctly
  - [ ] Pagination
  - [ ] Retry failed messages

  **QA Scenarios**:
  ```
  Scenario: Filter and retry messages
    Tool: Playwright
    Preconditions: Messages with various statuses in DB
    Steps:
      1. Navigate to history page
      2. Filter by status: fallido
      3. Verify only failed messages show
      4. Click retry on one message
      5. Verify status changes to pendiente
    Expected Result: Filtering and retry work
    Evidence: .sisyphus/evidence/task-13-message-history.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add message history with filters`
  - Files: `packages/app/app/routes/_protected.whatsapp.historial.tsx`, `packages/app/app/hooks/use-whatsapp-messages.ts`

- [ ] 14. Scheduled Campaigns (Inngest Scheduled Functions)

  **What to do**:
  - Create Inngest scheduled function in `packages/backend/src/inngest/whatsapp-functions.ts`:
    - `checkScheduledCampaigns` - Runs every hour to check for campaigns to execute
  - When `scheduledAt <= now()` and status = 'scheduled':
    - Update status to 'running'
    - Execute campaign (send events to Inngest for bulk messaging)
  - Add manual trigger for testing: `POST /api/whatsapp/campaigns/:id/execute`

  **Implementation:**
  ```typescript
  // Inngest scheduled function - runs every hour
  export const checkScheduledCampaigns = inngest.createFunction(
    { id: "check-scheduled-campaigns" },
    { cron: "0 * * * *" },  // Every hour
    async ({ step }) => {
      const campaigns = await step.run("fetch-due-campaigns", async () => {
        return await campaignService.getScheduledDue();
      });
      
      for (const campaign of campaigns) {
        await step.run(`execute-campaign-${campaign.id}`, async () => {
          await campaignService.execute(campaign.id);
        });
      }
    }
  );
  ```

  **Must NOT do**:
  - Don't use node-cron (usar Inngest scheduled functions como en Elena)
  - Don't use setTimeout for scheduling (not reliable)
  - Don't allow scheduling in the past

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `fullstack-inngest`]
    - `fullstack-inngest`: Para scheduled functions
    - Referencia: `/Users/leobar37/code/elena` - usar mismos patrones

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: —
  - **Blocked By**: Task 8 (Campaign service)

  **Acceptance Criteria**:
  - [ ] Inngest scheduled function created (runs every hour)
  - [ ] Manual trigger endpoint for testing
  - [ ] Campaigns execute at scheduled time
  - [ ] Status updates correctly

  **QA Scenarios**:
  ```
  Scenario: Scheduled campaign auto-executes via Inngest
    Tool: Bash (curl + verificar Inngest dashboard)
    Steps:
      1. Create campaign scheduled for 1 minute from now
      2. Trigger manual check or wait for scheduled run
      3. Verificar en Inngest dashboard que la función ejecutó
      4. Verify campaign status changes to 'completed'
      5. Verify messages were sent
    Expected Result: Campaign executed via Inngest scheduled function
    Evidence: .sisyphus/evidence/task-14-inngest-scheduled.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add Inngest scheduled function for campaigns`
  - Files: `packages/backend/src/inngest/whatsapp-functions.ts`

- [ ] 15. Error Handling + Retry Logic

  **What to do**:
  - Improve error handling in all services:
    - Evolution API errors (rate limit, invalid number, etc.)
    - Database errors
    - Queue errors
  - Implement retry logic for failed messages:
    - Max 3 retries with exponential backoff
    - Different strategies per error type:
      - Rate limit: Wait 1 minute, retry
      - Invalid number: Fail immediately (no retry)
      - Network error: Retry with backoff
  - Add error logging and alerts
  - Update message log with detailed error info

  **Error Types to Handle:**
  ```typescript
  enum WhatsAppErrorType {
    RATE_LIMIT,      // Retry after 1min
    INVALID_NUMBER,  // No retry
    NOT_CONNECTED,   // No retry until reconnected
    NETWORK_ERROR,   // Retry with backoff
    UNKNOWN          // Retry once
  }
  ```

  **Must NOT do**:
  - Don't retry invalid numbers (waste of resources)
  - Don't expose internal error details to frontend

  **Recommended Agent Profile**:
  - **Category**: `fullstack-backend`
  - **Skills**: [`avileo`, `bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: —
  - **Blocked By**: Tasks 2, 7

  **Acceptance Criteria**:
  - [ ] Error classification implemented
  - [ ] Retry logic with backoff
  - [ ] Failed messages logged with detail

  **QA Scenarios**:
  ```
  Scenario: Retry logic with different errors
    Tool: Bash (mock errors)
    Steps:
      1. Trigger rate limit error
      2. Verify retry scheduled after 1min
      3. Trigger invalid number error
      4. Verify no retry, status = failed
    Expected Result: Correct retry behavior per error type
    Evidence: .sisyphus/evidence/task-15-error-handling.log
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add comprehensive error handling and retry logic`
  - Files: Error handling updates in services

- [ ] 16. Integration Tests

  **What to do**:
  - Create integration tests for WhatsApp flow:
    - Connect WhatsApp (mock Evolution API)
    - Send message
    - Create and execute campaign
    - Retry failed message
  - Use Vitest (already configured)
  - Mock Evolution SDK calls
  - Test database operations
  - Test queue processing

  **Test Coverage:**
  - Settings CRUD
  - Template CRUD
  - Message sending flow
  - Campaign execution
  - Error scenarios

  **Must NOT do**:
  - Don't test with real WhatsApp (mock only)
  - Don't skip testing error cases

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`avileo`, `elena-testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: —
  - **Blocked By**: Tasks 5-8, 14-15

  **References**:
  - `packages/app/e2e/` - E2E test patterns

  **Acceptance Criteria**:
  - [ ] Integration tests written
  - [ ] Tests pass: `bun test`
  - [ ] >80% coverage for WhatsApp services

  **QA Scenarios**:
  ```
  Scenario: Run integration tests
    Tool: Bash
    Steps:
      1. cd packages/backend
      2. bun test whatsapp/
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-16-test-results.txt
  ```

  **Commit**: YES
  - Message: `test(whatsapp): add integration tests`
  - Files: `packages/backend/src/__tests__/whatsapp/*.test.ts`

- [ ] 17. UI Polish + Edge Cases

  **What to do**:
  - Handle edge cases in UI:
    - Empty states (no templates, no messages, no campaigns)
    - Loading states
    - Error states (API errors, network errors)
    - Mobile responsiveness
    - Accessibility improvements
  - Add loading skeletons
  - Add error boundaries
  - Toast notifications for success/error
  - Form validation messages
  - Confirm dialogs for destructive actions

  **Polish Checklist:**
  - [ ] Empty state illustrations
  - [ ] Loading spinners/skeletons
  - [ ] Error messages in Spanish
  - [ ] Mobile tested (320px-428px)
  - [ ] Keyboard navigation works
  - [ ] Form validation messages

  **Must NOT do**:
  - Don't skip mobile testing
  - Don't use generic error messages

  **Recommended Agent Profile**:
  - **Category**: `frontend`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: —
  - **Blocked By**: Tasks 9-13

  **Acceptance Criteria**:
  - [ ] All empty states handled
  - [ ] Mobile responsive verified
  - [ ] Error states implemented

  **QA Scenarios**:
  ```
  Scenario: Test empty and error states
    Tool: Playwright
    Steps:
      1. Navigate to templates page with no templates
      2. Verify empty state shows
      3. Trigger API error
      4. Verify error message shows
      4. Test on mobile viewport (375px)
    Expected Result: All states handled gracefully
    Evidence: .sisyphus/evidence/task-17-polish-states.png
  ```

  **Commit**: YES
  - Message: `feat(whatsapp): add UI polish and edge case handling`
  - Files: Various UI components

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT` (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message Pattern | Files |
|------|------------------------|-------|
| Wave 1 | `feat(whatsapp): database schema and evolution service` | Schema, services/setup |
| Wave 2 | `feat(whatsapp): api endpoints for settings, templates, messages` | API routes |
| Wave 3 | `feat(whatsapp): frontend config, templates, send button` | Frontend routes |
| Wave 4 | `feat(whatsapp): campaigns, scheduling, polish` | Campaigns, cron |
| Wave FINAL | `chore(whatsapp): qa fixes and final verification` | Bug fixes |

---

## Success Criteria

### Verification Commands

**Backend compilation:**
```bash
cd packages/backend
bun run build
# Expected: Build successful, no TypeScript errors
```

**Frontend compilation:**
```bash
cd packages/app
bun run build
# Expected: Build successful, no errors
```

**Database validation:**
```bash
cd packages/backend
bun run db:push
# Expected: Schema applied successfully
```

### Final Checklist
- [ ] Vendedor puede conectar WhatsApp vía QR
- [ ] Vendedor puede enviar recibo desde venta
- [ ] Template de deuda configurable funciona
- [ ] Campaña masiva manual envía a múltiples clientes
- [ ] Campaña automática programada se ejecuta
- [ ] Historial muestra mensajes con filtros
- [ ] Rate limiting funciona (max 20 msg/min)
- [ ] Retry automático en fallos (max 3 intentos)
- [ ] NO hay envío automático en creación de venta
- [ ] NO hay chatbot conversacional
