# File Handling

Built-in file upload and sync support for offline-first applications.

## Overview

Drizzle-sync handles file fields (images, documents, receipts) as part of the sync pipeline. Declare file fields in your backend config, and the framework generates everything you need.

### What gets generated (`bun run sync:generate`)

| File | Import Path | Description |
|------|-------------|-------------|
| `file-fields.ts` | `~/lib/sync/generated/file-fields` | Runtime config map + helpers |
| `engine.ts` | `~/lib/sync/generated/engine` | Engine factory with `metadata.fileFields` injected |
| `hooks.ts` | `~/lib/sync/generated/hooks` | `useCreate*` / `useUpdate*` with auto file processing |

### What is manual (not generated)

| File | Import Path | Description |
|------|-------------|-------------|
| `form-file-upload.tsx` | `@/components/forms/form-file-upload` | Private file upload component |
| `form-asset-picker.tsx` | `@/components/forms/form-asset-picker` | Public asset picker component |

## Two Types of Files

| Type | Use Case | Visibility | Offline |
|------|----------|-----------|---------|
| `files` | Receipts, proofs, avatars | Private (per business) | Yes |
| `assets` | Product images, gallery | Public (shared) | No |

## Configuration

### Backend: Declare file fields

In `sync.config.ts`, add `fileFields` to entities:

```typescript
import { defineSyncConfig } from "@avileo/drizzle-sync/config";

export const syncConfig = defineSyncConfig({
  entities: {
    abonos: {
      table: abonos,
      syncable: true,
      fileFields: {
        proof_image_id: {
          entity: "files",
          maxSize: 5 * 1024 * 1024,
          accept: ["image/jpeg", "image/png"],
        },
      },
    },
    products: {
      table: products,
      syncable: true,
      fileFields: {
        image_id: { entity: "assets" },
      },
    },
    files: {
      table: files,
      syncable: true,
    },
  },
});
```

### FileFieldConfig options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | `"files" \| "assets"` | required | Target storage entity |
| `maxSize` | `number` | `5242880` (5MB) | Max file size in bytes |
| `accept` | `string[]` | `["image/*"]` | Accepted MIME types |

### Build & generate

```bash
bun run sync:build-schema   # Generates sync.schema.json with fileFields
bun run sync:generate        # Generates file-fields.ts + engine + hooks
```

## Generated Files

### file-fields.ts

Path: `app/lib/sync/generated/file-fields.ts`

```typescript
// AUTO-GENERATED FILE - DO NOT EDIT

export const FILE_FIELDS_CONFIG = {
  products: {
    imageId: { entity: "assets" },
  },
  sales: {
    advanceProofImageId: { entity: "files" },
  },
  purchases: {
    receiptImageId: { entity: "files" },
  },
  abonos: {
    proofImageId: { entity: "files" },
  },
} as const;

export function getFileFieldConfig(entityName: string, fieldName: string): FileFieldConfig | undefined;
export function isFileField(entityName: string, fieldName: string): boolean;
```

Import:

```typescript
import { FILE_FIELDS_CONFIG, getFileFieldConfig, isFileField } from "~/lib/sync/generated/file-fields";
```

### engine.ts

Path: `app/lib/sync/generated/engine.ts`

The generated factory injects `FILE_FIELDS_CONFIG` as engine metadata:

```typescript
// AUTO-GENERATED FILE - DO NOT EDIT

import { FILE_FIELDS_CONFIG } from "./file-fields";

export function createAvileoSyncEngine(params: CreateEngineParams): SyncClientEngine {
  return createSyncClientEngine({
    // ...
    metadata: {
      fileFields: FILE_FIELDS_CONFIG,
    },
  });
}
```

Import:

```typescript
import { createAvileoSyncEngine } from "~/lib/sync/generated/engine";
```

### hooks.ts

Path: `app/lib/sync/generated/hooks.ts`

For entities with `fileFields`, hooks auto-generate file processing code:

```typescript
// AUTO-GENERATED FILE - DO NOT EDIT

// Inside useCreateProducts:
const fileService = getFileUploadService();
if (input.imageId instanceof File) {
  const fileId = createId();
  await fileService.saveTemp(fileId, input.imageId, { ... });
  processedInput.imageId = fileId;
}
```

Import:

```typescript
import { useCreateProducts, useUpdateProducts } from "~/lib/sync/generated/hooks";
```

## Runtime API

### Engine helpers (via SyncClientEngine)

```typescript
import { useSyncEngine } from "@avileo/drizzle-sync/react";

const engine = useSyncEngine();

engine.getFileFields("abonos");
// → { proofImageId: { entity: "files" } }

engine.getFileField("abonos", "proofImageId");
// → { entity: "files" }

engine.isFileField("abonos", "proofImageId"); // → true
engine.isFileField("abonos", "amount");        // → false
```

### processFileFields — for custom hooks

The engine exposes `processFileFields(entityName, data)` that handles the full file pipeline: detect File instances → validate size → generate CUID2 → save to IndexedDB → replace with ID.

Use this when you need a custom hook instead of the auto-generated one:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { useEngineService } from "~/lib/sync/generated/hooks";
import { AbonosService } from "~/lib/sync/generated/services";

export function useCreateAbonoCustom() {
  const engine = useSyncEngine();
  const service = useEngineService<AbonosService>("abonos");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { customerId: string; amount: number; proofImageId?: File | string }) => {
      // Engine handles file detection, validation, temp storage, ID replacement
      const processed = await engine.processFileFields("abonos", input);

      // Add your custom logic here
      // ...

      return service.create(processed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abonos"] });
    },
  });
}
```

This is exactly what the auto-generated `useCreateAbono` does internally, but gives you full control over the mutation flow.

### Direct import (outside React)

```typescript
import { getFileFieldConfig, isFileField } from "~/lib/sync/generated/file-fields";

const config = getFileFieldConfig("abonos", "proofImageId");
```

## React Components (Manual)

### FormFileUpload (private files)

Path: `app/components/forms/form-file-upload.tsx`

Uses `useFormContext` — must be inside `<FormProvider>`.

```tsx
import { FormProvider, useForm } from "react-hook-form";
import { FormFileUpload } from "@/components/forms/form-file-upload";

function AbonoForm() {
  const form = useForm();
  const createAbono = useCreateAbono();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((data) => createAbono.mutate(data))}>
        <FormFileUpload
          name="proofImageId"
          entityName="abonos"
          label="Comprobante de pago"
        />
        <button type="submit">Guardar</button>
      </form>
    </FormProvider>
  );
}
```

### FormAssetPicker (public assets)

Path: `app/components/forms/form-asset-picker.tsx`

```tsx
import { FormAssetPicker } from "@/components/forms/form-asset-picker";

<FormAssetPicker
  name="imageId"
  entityName="products"
  label="Imagen del producto"
/>
```

### Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Field name in form (must match fileFields key) |
| `entityName` | `string` | Yes | Entity name for config lookup |
| `label` | `string` | No | Field label |
| `accept` | `string` | No | Override MIME type filter |
| `maxSize` | `number` | No | Override max size in bytes |
| `disabled` | `boolean` | No | Disable upload |
| `className` | `string` | No | CSS classes |

## Generated Hooks (File Processing)

When an entity has `fileFields`, the generated `useCreate*` and `useUpdate*` hooks automatically:

1. Detect `File` objects in the payload
2. Generate a CUID2 for the file
3. Save to temporary IndexedDB storage (offline) or upload immediately (online)
4. Replace the `File` with the generated `fileId` in the sync payload
5. Sync engine uploads pending files before sending the batch

```typescript
import { useCreateAbono } from "~/lib/sync/generated/hooks";

const { mutate } = useCreateAbono();

mutate({
  customerId: "123",
  amount: 100,
  proofImageId: fileObject, // File instance — hook processes it automatically
});
```

## Offline Flow

```
User selects file → Form stores File in react-hook-form state
    ↓
Form submit → Hook detects File field
    ↓
Generates CUID2 → Saves to IndexedDB temporarily
    ↓
Replaces File with fileId in payload → Enqueues sync operation
    ↓
[Offline] — File waits in IndexedDB
    ↓
[Online] Sync engine uploads files BEFORE sending batch
    ↓
POST /files/upload → GET fileId → Send batch with fileId
    ↓
Clean up temporary IndexedDB entry
```
