---
description: Clona un repositorio GitHub a la carpeta tmp/ para estudiarlo y
  analizarlo. Acepta URL completa o referencia a un paquete existente. Verifica
  si ya está clonado antes de clonar. Ideal para documentación, análisis de
  código y estudio de proyectos.
---

# Study Repository Command

Clona repositorios GitHub para análisis y estudio. El repositorio se almacena en el directorio `tmp/` para consultas posteriores.

## Usage

```
/study-repo <URL-github> [pregunta sobre el código]
/study-repo <paquete-existente> [pregunta sobre el código]
```

**Ejemplos:**

- `/study-repo https://github.com/vercel/ai`
- `/study-repo https://github.com/vercel/ai como funciona streamText`
- `/study-repo ai/packages/core explica el streaming`
- `/study-repo ai como usar generateText`

## Flujo de Ejecución

### Paso 1: Parsear Argumento

Determinar si el argumento es:
1. **URL completa de GitHub**: `https://github.com/owner/repo`
2. **Paquete/carpeta**: `repo` o `repo/packages/subfolder`

### Paso 2: Verificar Existencia

**Si es URL:**
- Extraer nombre del repo (`owner/repo` → `repo`)
- Verificar si existe en `tmp/repo/`

**Si es paquete:**
- Verificar si existe en `tmp/[ruta-completa]/`

### Paso 3: Clonar (si es necesario)

Si no existe:
```bash
cd tmp && git clone <URL>
```

Si ya existe:
```bash
cd tmp/repo && git pull
```

### Paso 4: Analizar y Responder

Si se proporcionó una pregunta:
1. Buscar archivos relevantes en el repo usando `Glob`
2. Leer código relevante con `Read`
3. Analizar patrones con `Grep`
4. Responder la pregunta específica

Si no hay pregunta:
1. Generar resumen del proyecto
2. Listar estructura de directorios
3. Identificar archivos principales

## Ejecución

### Parsear Input

```
INPUT: $ARGUMENTS
```

Extraer:
- **URL o path**: Primer token si parece URL o path
- **Pregunta**: El resto del texto

### Verificar y Clonar

Si el input comienza con `http`:
```
REPO_NAME=$(echo "$URL" | sed -n 's/.*github.com\/\([^/]*\)\/\([^/]*\).*/\2/p')
if [ ! -d "tmp/$REPO_NAME" ]; then
  cd tmp && git clone "$URL"
else
  cd "tmp/$REPO_NAME" && git pull
fi
```

Si es solo un path:
```
if [ ! -d "tmp/$INPUT" ]; then
  Error: No existe tmp/$INPUT. Por favor proporciona la URL completa primero.
fi
```

### Analizar Código

**Target directory**: `tmp/[repo o path]/`

1. **Explorar estructura** con `Glob`:
   - `**/*.md` para README y documentación
   - `**/package.json` para dependencias
   - `**/src/**/*` para código fuente

2. **Buscar patrones** con `Grep` según la pregunta

3. **Leer archivos clave** con `Read`

4. **Generar respuesta** con análisis específico

## Ejemplos de Análisis

### Ejemplo 1: Analizar funcionalidad
```
/study-repo https://github.com/vercel/ai como funciona streamText
```

Buscar:
- `grep -r "streamText" tmp/ai/` 
- Leer definiciones y ejemplos
- Explicar flujo de datos

### Ejemplo 2: Explorar estructura
```
/study-repo https://github.com/vercel/ai
```

Generar:
- Descripción del proyecto (de README)
- Arquitectura general
- Estructura de carpetas
- Puntos de entrada principales

## Delegación

Si la pregunta requiere análisis profundo, delegar al agente `analyzer` con:

```
TASK: Analizar código del repositorio clonado

TARGET: tmp/[repo-path]

QUESTION: [pregunta del usuario]

DO:
1. Buscar archivos relevantes con Glob
2. Leer código con Read
3. Analizar con Grep según la pregunta
4. Generar respuesta clara y específica
```

## Notas

- Los repositorios se clonan en `tmp/` (minúsculas)
- Si el repo ya existe, se hace `git pull` para actualizar
- Si solo se da el nombre del paquete, se asume que existe en `tmp/`
- Ideal para estudiar código, crear documentación, o entender proyectos
