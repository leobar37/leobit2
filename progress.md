# Avileo - Progress Tracker

## Estado Actual

### Módulo 1: Autenticación 
**Estado:**  **Completado**
**Fecha:** Feb 11, 2026

#### Backend
-  **Better Auth setup** - Configuración con Drizzle ORM + PostgreSQL
-  **API de autenticación** - Endpoints: `/auth/*` (login, register, logout, me)
-  **Middleware de protección** - `requireAuth` para rutas privadas
-  **Sesiones JWT** - 7 días de expiración, cookies seguras

#### Frontend
-  **Páginas de auth** - Login y registro con validación
-  **Hook `useAuth`** - Manejo de sesión con Better Auth client
-  **Layout protegido** - `_protected.tsx` con redirección automática
-  **Dashboard** - Interfaz mobile-first con navegación inferior

#### UI/UX
-  **Tema minimalista** - Paleta cálida (naranja/ámbar), bordes suaves redondeados
-  **Componentes de formulario** - Inputs, passwords, validación con Zod
-  **Sistema de modales** - Jotai + shadcn/ui (Sheet, Dialog)
-  **Diseño responsive** - Mobile-first, navegación tipo app móvil

#### Tech Stack Agregado
- `better-auth` - Autenticación
- `react-hook-form` + `zod` - Formularios
- `shadcn/ui` - Componentes UI
- `jotai` - Estado para modales
- `tailwindcss-animate` - Animaciones

---

## Próximos Pasos (Sugeridos)

### Módulo 2: Perfil de Usuario 
- [ ] Completar datos de perfil (DNI, teléfono)
- [ ] Subir foto de avatar
- [ ] Editar información personal

### Módulo 3: Gestión de Negocio 
- [ ] Crear/configurar negocio
- [ ] Invitar vendedores
- [ ] Configurar punto de venta

### Módulo 4: Core Offline 
- [ ] Setup TanStack DB
- [ ] IndexedDB persistencia
- [ ] Sync engine

---

## Notas
- Las tablas de Better Auth se crean automáticamente al primer request
- Sesión persistente por 7 días
- Diseño optimizado para móviles (vendedores en campo)
