# Decision Log: Onboarding Simplificado

## ADR-001: Modo libre por defecto
**Date:** 2026-01-15
**Status:** Accepted

### Context
El wireframe original incluía un paso de selección de "modo operativo" con 4 opciones: inventario propio, sin inventario, pedidos primero, mixto.

### Decision
Eliminar el paso de selección de modo. El sistema usará "modo libre" por defecto (usarDistribucion=false, controlKilos=false).

### Rationale
1. Simplifica el onboarding de 5 pasos a 3
2. Los usuarios pueden cambiar configuración en Settings después
3. Menor fricción = mayor conversión
4. El inventario simplificado ya no requiere configuración compleja

### Consequences
- ✅ Onboarding más rápido
- ✅ Menos decisiones para el usuario
- ⚠️ Usuarios avanzados deben buscar configuración manualmente

---

## ADR-002: Checklist calculado vs persistido
**Date:** 2026-01-15
**Status:** Accepted

### Context
El estado del checklist (1/3, 2/3, 3/3) puede calcularse en tiempo real o guardarse en base de datos.

### Decision
Calcular estado en tiempo real desde datos (products.length, sales.length).

### Rationale
1. Siempre actualizado sin necesidad de sincronización
2. No requiere schema changes en backend
3. Funciona offline
4. Solo persistir el "dismiss" en localStorage

### Consequences
- ✅ Siempre consistente con datos reales
- ✅ Menos complejidad
- ⚠️ Requiere queries adicionales (products, sales)

---

## ADR-003: Seed demo síncrono vs asíncrono
**Date:** 2026-01-15
**Status:** Accepted

### Context
El endpoint de seed demo puede ejecutarse síncrono (esperar respuesta) o asíncrono (background job).

### Decision
Ejecución síncrona, esperar respuesta antes de redirigir.

### Rationale
1. Son solo 5 productos, muy rápido (< 1s)
2. Usuario necesita ver confirmación antes de continuar
3. Menor complejidad sin jobs

### Consequences
- ✅ Simplicidad de implementación
- ✅ UX clara (esperar → continuar)
- ⚠️ Si crece a muchos datos, considerar async

---

## ADR-004: Better Auth vs Custom Registration
**Date:** 2026-01-15
**Status:** Accepted

### Context
Podemos usar Better Auth directamente o crear un endpoint de registro custom.

### Decision
Usar Better Auth (authClient.signUp.email) directamente desde frontend.

### Rationale
1. Ya está configurado y funcionando
2. No requiere backend changes
3. Menos código propio que mantener
4. JWT sessions funcionan out-of-the-box

### Consequences
- ✅ Menos código
- ✅ Features de Better Auth (reset password, etc.)
- ⚠️ Menos control sobre validaciones custom

---

## ADR-005: Single page vs Multi-step wizard
**Date:** 2026-01-15
**Status:** Accepted

### Context
El onboarding puede ser un wizard single-page o múltiples páginas separadas.

### Decision
Múltiples páginas separadas: /register → /business/create → /onboarding/data

### Rationale
1. Permite deep linking (compartir /register directamente)
2. Usuario puede usar back button del navegador
3. Menos JavaScript a cargar por página
4. Mejor para analytics (track por URL)

### Consequences
- ✅ URLs limpias y compartibles
- ✅ Back button funciona
- ⚠️ Transiciones menos "suaves" que wizard SPA

---

## Open Questions

### Q1: ¿Agregar cliente "De ejemplo" en seed?
**Status:** Pending decision
**Options:**
- Sí: Más completo, puede crear ventas de ejemplo
- No: Menos datos fake, usuario crea clientes reales

### Q2: ¿Tutorial interactivo en dashboard?
**Status:** Deferred
**Note:** Por ahora solo checklist. Considerar tour interactivo (react-joyride) en v2.

### Q3: ¿Onboarding diferente para vendedores invitados?
**Status:** Accepted - Sí
**Note:** Vendedores que aceptan invitación no crean negocio, van directo a dashboard.
