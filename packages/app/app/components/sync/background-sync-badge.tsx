/**
 * BackgroundSyncBadge
 * Shows a compact "Actualizando..." indicator when PullService is actively syncing.
 * Debounced to avoid 10s-interval flicker during normal polling.
 */

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSyncState } from "@avileo/drizzle-sync/react";

const DEBOUNCE_MS = 800;

export function BackgroundSyncBadge() {
  const { pull, push } = useSyncState();

  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (pull?.isPulling ?? false) || (push?.syncingCount ?? 0) > 0;

  useEffect(() => {
    if (isActive) {
      // Show immediately when sync starts
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(true);
    } else {
      // Hide after debounce so brief syncs don't flash
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  if (!visible) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium animate-pulse">
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      <span>Actualizando...</span>
    </div>
  );
}
