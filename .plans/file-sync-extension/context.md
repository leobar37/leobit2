# File Sync Extension - Context

## Overview

Extensión del framework drizzle-sync para soportar campos de archivo (`files` y `assets`) de forma nativa. Actualmente el manejo de archivos está aislado en `packages/app/app/lib/file-queue/` con IndexedDB manual, upload directo a R2, y actualización manual de sync operations. Esta extensión integra archivos como primera clase del framework de sync.

La visión es que el desarrollador solo declare `fileFields` en `sync.config.ts` y el framework genere todo: schemas Zod que aceptan `File | string`, hooks que procesan uploads automáticamente, y componentes de formulario integrados con react-hook-form.

## Background

Actualmente hay dos sistemas paralelos:
- **Sync engine**: Maneja entidades syncable (abonos, ventas, productos) via PGlite + batch POST
- **File queue**: Maneja archivos via IndexedDB + upload directo a R2 + actualización manual de entidades

Esto obliga a flujos de 2 pasos (crear entidad → subir archivo → update entidad), manejo manual de estado offline, y código repetitivo en cada formulario.

## Goal

Cuando el plan esté completo:
1. Los campos de archivo se declaran en `sync.config.ts` como `fileFields`
2. El framework genera schemas Zod que aceptan `File | string | undefined`
3. Los hooks generados (`useCreateAbono`) detectan `File` y orquestan upload automáticamente
4. Componentes `FormFileUpload` y `FormAssetPicker` se generan para react-hook-form
5. `file-queue/` manual se elimina completamente
6. Los archivos fluyen dentro del sync batch como entidades syncable normales (`files`/`assets`)

## Key Decisions

- **Archivos como entidades syncable**: `files` y `assets` ya tienen `sync_status`, `sync_attempts`, `version` en la base de datos
- **IDs generados en frontend**: CUID2 desde el inicio para evitar referencias temporales
- **Upload separado del batch**: Archivos binarios van por multipart/form-data a `/files/upload`, el batch solo lleva el `fileId`
- **Orquestación automática**: El sync engine frontend sube archivos pendientes ANTES de enviar el batch
- **Offline**: Archivos se guardan en IndexedDB temporal, se suben al reconectar, luego se envía el batch
- **Diferenciación por tipo**: `files` = privado, upload directo, offline-first | `assets` = público, galería, online-only

## Scope Boundaries

- **In scope**: Configuración `fileFields`, generación de schemas/hooks/componentes, servicio de upload orquestado, eliminación de file-queue manual
- **Out of scope**: Cambios al endpoint `/files/upload` existente, tabla `assets` si no tiene sync_status actualmente, compresión de imágenes, thumbnails
