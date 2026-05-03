# File Upload Pattern - Patrón de Subida de Archivos

## Descripción

Patrón estándar para subir archivos/imágenes en Avileo con soporte mobile (cámara + galería) y validación automática.

## Componentes

### Frontend

#### 1. FormMediaField (`app/components/forms/form-media-field.tsx`)

Componente de formulario con soporte mobile para cámara.

**Características:**
- Mobile: Abre `CameraGalleryDrawer` (tomar foto / galería)
- Desktop: Input file nativo
- Vista previa compacta (h-32)
- Validación integrada con `validateFile`
- Integración con `react-hook-form` + `useWrapperForm`

**Uso:**
```tsx
import { FormMediaField } from "~/components/forms/form-media-field";
import { useWrapperForm } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";

const form = useWrapperForm({
  fields: {
    proofImageId: fileField(),
  },
});

<WrapperFormProvider form={form}>
  <FormMediaField name="proofImageId" label="Comprobante de pago" />
</WrapperFormProvider>
```

#### 2. CameraGalleryDrawer (`app/components/ui/camera-gallery-drawer.tsx`)

Drawer para elegir entre cámara y galería en mobile.

**Props:**
- `capture="environment"` - Activa cámara trasera
- Validación de tipo/tamaño
- Soporte para JPEG, PNG, WebP

#### 3. useFiles (`app/hooks/use-files.ts`)

Hook para operaciones de archivos.

```typescript
validateFile(file: File): string | null;  // Valida tipo y tamaño
useUploadFile(options?): Mutation hook;    // Subida con validación
uploadFileNow(file): Promise<FileUploadResponse>;  // Subida directa
```

#### 4. media-field-resolvers (`app/lib/forms/media-field-resolvers.ts`)

Resolvers para `useWrapperForm`.

```typescript
fileField();   // Para archivos generales → /files/upload
assetField();  // Para assets de negocio → /assets/upload
```

### Backend

#### 1. SaleService.confirmSale()

Crea automáticamente un abono cuando la venta es "a cuenta":

```typescript
if (amountPaid > 0 && amountPaid < totalAmount && paymentData?.paymentMethod) {
  await paymentRepository.create(ctx, {
    customerId: confirmedSale.customerId,
    amount: amountPaid.toFixed(2),
    paymentMethod: paymentData.paymentMethod,
    referenceNumber: paymentData.referenceNumber,
    proofImageId: paymentData.proofImageId,
    relatedSaleId: confirmedSale.id,
  }, tx);
}
```

#### 2. API Endpoints

- `POST /sales/:id/confirm` - Acepta `paymentMethod`, `referenceNumber`, `proofImageId`
- `POST /payments` - Acepta `relatedSaleId` para vincular abono a venta

## Flujo Completo (Ejemplo: Venta "a cuenta")

1. **UI:** Usuario selecciona "a cuenta" → ingresa monto → elige método de pago
2. **FormMediaField:** Usuario toma foto del comprobante
3. **useWrapperForm:** `fileField()` resolver sube archivo al confirmar
4. **SaleService:** Al confirmar venta, crea abono automáticamente vinculado
5. **Resultado:** Abono aparece en historial de cobros del cliente

## Referencias de Código

| Componente | Ruta |
|-----------|------|
| FormMediaField | `packages/app/app/components/forms/form-media-field.tsx` |
| CameraGalleryDrawer | `packages/app/app/components/ui/camera-gallery-drawer.tsx` |
| useFiles | `packages/app/app/hooks/use-files.ts` |
| fileField resolver | `packages/app/app/lib/forms/media-field-resolvers.ts` |
| SaleService | `packages/backend/src/services/business/sale.service.ts` |
| Payment API | `packages/backend/src/api/payments.ts` |
| Sales API | `packages/backend/src/api/sales.ts` |

---

*Creado: May 2026 | Actualizado con feature de comprobantes en ventas "a cuenta"*
