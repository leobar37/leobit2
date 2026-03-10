---
description: Genera casos de prueba manuales simples y claros para probar
  funcionalidades web. Use when you need step-by-step testing instructions for
  manual QA, or when you want testing scenarios copied to clipboard for testers
  without technical knowledge.
---

# Generar Casos de Prueba Manuales

Genera instrucciones paso a paso para probar funcionalidades web, escritas en lenguaje simple para testers manuales.

## Input del Usuario

El usuario debe proporcionar:
- **Nombre de la funcionalidad** (ej: "Login", "Crear Venta", "Sincronización offline")

## Proceso

### 1. Análisis del Flujo

Busca e identifica:
- **Pantallas/Páginas** involucradas
- **Campos de formulario** (inputs, botones, selects)
- **Mensajes de error** que deberían aparecer
- **Estados de carga** (spinners, disabled)
- **Resultados exitosos** (redirecciones, mensajes de éxito)

### 2. Estructura del Output

Genera el siguiente formato simple:

```markdown
# Casos de Prueba: [Nombre Funcionalidad]

## 📋 Información General

**Funcionalidad:** [Qué hace en una oración]
**Pantalla:** [URL o nombre de la página]
**Preparación previa:** [Qué necesitas tener listo antes de empezar]

---

## ✅ Caso 1: [Nombre - Escenario Exitoso]

### Precondiciones
- [ ] Tener [dato/listado] preparado
- [ ] Estar en la pantalla [nombre]

### Pasos a seguir
1. [Acción simple, ej: "Escribir 'usuario@test.com' en el campo Email"]
2. [Siguiente acción, ej: "Escribir 'password123' en el campo Contraseña"]
3. [Acción final, ej: "Hacer click en el botón 'Iniciar sesión'"]

### Resultado esperado
- [ ] [Qué debería pasar, ej: "La página cambia al Dashboard"]
- [ ] [Otro resultado, ej: "Aparece el nombre del usuario en la esquina superior"]

---

## ❌ Caso 2: [Nombre - Escenario de Error]

### Precondiciones
- [ ] Estar en la pantalla [nombre]

### Pasos a seguir
1. [Acción que provoca el error, ej: "Escribir 'email-invalido' en el campo Email"]
2. [Siguiente acción, ej: "Hacer click fuera del campo"]

### Resultado esperado
- [ ] [Qué error debería mostrarse, ej: "Aparece mensaje rojo: 'Email no válido'"]
- [ ] [Qué pasa con la UI, ej: "El botón 'Iniciar sesión' está gris (no se puede clickar)"]

---

## ⚠️ Caso 3: [Nombre - Caso Especial/Límite]

### Precondiciones
- [ ] [Requisitos específicos]

### Pasos a seguir
1. [Acción con valor especial, ej: "Escribir una contraseña de 1 carácter"]
2. [Siguiente paso]

### Resultado esperado
- [ ] [Validación específica del caso especial]

---

## 📱 Caso 4: Validación Visual/Responsive (si aplica)

### Precondiciones
- [ ] Abrir la página en [móvil/tablet/escritorio]

### Pasos a seguir
1. [Acción]
2. [Observar elemento específico]

### Resultado esperado
- [ ] [Cómo debería verse, ej: "El botón ocupa todo el ancho de la pantalla en móvil"]

---

## 📝 Datos de Prueba

**Datos que funcionan (para Caso 1):**
- Campo X: [valor válido]
- Campo Y: [valor válido]

**Datos que NO funcionan (para Caso 2):**
- Campo X: [valor inválido]
- Campo Y: [valor inválido]

**Datos de límite (para Caso 3):**
- Campo X: [valor mínimo/máximo]

---

## 🔍 Checklist de Elementos a Verificar

| Elemento | Dónde encontrarlo | Cómo identificarlo |
|----------|--------------------|--------------------|
| [Nombre del campo/botón] | [Ubicación en pantalla] | [Texto o apariencia] |
| [Mensaje de error] | [Dónde aparece] | [Texto exacto o color] |

---

*Generado para: [Nombre Funcionalidad]*
*Fecha: [Fecha actual]*
```

### 3. Copiar al Portapapeles

```bash
echo '[contenido generado]' | pbcopy
```

## Ejemplo Real: Login

```markdown
# Casos de Prueba: Login

## 📋 Información General

**Funcionalidad:** Permite a usuarios registrados acceder al sistema con email y contraseña
**Pantalla:** `/login` (Página de Inicio de Sesión)
**Preparación previa:** 
- [ ] Tener un usuario registrado: `test@example.com` / `password123`
- [ ] Estar desconectado (cerrar sesión si hay una abierta)

---

## ✅ Caso 1: Login exitoso con credenciales válidas

### Precondiciones
- [ ] Tener el usuario de prueba preparado
- [ ] Estar en la pantalla de Login

### Pasos a seguir
1. Escribir `test@example.com` en el campo "Email"
2. Escribir `password123` en el campo "Contraseña"
3. Hacer click en el botón azul "Iniciar sesión"

### Resultado esperado
- [ ] La página cambia al Dashboard (URL: `/dashboard`)
- [ ] Aparece un mensaje verde: "Bienvenido"
- [ ] En la esquina superior derecha aparece el nombre del usuario
- [ ] Se puede ver el menú de navegación completo

---

## ❌ Caso 2: Login con credenciales incorrectas

### Precondiciones
- [ ] Estar en la pantalla de Login

### Pasos a seguir
1. Escribir `usuario-mal@example.com` en el campo "Email"
2. Escribir `contraseña-mala` en el campo "Contraseña"
3. Hacer click en el botón "Iniciar sesión"

### Resultado esperado
- [ ] Aparece un mensaje rojo debajo del formulario: "Credenciales inválidas"
- [ ] La página NO cambia (sigue en `/login`)
- [ ] El campo "Contraseña" se vacía automáticamente
- [ ] El cursor vuelve al campo "Email"

---

## ❌ Caso 3: Email con formato inválido

### Precondiciones
- [ ] Estar en la pantalla de Login

### Pasos a seguir
1. Escribir `no-es-un-email` en el campo "Email"
2. Hacer click en el campo "Contraseña" o en cualquier lugar fuera del campo Email

### Resultado esperado
- [ ] El borde del campo Email se pone rojo
- [ ] Aparece un mensaje debajo del campo: "Email no válido"
- [ ] El botón "Iniciar sesión" está gris y NO se puede clickar

---

## ⚠️ Caso 4: Campos vacíos

### Precondiciones
- [ ] Estar en la pantalla de Login

### Pasos a seguir
1. Dejar el campo "Email" vacío
2. Dejar el campo "Contraseña" vacío
3. Intentar hacer click en "Iniciar sesión"

### Resultado esperado
- [ ] El botón "Iniciar sesión" está gris desde el inicio (deshabilitado)
- [ ] Al intentar clickar, no pasa nada
- [ ] Aparece mensaje "Campo requerido" debajo de cada campo vacío

---

## 🎨 Caso 5: Estado de carga durante login

### Precondiciones
- [ ] Estar en la pantalla de Login

### Pasos a seguir
1. Escribir email y contraseña válidos
2. Hacer click en "Iniciar sesión"
3. Observar el botón mientras se procesa el login

### Resultado esperado
- [ ] El botón "Iniciar sesión" muestra un spinner/círculo girando
- [ ] El botón NO se puede volver a clickar (prevenir doble-click)
- [ ] Los campos de email y contraseña se bloquean temporalmente
- [ ] Después de 1-3 segundos, redirige al Dashboard

---

## 📱 Caso 6: Vista en móvil

### Precondiciones
- [ ] Abrir la página en un celular o modo responsive (tamaño iPhone)

### Pasos a seguir
1. Observar la pantalla de login en móvil
2. Intentar escribir en los campos

### Resultado esperado
- [ ] El formulario ocupa todo el ancho de la pantalla
- [ ] Los campos son lo suficientemente grandes para tocar con el dedo
- [ ] Al tocar un campo, el teclado del celular aparece y no tapa el campo
- [ ] El botón "Iniciar sesión" está al final, visible sin hacer scroll

---

## 📝 Datos de Prueba

**Datos que funcionan (para Caso 1):**
- Email: `test@example.com`
- Contraseña: `password123`

**Datos que NO funcionan (para Caso 2):**
- Email: `wrong@example.com`
- Contraseña: `wrongpassword`

**Emails inválidos (para Caso 3):**
- `no-es-email`
- `@nodomain.com`
- `espacios en@email.com`

---

## 🔍 Checklist de Elementos a Verificar

| Elemento | Dónde encontrarlo | Cómo identificarlo |
|----------|--------------------|--------------------|
| Campo Email | Primero en el formulario | Label "Email", tipo texto |
| Campo Contraseña | Debajo del Email | Label "Contraseña", puntos negros al escribir |
| Botón Iniciar sesión | Abajo del formulario | Botón azul con texto "Iniciar sesión" |
| Mensaje de error | Debajo del formulario | Texto rojo |
| Spinner de carga | Dentro del botón | Círculo girando blanco |
| Mensaje de éxito | Arriba de todo | Banner verde con palomita |

---

*Generado para: Login*
*Fecha: 2024-XX-XX*
```

## Reglas Importantes

1. **NUNCA** usar términos técnicos como: código, data-testid, async, endpoint, API, selector, localStorage, hook, componente
2. **SIEMPRE** describir acciones como las haría una persona normal: "Escribir", "Hacer click", "Seleccionar"
3. **SIEMPRE** describir resultados visuales: "Aparece mensaje rojo", "El botón está gris", "La página cambia a..."
4. **SIEMPRE** incluir precondiciones claras y verificables
5. **SIEMPRE** usar checklist [ ] para que el tester pueda marcar paso a paso
6. **SIEMPRE** incluir datos de prueba específicos (valores reales que escribir)
7. **NUNCA** asumir conocimiento técnico del tester
8. **NUNCA** incluir código o scripts

## Output Final

Después de generar:
1. Informar cuántos casos de prueba se generaron
2. Confirmar que se copió todo al portapapeles
3. Avisar que el formato es checklist para marcar paso a paso
