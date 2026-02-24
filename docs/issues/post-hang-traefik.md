# Problema: POST Requests Se Cuelgan en Producción (Traefik)

**Fecha:** 2026-02-24  
**Estado:** En investigación  
**Severidad:** Alta (bloquea login)

## Descripción

Los POST requests al endpoint `/api/auth/sign-in/email` funcionan correctamente en localhost pero se cuelgan indefinidamente cuando pasan por Traefik en producción.

## Pruebas Realizadas

### ✅ Funciona
- `GET /health` a través de Traefik → 200 OK
- `OPTIONS /api/auth/sign-in/email` → 204 No Content
- `POST` **sin body** (Content-Length: 0) → 400 Bad Request (validación de Better Auth)
- `POST` directo a `localhost:3000` con body → 401 (comportamiento esperado)

### ❌ Se cuelga
- `POST` **con body** a través de Traefik → Timeout después de 5s

## Hallazgo Clave

El POST con body vacío funciona y devuelve error de validación. Esto indica que:
1. Traefik está funcionando correctamente
2. El backend recibe la request
3. Better Auth se ejecuta
4. **El problema está en cómo se maneja el body de la request**

## Hipótesis

### 1. Consumo del Body Stream
Elysia o algún middleware puede estar consumiendo el stream del body antes de que Better Auth pueda leerlo.

### 2. Better Auth no puede leer el body
Cuando la request viene de Traefik, el formato del body o headers puede ser diferente, causando que Better Auth se quede esperando datos.

### 3. Error silencioso en Better Auth
Better Auth puede estar lanzando un error o quedarse en un loop infinito al procesar la request, pero no hay logs visibles.

## Próximos Pasos para Diagnóstico

1. **Revisar logs del contenedor** (requiere acceso SSH):
   ```bash
   docker logs avileo-backend --tail 100 -f
   ```

2. **Agregar logging estratégico** en `auth.ts`:
   - Log antes de llamar `auth.handler()`
   - Log del estado del request (headers, bodyUsed)
   - Try-catch con timeout para detectar hangs

3. **Probar con request clonada**:
   ```typescript
   const clonedRequest = request.clone();
   const response = await auth.handler(clonedRequest);
   ```

4. **Verificar variables de entorno** en producción:
   - `BETTER_AUTH_BASE_URL`
   - `DATABASE_URL`
   - `FRONTEND_URL`

## Posibles Soluciones

### Opción A: Clonar Request
Crear un nuevo Request object con el body fresco antes de pasar a Better Auth.

### Opción B: Desactivar Body Parsing
Configurar Elysia para no parsear el body en rutas de auth.

### Opción C: Usar Plugin Elysia de Better Auth
Verificar si existe un plugin oficial de Better Auth para Elysia que maneje esto correctamente.

### Opción D: Timeout y Retry
Agregar timeout al handler y retornar error si Better Auth no responde en X segundos.

## Notas

- El problema es específicamente con POST que tienen body
- GET y OPTIONS funcionan correctamente
- El POST sin body llega a Better Auth (devuelve error de validación)
- Esto sugiere que el body stream es el problema, no la conexión general
