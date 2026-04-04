# Requirements: Onboarding Simplificado (3-Paso)

## Overview
Implementar un flujo de onboarding simplificado que reduzca los 5 pasos originales a 3 pasos esenciales, eliminando la selección de modo operativo (el sistema usará "modo libre" por defecto) y agregando un checklist de bienvenida en el dashboard.

---

## Functional Requirements

### FR-001: Registro de Usuario
**Description:** Permitir a nuevos usuarios crear una cuenta con email y contraseña.

**Acceptance Criteria:**
- Ruta `/register` accesible públicamente
- Formulario con: nombre, email, contraseña (mínimo 8 caracteres)
- Validación con Zod usando `registerSchema` existente
- Integración con `useAuth().register()` que usa Better Auth
- Mensaje de error claro si el email ya existe
- Redirección automática al siguiente paso tras registro exitoso

**Trace:** T-001

---

### FR-002: Simplificación de Creación de Negocio
**Description:** Simplificar el formulario de creación de negocio para que solo el nombre sea obligatorio.

**Acceptance Criteria:**
- Campo "Nombre del negocio" es obligatorio (mínimo 2 caracteres)
- Campos RUC, dirección, teléfono, email son opcionales y colapsados
- Validación actualizada en `createBusinessSchema`
- Layout centrado y minimalista (como en el wireframe)
- Mostrar "Paso 2 de 3" para contexto

**Trace:** T-002

---

### FR-003: Selección de Datos Iniciales
**Description:** Permitir al usuario elegir entre cargar datos de ejemplo o empezar con negocio vacío.

**Acceptance Criteria:**
- Página `/onboarding/data` (ruta protegida)
- Dos opciones visuales claras:
  - "Cargar datos de ejemplo" (productos típicos de pollería)
  - "Empezar vacío" (sin productos ni clientes)
- Descripción breve de cada opción
- Botón "Continuar" que redirige al dashboard

**Trace:** T-003

---

### FR-004: Redirección Automática Post-Login
**Description:** Detectar usuarios sin negocio y redirigirlos automáticamente a crear uno.

**Acceptance Criteria:**
- Después de login/register, verificar si el usuario tiene business asociado
- Si no tiene business: redirigir a `/business/create`
- Si tiene business: redirigir a `/sync` (flujo actual)
- No lanzar error si falta business, manejarlo graceful

**Trace:** T-004

---

### FR-005: Checklist de Bienvenida en Dashboard
**Description:** Mostrar un checklist de 3 items en el dashboard para guiar al usuario a su primera venta.

**Acceptance Criteria:**
- Componente visible solo cuando hay items pendientes
- 3 items:
  1. Negocio creado (siempre marcado como completado)
  2. Agregar primer producto (se completa cuando products.length > 0)
  3. Registrar primera venta (se completa cuando sales.length > 0)
- Barra de progreso visual (1/3, 2/3, 3/3)
- CTA buttons: "Hacer ahora" / "Empezar" que navegan a las páginas correspondientes
- Puede cerrarse (dismiss) y no vuelve a aparecer (guardar en localStorage)

**Trace:** T-005

---

### FR-006: Backend - Endpoint de Seed Demo
**Description:** Crear endpoint para sembrar datos de ejemplo en un negocio nuevo.

**Acceptance Criteria:**
- Endpoint `POST /businesses/seed-demo` (protegido, admin only)
- Crea productos típicos de pollería:
  - Pollo Entero
  - 1/2 Pollo
  - 1/4 Pollo
  - Pierna (Unidad)
- Precios sugeridos realistas
- No duplicar productos si ya existen
- Retorna lista de productos creados

**Trace:** T-006

---

### FR-007: Flow de Invitación → Registro
**Description:** Mejorar la experiencia cuando un usuario llega desde una invitación.

**Acceptance Criteria:**
- Detectar query param `?token=` en `/register`
- Validar token con `GET /public/invitations/:token`
- Mostrar mensaje: "Te unirás al negocio [Nombre] al finalizar"
- Después de registro exitoso, auto-aceptar invitación
- Redirigir al dashboard del negocio invitado (no crear nuevo business)

**Trace:** T-007

---

## Non-Functional Requirements

### NFR-001: Performance
- Registro debe completarse en < 3 segundos
- Seed demo debe ejecutarse en < 5 segundos (async, no bloquear UI)

### NFR-002: UX/UI Consistency
- Usar componentes existentes de shadcn/ui
- Colores naranja (#f97316) para CTAs primarios
- Layout mobile-first (320px+)
- Animaciones suaves en transiciones

### NFR-003: Accessibility
- Formularios deben ser navegables por teclado
- Labels asociados a inputs
- Contraste suficiente para texto

### NFR-004: Error Handling
- Errores de API deben mostrar mensajes en español
- Estados de loading claros (spinners, disabled buttons)
- Retry automático para errores de red (hasta 3 intentos)

---

## Out of Scope
- Modo operativo seleccionable (eliminado por simplificación)
- Tutorial interactivo paso a paso (se usará sistema existente de ayuda)
- Onboarding para vendedores invitados (flujo separado)
- Importación de datos desde CSV/Excel
- Personalización de temas/colores en onboarding
