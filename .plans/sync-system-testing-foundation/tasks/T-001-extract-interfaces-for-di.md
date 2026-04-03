# T-001: Extraer interfaces para DI

## Objetivo
Extraer interfaces TypeScript para las clases del sistema de sync, permitiendo inyección de dependencias y mocks en tests.

## Archivos a Crear
- `packages/app/app/lib/sync/interfaces.ts`

## Interfaces a Definir

```typescript
// Para PullService
export interface IPullService {
  pull(): Promise<PullResult>;
  pullWithOptions(options: PullOptions): Promise<PullResult & { nextSince: string | null }>;
  pullAll(): Promise<{ totalApplied: number; errors: string[] }>;
  forcePullNow(): Promise<PullResult>;
  getStatus(): PullStatus;
  getLastSince(): string | null;
  clearCursor(): void;
  setSyncGroupId(syncGroupId: string | null): void;
  setOnChangesApplied(callback: (entityTypes: string[]) => void): void;
  startAutoPull(): void;
  stopAutoPull(): void;
}

export interface PullOptions {
  entityTypes?: string[];
  since?: string;
  limit?: number;
  cursorKey?: string;
}

// Para ChangeApplier
export interface IChangeApplier {
  applyChange(
    pg: PGlite,
    db: unknown,
    change: PullChange,
    businessId: string,
    retriesLeft?: number
  ): Promise<ChangeApplicationResult>;
}

// Para StagedPullCoordinator
export interface IStagedPullCoordinator {
  setOnProgress(callback: StagedPullProgressCallback): void;
  loadCriticalData(): Promise<StagedPullState>;
  loadRecentSales(): Promise<StagedPullState>;
  loadHistoricalData(): Promise<StagedPullState>;
  executeStagedLoad(): Promise<StagedPullResult>;
  getAllState(): StagedPullResult;
  isAppUsable(): boolean;
  isComplete(): boolean;
  getTotalChangesApplied(): number;
  reset(): void;
}
```

## Pasos de Implementación

1. Crear archivo `packages/app/app/lib/sync/interfaces.ts`
2. Definir `IPullService` con todos los métodos públicos de `PullService`
3. Definir `IChangeApplier` con la firma de `applyChange`
4. Definir `IStagedPullCoordinator` con todos los métodos públicos
5. Exportar tipos relacionados: `PullOptions`, `PullChange`, `PullResult`, `PullStatus`, `StagedPullState`, `StagedPullResult`
6. **NO modificar las clases originales** - solo crear interfaces

## Criterios de Aceptación

- [ ] Archivo `interfaces.ts` creado
- [ ] Todas las interfaces exportadas
- [ ] Tipos relacionados re-exportados
- [ ] Tests pueden usar `vi.mock` con interfaces

## Notas

- Mantener compatibilidad con código existente
- Las interfaces deben ser compatibles con las clases actuales (mismos métodos públicos)
- Considerar usar `implements` en las clases cuando sea posible sin breaking changes
