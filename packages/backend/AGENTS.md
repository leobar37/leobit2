# Avileo Backend - Agent Rules

## RequestContext Pattern - REGLAS CRÍTICAS

### 1. Primer Parámetro SIEMPRE
**TODAS** las funciones de Repository y Service reciben `ctx` como **primer parámetro**.

```typescript
// ✅ CORRECTO
async findById(ctx: RequestContext, id: string)
async create(ctx: RequestContext, data: CreateInput)
async update(ctx: RequestContext, id: string, data: UpdateInput)

// ❌ INCORRECTO
async findById(id: string, ctx: RequestContext)
async create(data: CreateInput, ctx: RequestContext)
```

### 2. Caché en Memoria - Sin Sobrecarga
El `RequestContext` se construye **una vez por request** y se cachea en memoria:

```typescript
// Plugin de contexto - construcción única
export const contextPlugin = new Elysia({ name: "context" })
  .resolve({ as: "scoped" }, async ({ request }) => {
    // Se ejecuta UNA VEZ por request
    const ctx = await RequestContext.fromAuth(session);
    return { ctx }; // Cacheado para toda la cadena de handlers
  });
```

**NO** recargar datos en cada llamada a repository/service.

### 3. Multi-Tenancy - Filtrado Obligatorio
TODAS las queries deben incluir `businessId`:

```typescript
// ✅ CORRECTO - Siempre filtrar por tenant
.where(and(
  eq(items.id, id),
  eq(items.businessId, ctx.businessId)  // REQUERIDO
))

// ❌ INCORRECTO - Falta filtro de tenant
.where(eq(items.id, id))
```

### 4. Inyección de Dependencias
Usar **SINGLE decorate()** - Múltiples decorate causan hang en Elysia:

```typescript
// ✅ CORRECTO - Una sola llamada
.decorate(() => ({
  businessRepo: new BusinessRepository(),
  businessService: new BusinessService(businessRepo),
}))

// ❌ INCORRECTO - Múltiples decorate
.decorate("businessRepo", new BusinessRepository())
.decorate("businessService", new BusinessService()) // NO HACER
```

### 5. Jerarquía de Errores
Services lanzan excepciones específicas:

```typescript
throw new NotFoundError("Business");
throw new ForbiddenError("No tiene permisos para editar");
throw new ValidationError("El nombre es requerido");
```

### 6. Respuestas HTTP Consistentes
Todas las respuestas usan formato estándar:

```typescript
// Success
return { success: true, data: business };

// Error (lanzado como excepción, capturado por plugin)
throw new NotFoundError("Business");
```

## Estructura de Carpetas

```
src/
├── context/          # RequestContext class
├── errors/           # Excepciones HTTP
├── plugins/          # DI, context, error-handler
├── middleware/       # Auth guards
├── services/
│   ├── repository/   # Acceso a datos (con ctx)
│   └── business/     # Lógica de negocio (con ctx)
└── api/              # Rutas Elysia
```

## Stack Tecnológico

- **Framework**: ElysiaJS
- **Auth**: Better Auth
- **ORM**: Drizzle ORM
- **DB**: PostgreSQL (Neon)
- **Runtime**: Bun
