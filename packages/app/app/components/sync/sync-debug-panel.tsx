import { useState, useEffect } from "react";
import { useSyncService } from "~/lib/sync/engine-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

export function SyncDebugPanel() {
  const syncService = useSyncService();
  
  // Early return if sync service is not available
  if (!syncService) {
    return null;
  }
  
  const [status, setStatus] = useState({
    pending: 0,
    processing: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    conflict: 0,
    deadLetter: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentStatus = await syncService.getStatus();
      setStatus(currentStatus);
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncService]);

  const handleForceSync = async () => {
    setIsLoading(true);
    try {
      await (syncService as any)["processPending"]();
      setLastSync(new Date());
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const querySyncTable = async () => {
    const { getDatabase } = await import("@avileo/drizzle-sync/client");
    const { db } = getDatabase();
    const result = await db.execute(`
      SELECT status, entity, operation, COUNT(*) as count
      FROM sync_operations
      GROUP BY status, entity, operation
      ORDER BY status, entity
    `);
    console.table(result.rows);
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Sync Debug Panel
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Pending:</span>
            <Badge variant={status.pending > 0 ? "default" : "secondary"}>{status.pending}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Processing:</span>
            <Badge variant="outline">{status.processing}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Failed:</span>
            <Badge variant={status.failed > 0 ? "destructive" : "secondary"}>{status.failed}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Conflict:</span>
            <Badge variant={status.conflict > 0 ? "destructive" : "secondary"}>{status.conflict}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Dead Letter:</span>
            <Badge variant="outline">{status.deadLetter}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Completed:</span>
            <Badge variant="secondary">{status.completed}</Badge>
          </div>
        </div>

        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Last sync: {lastSync.toLocaleTimeString()}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={handleForceSync}
            disabled={isLoading || status.pending === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Force Sync
          </Button>
          <Button size="sm" variant="outline" onClick={querySyncTable}>
            Query Sync Table (console)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
