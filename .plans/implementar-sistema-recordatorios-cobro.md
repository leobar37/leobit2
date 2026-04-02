# Plan Técnico: Sistema de Recordatorios de Cobro Automáticos

## Objective

Implementar un sistema de envío automático de recordatorios de pago a clientes con deudas pendientes mediante WhatsApp, integrado con la infraestructura existente de Inngest para procesamiento asíncrono.

## Scope

### In Scope
- API endpoint para enviar recordatorios a clientes seleccionados
- Procesamiento en background mediante Inngest (no Bull MQ - el sistema usa Inngest)
- Integración con plantillas de WhatsApp existentes
- UI en frontend para seleccionar clientes y enviar recordatorios
- Historial de recordatorios enviados
- Rate limiting para evitar spam

### Out of Scope
- Envío automático programado (cron jobs) - solo manual por ahora
- Recordatorios por SMS/email
- Escalamiento automático a cobranza judicial

## Verified Context

### ✅ Sistema de Background Jobs (Inngest)
**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/lib/inngest.ts`:
- Se usa **Inngest** (no Bull MQ)
- Cliente inicializado en `inngest.ts`
- Funciones registradas en `app.ts` mediante `serve({ client: inngest, functions: [...] })`

**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/inngest/whatsapp-functions.ts`:
- Patrón existente: `inngest.createFunction({ id, retries }, { event }, handler)`
- Evento definido con interfaz: `whatsapp/message.send`
- Usa `step.sleep()` y `step.run()` para operaciones
- Manejo de errores con actualización de estado

### ✅ Sistema de WhatsApp
**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/services/infrastructure/evolution.service.ts`:
- Servicio `EvolutionService` con métodos: `sendText()`, `sendImage()`, etc.
- Requiere `instanceName`, `phone`, `message`
- Rate limiting manejado (status 429)

**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/services/repository/whatsapp-message.repository.ts`:
- CRUD completo de mensajes
- Estados: `pendiente`, `enviado`, `fallido`, `entregado`
- Relación con `customerId` y `templateId`

### ✅ Sistema de Plantillas
**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/db/schema/whatsapp-templates.ts`:
- Tabla `whatsapp_templates` con categorías: `cobranza`, `ventas`, `agradecimiento`, `entrega`, `otros`
- Variables permitidas: `{nombre_cliente}`, `{monto}`, `{fecha}`, `{telefono}`, `{productos}`, `{total}`
- Plantilla por defecto: "Recordatorio de Pago" (ya existe en `default-templates.ts`)

### ✅ Gestión de Deudas
**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/services/repository/customer.repository.ts`:
- `getAccountsReceivable()` - lista de clientes con deuda
- `getBalance(customerId)` - detalle de deuda por cliente
- `getTotalAccountsReceivable()` - total general
- Cálculo: ventas crédito - abonos = saldo pendiente

**Verified** en `/Users/leobar37/code/avileo/packages/backend/src/services/business/customer.service.ts`:
- `getAccountsReceivable()` con filtros: `search`, `minBalance`, `limit`, `offset`
- `getBalance(customerId)` - retorna `{ totalSales, totalPayments, balanceDue }`

### ✅ Hooks Frontend
**Verified** en `/Users/leobar37/code/avileo/packages/app/app/hooks/use-customers.ts`:
- `useCustomers()` - lista de clientes
- `usePaginatedCustomers()` - con paginación
- `useCustomer(id)` - detalle individual

**Inferred** - No existe aún:
- `useCustomersWithDebt()` - hook para filtrar solo deudores
- `useSendPaymentReminders()` - mutación para enviar recordatorios

## Assumptions

1. **La plantilla de recordatorio ya existe** - "Recordatorio de Pago" está en `DEFAULT_WHATSAPP_TEMPLATES`
2. **El usuario admin debe poder seleccionar múltiples clientes** y enviar en batch
3. **Rate limiting**: máximo 1 recordatorio por cliente cada 7 días para evitar spam
4. **El envío es manual** (no automático) por decisión de producto - "software de bolsillo" evita automatización intrusiva
5. **Los clientes deben tener teléfono registrado** para poder enviar WhatsApp

## Files Involved

### Backend - Nuevos Archivos
```
packages/backend/src/
├── api/reminders.ts                    # Nuevos endpoints API
├── inngest/reminder-functions.ts       # Funciones de Inngest para procesar envíos
└── services/business/reminder.service.ts # Lógica de negocio de recordatorios
```

### Backend - Archivos Modificados
```
packages/backend/src/
├── app.ts                              # Registrar rutas y funciones de Inngest
├── inngest/index.ts                    # Exportar nuevas funciones (crear si no existe)
└── services/repository/
    └── whatsapp-message.repository.ts  # Posiblemente agregar método específico
```

### Frontend - Nuevos Archivos
```
packages/app/app/
├── hooks/use-payment-reminders.ts      # Hook para enviar recordatorios
└── components/reminders/
    ├── reminder-dialog.tsx             # Modal para seleccionar clientes y enviar
    └── reminder-history.tsx            # Historial de recordatorios enviados
```

### Frontend - Archivos Modificados
```
packages/app/app/
├── routes/_protected.clientes._index.tsx  # Agregar botón "Enviar Recordatorios"
├── routes/_protected.clientes.$id._index.tsx # Agregar botón individual
└── lib/services/customer-service.ts       # Agregar método getCustomersWithDebt
```

## Ordered Execution Steps

### Phase 1: Backend Infrastructure

#### Step 1.1: Crear esquema/types para recordatorios
**File**: Nuevo archivo opcional o extensión de tipos existentes
**Action**: Definir tipos TypeScript para el feature
```typescript
// En services/business/reminder.service.ts o types compartidos
interface SendReminderInput {
  customerIds: string[];
  templateId?: string; // Si no se envía, usa la plantilla por defecto de cobranza
}

interface ReminderJobData {
  customerId: string;
  businessUserId: string;
  businessId: string;
  templateId: string;
  amount: number;
}
```

#### Step 1.2: Crear servicio de recordatorios
**File**: `packages/backend/src/services/business/reminder.service.ts`
**Action**: Implementar lógica de negocio
**Dependencies**: Step 1.1
```typescript
export class ReminderService {
  constructor(
    private customerRepo: CustomerRepository,
    private messageRepo: WhatsAppMessageRepository,
    private templateRepo: WhatsAppTemplateRepository,
    private whatsappSettingsRepo: BusinessUserWhatsAppSettingsRepository
  ) {}

  async validateCanSendReminders(ctx: RequestContext, customerIds: string[]): Promise<ValidationResult>
  async queueReminders(ctx: RequestContext, input: SendReminderInput): Promise<{ queued: number; errors: string[] }>
  async getReminderHistory(ctx: RequestContext, customerId?: string): Promise<ReminderHistoryItem[]>
  async canSendToCustomer(ctx: RequestContext, customerId: string): Promise<{ allowed: boolean; reason?: string }>
}
```

#### Step 1.3: Crear funciones de Inngest para procesar recordatorios
**File**: `packages/backend/src/inngest/reminder-functions.ts`
**Action**: Implementar función de Inngest
**Dependencies**: Step 1.2
```typescript
export interface SendReminderEvent {
  name: "reminder/send";
  data: ReminderJobData;
}

export const sendReminderFunction = inngest.createFunction(
  { id: "send-payment-reminder", retries: 3 },
  { event: "reminder/send" },
  async ({ event, step }) => {
    // 1. Obtener configuración de WhatsApp
    // 2. Obtener datos del cliente
    // 3. Renderizar plantilla con variables
    // 4. Enviar mensaje vía EvolutionService
    // 5. Actualizar log de mensajes
  }
);

export const reminderFunctions = [sendReminderFunction];
```

#### Step 1.4: Crear API routes para recordatorios
**File**: `packages/backend/src/api/reminders.ts`
**Action**: Implementar endpoints
**Dependencies**: Steps 1.2, 1.3
```typescript
// POST /api/reminders/send - Enviar recordatorios a múltiples clientes
// GET /api/reminders/history - Historial de recordatorios enviados
// GET /api/reminders/can-send/:customerId - Verificar si se puede enviar
```

#### Step 1.5: Registrar nuevas rutas y funciones
**File**: `packages/backend/src/app.ts`
**Action**: Agregar imports y usar rutas
**Dependencies**: Steps 1.3, 1.4
```typescript
import { reminderRoutes } from "./api/reminders";
import { reminderFunctions } from "./inngest/reminder-functions";

// Modificar functions array:
const inngestHandler = serve({
  client: inngest,
  functions: [...whatsAppFunctions, ...reminderFunctions],
});

// Agregar rutas:
.use(reminderRoutes)
```

### Phase 2: Frontend Infrastructure

#### Step 2.1: Extender servicio de clientes para filtrar deudores
**File**: `packages/app/app/lib/services/customer-service.ts`
**Action**: Agregar método
**Dependencies**: None
```typescript
async getCustomersWithDebt(filters?: { minBalance?: number; search?: string }): Promise<CustomerWithDebt[]>
```

#### Step 2.2: Crear hook para enviar recordatorios
**File**: `packages/app/app/hooks/use-payment-reminders.ts`
**Action**: Implementar hook con TanStack Query
**Dependencies**: Step 2.1
```typescript
export function useSendPaymentReminders() {
  return useOfflineAwareMutation({
    mutationFn: sendPaymentReminders,
    offlineMessage: "Se requiere conexión a internet para enviar recordatorios",
  });
}

export function useReminderHistory(customerId?: string) {
  return useQuery({...});
}
```

#### Step 2.3: Crear componente de diálogo para enviar recordatorios
**File**: `packages/app/app/components/reminders/reminder-dialog.tsx`
**Action**: Implementar modal con selección múltiple
**Dependencies**: Step 2.2
- Lista de clientes con deuda
- Checkbox para seleccionar múltiples
- Preview del mensaje
- Botón "Enviar Recordatorios"
- Indicador de progreso

#### Step 2.4: Agregar botón en listado de clientes
**File**: `packages/app/app/routes/_protected.clientes._index.tsx`
**Action**: Agregar FAB o botón en header
**Dependencies**: Step 2.3

#### Step 2.5: Agregar botón en detalle de cliente
**File**: `packages/app/app/routes/_protected.clientes.$id._index.tsx`
**Action**: Agregar botón individual
**Dependencies**: Step 2.3

## Risks and Edge Cases

### Risk 1: Rate Limiting de WhatsApp
**Impact**: Evolution API puede bloquear envíos masivos
**Mitigation**: 
- Implementar `step.sleep("5s")` entre envíos en la función de Inngest
- Limitar a 10 recordatorios por batch
- Mostrar advertencia al usuario

### Risk 2: Clientes sin teléfono registrado
**Impact**: No se puede enviar WhatsApp
**Mitigation**:
- Filtrar solo clientes con `phone` no nulo
- Mostrar mensaje: "X clientes no tienen teléfono registrado"

### Risk 3: WhatsApp no conectado
**Impact**: Error al enviar
**Mitigation**:
- Validar estado de conexión antes de permitir envío
- Usar `useOfflineAwareMutation` ya existente

### Risk 4: Spam/Abuso
**Impact**: Usuarios envían demasiados recordatorios
**Mitigation**:
- Limitar a 1 recordatorio por cliente cada 7 días
- Registrar timestamp del último recordatorio
- Mostrar advertencia si se intenta enviar antes del cooldown

### Risk 5: Plantilla no existe
**Impact**: Error si no hay plantilla de cobranza
**Mitigation**:
- Crear plantilla por defecto automáticamente
- Usar `getOrCreateDefaultTemplates` patrón existente

## Validation Strategy

### Backend Tests
1. **Unit test**: `reminder.service.test.ts` - Validar lógica de negocio
2. **Unit test**: `reminder-functions.test.ts` - Mock de Inngest steps
3. **Integration test**: Endpoint `/api/reminders/send` con clientes de prueba

### Frontend Tests
1. **Component test**: `reminder-dialog.test.tsx` - Renderizado y selección
2. **Hook test**: `use-payment-reminders.test.ts` - Mutación y estados
3. **E2E test**: Flujo completo desde clientes hasta envío

### Manual Testing Checklist
- [ ] Enviar recordatorio a 1 cliente con deuda
- [ ] Enviar recordatorios a múltiples clientes (batch)
- [ ] Intentar enviar a cliente sin teléfono (debe filtrar)
- [ ] Intentar enviar 2do recordatorio antes de 7 días (debe bloquear)
- [ ] Verificar que el mensaje se renderiza correctamente con variables
- [ ] Verificar historial de recordatorios
- [ ] Desconectar WhatsApp e intentar enviar (debe mostrar error)

## Open Questions

1. **¿Se necesita un dashboard de "quién me debe" separado?** Actualmente existe `/cuentas-por-cobrar` - ¿expandirlo o crear nuevo?
2. **¿Los recordatorios deben incluir un link de pago?** (Yape/Plin) - No implementado actualmente
3. **¿Se necesita tracking de respuestas?** Detectar cuando el cliente responde al recordatorio
4. **¿Qué pasa si el cliente paga después de recibir recordatorio pero antes de que el vendedor lo vea?** Sincronización de estado
5. **¿Permitir personalizar el mensaje antes de enviar?** O solo usar plantilla predefinida

## Alternative Approaches Considered

### Option A: Bull MQ (Rechazada)
**Rationale**: El sistema ya usa Inngest para jobs. Agregar Bull MQ añade complejidad y otra dependencia.

### Option B: Envío síncrono (Rechazada)
**Rationale**: Si se envían 50 recordatorios, el request tomaría minutos. Inngest permite retornar inmediatamente y procesar en background.

### Option C: Cron jobs automáticos (Rechazada)
**Rationale**: Va contra la filosofía de "software de bolsillo" - los usuarios deben tener control total. Automatizar podría generar spam si no se configura bien.

## Implementation Notes

### Inngest Event Structure
```typescript
// Evento a disparar desde API
await inngest.send({
  name: "reminder/send",
  data: {
    customerId: "uuid",
    businessUserId: "uuid", 
    businessId: "uuid",
    templateId: "uuid",
    amount: 150.50,
    customerName: "María López",
    customerPhone: "+51999999999"
  }
});
```

### Database Considerations
- Reutilizar tabla `whatsapp_messages` - agregar columna opcional `reminderBatchId` si se quiere agrupar
- O crear tabla separada `payment_reminders` si se necesita más metadata específica

### Rate Limiting Implementation
```typescript
// En reminder.service.ts
async canSendToCustomer(ctx, customerId): Promise<boolean> {
  const lastReminder = await this.messageRepo.findLastReminder(ctx, customerId);
  if (!lastReminder) return true;
  
  const daysSinceLastReminder = differenceInDays(new Date(), lastReminder.createdAt);
  return daysSinceLastReminder >= 7;
}
```

## Dependencies Summary

| Step | Depends On | Files to Modify |
|------|------------|-----------------|
| 1.1 | None | New file |
| 1.2 | 1.1 | New file |
| 1.3 | 1.2 | New file |
| 1.4 | 1.2, 1.3 | New file |
| 1.5 | 1.3, 1.4 | `app.ts` |
| 2.1 | None | `customer-service.ts` |
| 2.2 | 2.1 | New file |
| 2.3 | 2.2 | New file |
| 2.4 | 2.3 | `clientes._index.tsx` |
| 2.5 | 2.3 | `clientes.$id._index.tsx` |

## Estimación

| Fase | Tiempo Estimado |
|------|-----------------|
| Backend (Steps 1.1-1.5) | 4-6 horas |
| Frontend (Steps 2.1-2.5) | 6-8 horas |
| Testing + Polish | 2-4 horas |
| **Total** | **12-18 horas** |