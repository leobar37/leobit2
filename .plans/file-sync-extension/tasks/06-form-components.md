# T-006 Generar Componentes FormFileUpload y FormAssetPicker

## Objective

Generar componentes React integrados con react-hook-form que permitan seleccionar archivos de forma nativa y funcionen con los hooks de sync.

## Requirements Covered

- `FR-008`, `FR-009`

## Dependencies

- `T-004`, `T-005`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/component-generator.ts` - Create - Generador de componentes file
- `packages/app/app/components/ui/file-uploader.tsx` - Review/Modify - Reemplazar o extender
- `packages/app/app/components/assets/asset-picker.tsx` - Review/Modify - Integrar con react-hook-form
- `packages/app/app/components/forms/` - Create - `form-file-upload.tsx`, `form-asset-picker.tsx`

## Actions

1. Crear `FormFileUpload` componente:
   ```typescript
   interface FormFileUploadProps {
     name: string;           // Nombre del campo en react-hook-form
     label?: string;
     accept?: string;        // "image/*", "application/pdf", etc.
     maxSize?: number;       // En bytes
     disabled?: boolean;
     preview?: boolean;      // Mostrar preview de imagen
   }
   ```
   - Usa `Controller` de react-hook-form
   - Muestra input file nativo o botón personalizado
   - Soporta drag & drop (opcional)
   - Muestra preview si es imagen (`URL.createObjectURL`)
   - Muestra estado: idle → validating → uploading → done/error
   - Valida tamaño y tipo antes de aceptar

2. Crear `FormAssetPicker` componente:
   ```typescript
   interface FormAssetPickerProps {
     name: string;
     label?: string;
     accept?: string;
     category?: string;      // Filtrar galería por categoría
     allowUpload?: boolean;  // Permitir subir nuevo asset
   }
   ```
   - Muestra galería de assets existentes (usando `useAssets()` hook)
   - Permite seleccionar asset existente → devuelve `assetId` (string)
   - Permite subir nuevo asset → devuelve nuevo `assetId`
   - Usa `Controller` de react-hook-form
   - Online-only (no soporta offline)

3. Generar estos componentes automáticamente basado en `fileFields` config:
   - Si `entity === 'files'` → genera `FormFileUpload`
   - Si `entity === 'assets'` → genera `FormAssetPicker`
4. Exportar componentes en el index del package generado
5. Crear estilos base con Tailwind (mobile-first, orange theme)

## Completion Criteria

- [ ] `FormFileUpload` funciona con react-hook-form `Controller`
- [ ] `FormFileUpload` muestra preview de imagen seleccionada
- [ ] `FormFileUpload` valida tamaño máximo y tipo de archivo
- [ ] `FormAssetPicker` muestra galería de assets existentes
- [ ] `FormAssetPicker` permite seleccionar existente o subir nuevo
- [ ] Ambos componentes funcionan en mobile (touch-friendly, responsive)

## Validation

- Tests de componentes con Testing Library
- Tests visuales: verificar que preview se muestra correctamente
- Test en móvil: asegurar que input file funciona en iOS/Android

## Risks or Notes

- `File` API no existe en SSR/server-side rendering. Los componentes deben ser client-only.
- En iOS, el input file puede comportarse diferente según `accept`. Probar `accept="image/*"`.
- Los assets requieren que el backend exponga endpoint para listar assets por business.
