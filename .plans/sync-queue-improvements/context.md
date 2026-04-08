# Sync Queue Improvements Context

## Overview

Refactorización de la capa de cola de sincronización en `packages/app/app/lib/sync/queue/`. Se abordan 6 problemas de deuda técnica: lógica de dead-letter duplicada, merge superficial en coalescing, mezcla de responsabilidades entre `SyncService` y la cola, ausencia de limpieza de operaciones completadas, uso de `console.log` en producción, y imports directos que generan acoplamiento.

## Background

El análisis del artifact `sync-queue-analysis` identificó 6 problemas concretos en el código de `pg-sync-queue.ts` y `sync-service.ts`. La cola (`PgSyncQueue`) y el servicio (`SyncService`) tienen responsabilidades superpuestas, lo que genera duplicación y hace el código difícil de mantener.

## Goal

- Eliminar la duplicación de `moveToDeadLetter` entre queue y service.
- Implementar coalescing profundo para operaciones con arrays (line items).
- Mover la lógica de prioridades al queue para respetar la abstracción.
- Agregar método de cleanup para operaciones completadas.
- Reemplazar todos los `console.log` por `syncLogger`.
- Centralizar exports de interfaces para desacoplar.

## Key Decisions

- El queue **no** conoce la lógica de self-heal: esa permanece en `SyncService` como pre-procesamiento antes de llamar al queue.
- El cleanup de completados es **best-effort** y no bloquea la sync.
- El deep merge usa la clave `id` como identificador de fusión para arrays de items.

## Scope Boundaries

- In scope: `packages/app/app/lib/sync/queue/`, `packages/app/app/lib/sync/sync-service.ts`, `packages/app/app/lib/sync/testing/mocks.ts`
- Out of scope: Backend sync handlers, pull service, schema migrations para las tablas de sync
