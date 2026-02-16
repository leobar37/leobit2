const SYNC_CURSOR_KEY = "avileo-sync-last-since";
const SYNC_LAST_AT_KEY = "avileo-sync-last-at";

export const SyncStorage = {
  getCursor(): string | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    return localStorage.getItem(SYNC_CURSOR_KEY);
  },

  setCursor(value: string): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(SYNC_CURSOR_KEY, value);
  },

  getLastSyncAt(): Date | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    const raw = localStorage.getItem(SYNC_LAST_AT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  },

  setLastSyncAt(value: Date): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(SYNC_LAST_AT_KEY, value.toISOString());
  },
} as const;
