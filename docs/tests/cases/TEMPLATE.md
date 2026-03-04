# Caso de Test: [Nombre del Caso]

**ID:** TC-[CATEGORIA]-[NUMERO]  
**Nivel:** E2E  
**Actor:** [Rol del usuario]

## Objetivo

[Descripción breve de qué se quiere verificar con este test]

## Precondiciones

- [Lista de condiciones que deben cumplirse antes de ejecutar]
- [Ej: Base de datos reseteada con seed E2E]
- [Ej: Usuario autenticado]

## Datos de Entrada

| Campo | Valor | Descripción |
|-------|-------|-------------|
| [campo1] | [valor1] | [descripción] |
| [campo2] | [valor2] | [descripción] |

## Pasos del Test

### 1. [Nombre del paso]
- [Acción concreta]
- [Verificación esperada]

### 2. [Nombre del paso]
- [Acción concreta]
- [Verificación esperada]

## Resultados Esperados

| Paso | Resultado |
|------|-----------|
| 1 | [Resultado esperado] |
| 2 | [Resultado esperado] |

## Selectores Utilizados

```typescript
// [Sección de la UI]
[data-testid="selector-1"]
[data-testid="selector-2"]
```

## Código del Test

```typescript
// packages/app/e2e/tests/[nombre-archivo].spec.ts
test("[Descripción del test]", async ({ page }) => {
  // PASO 1: [Acción]
  // ...

  // PASO 2: [Acción]
  // ...

  // Verificación final
  // ...
});
```

## Notas

- [Nota importante 1]
- [Nota importante 2]
- [Consideraciones especiales]

## Casos de Error Posibles

| Error | Causa | Solución |
|-------|-------|----------|
| [Error] | [Causa] | [Solución] |

---

## Instrucciones para Agregar Nuevo Caso

1. Copiar este archivo: `cp TEMPLATE.md nuevo-caso.md`
2. Reemplazar los campos entre corchetes `[]`
3. Actualizar la tabla de contenidos en `../e2e-testing.md`
4. Agregar el archivo al índice de casos
