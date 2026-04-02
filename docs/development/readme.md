# Avileo - Plan de Desarrollo Incremental

> Guía paso a paso para construir el sistema de gestión de ventas de pollo (offline-first)

---

## 📖 Cómo usar esta guía

Este plan está organizado en **10 fases incrementales**. Cada fase es un módulo independiente que se puede desarrollar y probar por separado.

### Orden recomendado de lectura:

1. **Lee este README** (estás aquí)
2. **Lee `tech.md`** - Conoce las herramientas y tecnologías
3. **Sigue las fases en orden numérico** (01, 02, 03...)
4. **Cada fase tiene su propio README** con instrucciones detalladas

---

## 🎯 Estructura del Plan

```
Avileo-Desarrollo/
├── README.md              <- Estás aquí (guía general)
├── tech.md                <- Herramientas y tecnologías
│
├── 01-autenticacion/      <- Fase 1: Login y seguridad
│   └── README.md
│
├── 02-usuarios/           <- Fase 2: Gestión de usuarios
│   └── README.md
│
├── 03-core-offline/       <- Fase 3: Infraestructura offline
│   └── README.md
│
├── 04-ventas/             <- Fase 4: Registro de ventas
│   └── README.md
│
├── 05-clientes-abonos/    <- Fase 5: Clientes y pagos
│   └── README.md
│
├── 06-calculadora/        <- Fase 6: Calculadora de precios
│   └── README.md
│
├── 07-inventario-distribucion/  <- Fase 7: Stock (opcional)
│   └── README.md
│
├── 08-sync-engine/        <- Fase 8: Motor de sincronización
│   └── README.md
│
├── 09-reportes/           <- Fase 9: Reportes y estadísticas
│   └── README.md
│
└── 10-configuracion/      <- Fase 10: Configuración del sistema
    └── README.md
```

---

## 🚀 Fases del Desarrollo

### Fase 1: Autenticación (01-autenticacion/)
**Duración estimada:** 3-4 días  
**Dependencias:** Ninguna

Construye el sistema de login/logout con JWT. Es la base de todo.

**Entregable:** Pantalla de login funcional que guarda el token.

---

### Fase 2: Usuarios (02-usuarios/)
**Duración estimada:** 4-5 días  
**Dependencias:** Fase 1

CRUD de usuarios. El admin puede crear vendedores.

**Entregable:** Panel de admin para crear/editar usuarios con roles.

---

### Fase 3: Core Offline (03-core-offline/)
**Duración estimada:** 5-7 días  
**Dependencias:** Fase 1, 2

Infraestructura base: IndexedDB, TanStack DB, persistencia local.

**Entregable:** App que guarda datos localmente y funciona sin internet.

---

### Fase 4: Ventas (04-ventas/)
**Duración estimada:** 5-6 días  
**Dependencias:** Fase 3

Registro de ventas al contado y crédito. Con y sin cliente.

**Entregable:** Pantalla de ventas que guarda offline.

---

### Fase 5: Clientes y Abonos (05-clientes-abonos/)
**Duración estimada:** 4-5 días  
**Dependencias:** Fase 3, 4

Gestión de clientes y pagos de deuda (sin compra).

**Entregable:** CRUD de clientes + registro de abonos.

---

### Fase 6: Calculadora (06-calculadora/)
**Duración estimada:** 2-3 días  
**Dependencias:** Ninguna (puede hacerse en paralelo)

Calculadora de precios con resta de tara.

**Entregable:** Calculadora 100% funcional y offline.

---

### Fase 7: Inventario y Distribución (07-inventario-distribucion/)
**Duración estimada:** 4-5 días  
**Dependencias:** Fase 2, 3

Control de stock (opcional) y asignación a vendedores.

**Entregable:** Panel de distribución + control de kilos (si aplica).

---

### Fase 8: Sync Engine (08-sync-engine/)
**Duración estimada:** 5-7 días  
**Dependencias:** Fase 3, 4, 5

Motor de sincronización offline/online.

**Entregable:** Sync automático cuando hay internet, cola de operaciones.

---

### Fase 9: Reportes (09-reportes/)
**Duración estimada:** 4-5 días  
**Dependencias:** Fase 4, 5, 8

Reportes y estadísticas para el admin.

**Entregable:** Dashboard con gráficos y reportes exportables.

---

### Fase 10: Configuración (10-configuracion/)
**Duración estimada:** 3-4 días  
**Dependencias:** Todas las anteriores

Configuración del sistema: modo de operación, precios, etc.

**Entregable:** Panel de configuración flexible.

---

## 📊 Timeline Visual

```
Semana 1:  [01] [02]
Semana 2:  [03] [04]
Semana 3:  [05] [06]
Semana 4:  [07] [08]
Semana 5:  [09] [10]

Total estimado: 5 semanas (25-35 días laborables)
```

---

## ✅ Checklist de Progreso

- [ ] Fase 1: Autenticación
- [ ] Fase 2: Usuarios
- [ ] Fase 3: Core Offline
- [ ] Fase 4: Ventas
- [ ] Fase 5: Clientes y Abonos
- [ ] Fase 6: Calculadora
- [ ] Fase 7: Inventario y Distribución
- [ ] Fase 8: Sync Engine
- [ ] Fase 9: Reportes
- [ ] Fase 10: Configuración

---

## 🎯 MVP Listo cuando...

El MVP está listo después de la **Fase 5** (Clientes y Abonos). Con eso ya puedes:

- ✅ Loguear vendedores
- ✅ Registrar ventas offline
- ✅ Gestionar clientes
- ✅ Registrar pagos de deuda
- ✅ Usar la calculadora

Las fases 7-10 son mejoras y funcionalidades avanzadas.

---

## 📁 Cómo leer cada fase

Cada carpeta de fase contiene un `README.md` con:

1. **Objetivo** - Qué se construye en esta fase
2. **Requisitos** - Qué necesitas saber/hacer antes
3. **Especificación técnica** - Cómo implementarlo
4. **Entregables** - Qué debe funcionar al final
5. **Tests** - Cómo probar que funciona
6. **Notas** - Tips y consideraciones

---

## 🛠️ Antes de empezar

1. Lee `tech.md` para conocer las herramientas
2. Asegúrate de tener el entorno configurado
3. Comienza por la Fase 1 y sigue el orden

---

**¡Empecemos!** → Ve a `tech.md` y luego a `01-autenticacion/`
