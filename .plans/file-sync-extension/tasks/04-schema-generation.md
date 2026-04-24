# T-004 Generar Schemas Zod con Soporte de File

## Objective

Extender los generadores de schemas Zod para que campos declarados como `fileFields` generen tipos `File | string | undefined` en vez de solo `string`.

## Requirements Covered

- `FR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/zod-generator.ts` - Modify - Generar schemas File-compatible
- `packages/drizzle-sync/src/config/generators/schema-adapter.ts` - Modify - Incluir fileFields en metadata
- `packages/app/app/lib/db/schema.ts` o archivos generados - Review - Verificar que los schemas usados manejan File

## Actions

1. Extender el generador de Zod schemas para detectar `fileFields`:
   - Si un campo está en `fileFields`, generar:
     ```typescript
     proofImageId: z.union([
       z.instanceof(File),
       z.string(),
       z.undefined()
     ])
     ```
2. Generar type helpers:
   ```typescript
   type CreateAbonoInput = {
     amount: string;
     paymentMethod: string;
     proofImageId?: File | string;
   }
   ```
3. Agregar transformación en schema para convertir `File` a `string` después de upload:
   ```typescript
   .transform(async (data) => {
     if (data.proofImageId instanceof File) {
       // Upload logic (handled by hook, not schema)
     }
     return data;
   })
   ```
   *Nota: La transformación real va en el hook, no en el schema. El schema solo define el tipo.*
4. Actualizar `types.ts` generado para exportar tipos con `File` support
5. Asegurar que los schemas usados en validación de forms (react-hook-form) funcionen con `File`

## Completion Criteria

- [ ] El schema generado para `abonos` acepta `proofImageId: File | string | undefined`
- [ ] TypeScript no reporta errores al usar `File` en inputs de create/update
- [ ] Los schemas existentes (sin `fileFields`) no se ven afectados

## Validation

- `bun run typecheck` en frontend
- Tests de generación de schemas en drizzle-sync

## Risks or Notes

- Zod `z.instanceof(File)` puede no funcionar en SSR o tests node. Considerar `z.custom<File>()` como alternativa.
- Los schemas de update también deben soportar `File` (para cambiar imagen existente).
