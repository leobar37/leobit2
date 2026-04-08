import { useState } from "react";
import { Bug, X, Database, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSync } from "~/components/sync/sync-status";
import { useEngine } from "~/engine";
import { DebugActions } from "./debug-actions";

export function DebugWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { isOnline } = useSync();
  const { isInitialized, isSyncing } = useEngine();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          "right-4 bottom-20",
          isOpen && "bottom-4 right-4 left-4 sm:left-auto sm:w-80"
        )}
      >
        {isOpen ? (
          <div className="bg-background border rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">Debug Tools</span>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Wifi className="h-3 w-3" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </span>
                )}
                {isSyncing && (
                  <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-xl hover:bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!isInitialized ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-muted-foreground">Inicializando...</span>
                </div>
              ) : (
                <DebugActions onClose={() => setIsOpen(false)} />
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-purple-500 text-white shadow-lg",
              "hover:bg-purple-600 transition-colors",
              "border-2 border-purple-300"
            )}
            title="Debug Tools (Dev)"
          >
            <Bug className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  );
}
