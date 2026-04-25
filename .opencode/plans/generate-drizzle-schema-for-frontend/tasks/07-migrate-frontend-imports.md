# T-007 Migrar frontend a usar esquema generado

## Objective

Actualizar todos los imports del frontend que usan tipos/entidades de `@avileo/shared` para que usen el nuevo esquema generado en `packages/app/app/lib/sync/generated/drizzle-schema.ts`.

## Requirements Covered

- FR-009

## Dependencies

- T-003, T-004, T-005

## Files or Areas Involved

- `packages/app/app/lib/sync/generated/drizzle-schema.ts` - Review - Nuevo esquema generado
- `packages/shared/src/index.ts` - Modify - Actualizar re-exports
- Múltiples archivos del frontend - Modify - Actualizar imports

## Actions

1. Verificar que `drizzle-schema.ts` generado exporta todo lo necesario:
   - Tablas: `customers`, `sales`, `products`, etc.
   - Enums: `SyncStatus`, `SaleType`, etc.
   - Tipos: `Customer`, `NewCustomer`, `Sale`, `NewSale`, etc.
2. Actualizar `packages/shared/src/index.ts` para re-exportar desde el archivo generado:
   ```typescript
   // En lugar de definir aquí, re-exportar desde el generado
   export { customers, sales, ... } from "../../app/app/lib/sync/generated/drizzle-schema";
   export { SyncStatus, SaleType, ... } from "../../app/app/lib/sync/generated/drizzle-schema";
   export type { Customer, NewCustomer, ... } from "../../app/app/lib/sync/generated/drizzle-schema";
   ```
   > **Nota:** Esto puede crear problemas circulares. Alternativa mejor: mantener shared como punto central pero que sus exports vengan del generado.
   
3. **Opción recomendada:** En vez de cambiar todos los imports del frontend, actualizar `packages/shared/src/index.ts` para que re-exporte desde el archivo generado. Así el frontend sigue importando de `@avileo/shared` sin cambios.
4. Si la opción 3 no funciona (problemas de paths cross-package), entonces:
   - Actualizar `packages/shared/src/schema.ts` manual para que sea un barrel que re-exporta del generado
   - O: actualizar todos los imports del frontend (~38 archivos según investigación)
5. Verificar que los imports actuales siguen funcionando:
   ```typescript
   import type { Customer } from "@avileo/shared";
   import { SyncStatus } from "@avileo/shared";
   ```

## Completion Criteria

- [ ] El frontend compila sin errores
- [ ] Los imports existentes de `@avileo/shared` siguen funcionando
- [ ] No hay referencias al schema.ts manual

## Validation

- `cd packages/app && bun run typecheck` pasa sin errores
- `cd packages/app && bun run build` compila exitosamente

## Risks or Notes

- Cambiar 38+ archivos del frontend es riesgoso y tedioso
- La mejor opción es mantener `@avileo/shared` como punto de entrada pero que apunte al generado
- Hay que manejar cuidadosamente los paths entre packages (shared vs app)
