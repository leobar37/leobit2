/**
 * Sync Event Emitter
 * 
 * Provides event-driven updates for sync status, replacing the 5s polling.
 */

export type SyncEventMap = {
  'status:changed': { pending: number; failed: number; conflict: number; deadLetter: number };
  'operation:completed': { id: string; entityType: string; operation: string };
  'operation:failed': { id: string; error: string };
  'operation:conflict': { id: string; entityType: string };
  'pull:completed': { changesApplied: number; entityTypes: string[] };
  'pull:error': { error: string };
  'pull:stale': { consecutiveStalePulls: number; reason: 'cursor-stuck' | 'empty-pulls' };
  'sync:online': void;
  'sync:offline': void;
  'coordinator:started': void;
};

export class SyncEventEmitter extends EventTarget {
  emit<K extends keyof SyncEventMap>(
    event: K, 
    data: SyncEventMap[K]
  ): void {
    this.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  on<K extends keyof SyncEventMap>(
    event: K, 
    handler: (data: SyncEventMap[K]) => void
  ): () => void {
    const wrapper = (e: CustomEvent) => handler(e.detail);
    this.addEventListener(event, wrapper as EventListener);
    return () => this.removeEventListener(event, wrapper as EventListener);
  }

  once<K extends keyof SyncEventMap>(
    event: K, 
    handler: (data: SyncEventMap[K]) => void
  ): void {
    const unsubscribe = this.on(event, (data) => {
      handler(data);
      unsubscribe();
    });
  }
}

// Global event emitter instance
export const syncEvents = new SyncEventEmitter();
