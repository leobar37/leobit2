import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Copy,
  Database,
  RefreshCw,
  Loader2,
  Check,
  Users,
  Package,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { useSyncService, useSyncState } from "~/lib/sync/service-provider";
import { useSync } from "~/components/sync/sync-status";
import { runManualSync } from "~/lib/sync/manual-sync";
import { syncLogger } from "@avileo/drizzle-sync/pglite";
import { useToast } from "~/hooks/use-toast";

interface DebugActionsProps {
  onClose: () => void;
}

interface ActionResult {
  success: boolean;
  message: string;
  details?: string;
}

interface DuplicateReport {
  entityType: string;
  totalCount: number;
  uniqueIds: number;
  duplicateIds: number;
  duplicateNames: number;
  items: Array<{ name: string; count: number; ids: string[] }>;
}

function detectDuplicates<T extends { id: string; name?: string }>(
  items: T[],
  entityType: string
): DuplicateReport {
  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids).size;
  const duplicateIds = items.length - uniqueIds;

  const nameMap = new Map<string, { count: number; ids: string[] }>();
  for (const item of items) {
    if (item.name) {
      const existing = nameMap.get(item.name) || { count: 0, ids: [] };
      existing.count++;
      existing.ids.push(item.id.substring(0, 8));
      nameMap.set(item.name, existing);
    }
  }

  const duplicateNames = Array.from(nameMap.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([name, data]) => ({ name, count: data.count, ids: data.ids }));

  return {
    entityType,
    totalCount: items.length,
    uniqueIds,
    duplicateIds,
    duplicateNames: duplicateNames.length,
    items: duplicateNames,
  };
}

function formatDuplicateSection(report: DuplicateReport): string {
  if (report.totalCount === 0) {
    return `### ${report.entityType}\nNo data\n`;
  }

  const lines = [
    `### ${report.entityType}`,
    `- Total: ${report.totalCount}`,
    `- Unique IDs: ${report.uniqueIds}`,
    `- Duplicate IDs: ${report.duplicateIds > 0 ? `⚠️ ${report.duplicateIds}` : "0"}`,
    `- Duplicate Names: ${report.duplicateNames > 0 ? `⚠️ ${report.duplicateNames}` : "0"}`,
  ];

  if (report.items.length > 0) {
    lines.push(`- Items with duplicate names:`);
    for (const item of report.items.slice(0, 5)) {
      lines.push(`  - "${item.name}": ${item.count} times [${item.ids.join(", ")}...]`);
    }
    if (report.items.length > 5) {
      lines.push(`  - ... and ${report.items.length - 5} more`);
    }
  }

  return lines.join("\n");
}

export function DebugActions({ onClose }: DebugActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const syncService = useSyncService();
  const { actualIsOnline } = useSync();
  const { lastSyncTime } = useSyncState();
  const { toast } = useToast();

  const executeAction = async (
    actionName: string,
    action: () => Promise<ActionResult>
  ) => {
    setLoading(actionName);
    setResult(null);
    try {
      const res = await action();
      setResult(res);
    } catch (error) {
      setResult({
        success: false,
        message: "Error ejecutando acción",
        details: String(error),
      });
    } finally {
      setLoading(null);
    }
  };

  const checkDuplicates = () =>
    executeAction("checkDuplicates", async () => {
      const avileoDebug = (window as any).avileoDebug;
      if (!avileoDebug) {
        return {
          success: false,
          message: "Debug service no disponible",
        };
      }

      const products = await avileoDebug.productService?.findByBusiness() || [];
      const customers = await avileoDebug.customerService?.findByBusiness({}) || [];
      const sales = await avileoDebug.saleService?.findByBusiness() || [];

      const productIds = products.map((p: any) => p.id);
      const customerIds = customers.map((c: any) => c.id);
      const saleIds = sales.map((s: any) => s.id);

      const productDupes = productIds.length - new Set(productIds).size;
      const customerDupes = customerIds.length - new Set(customerIds).size;
      const saleDupes = saleIds.length - new Set(saleIds).size;

      const totalDupes = productDupes + customerDupes + saleDupes;

      return {
        success: true,
        message:
          totalDupes > 0
            ? `⚠️ ${totalDupes} duplicados encontrados`
            : "✅ Sin duplicados",
        details: `Productos: ${products.length} (${productDupes} dupes)\nClientes: ${customers.length} (${customerDupes} dupes)\nVentas: ${sales.length} (${saleDupes} dupes)`,
      };
    });

  const cleanupDuplicates = () =>
    executeAction("cleanupDuplicates", async () => {
      const avileoDebug = (window as any).avileoDebug;
      if (!avileoDebug?.cleanupDuplicateProducts) {
        return {
          success: false,
          message: "Función cleanupDuplicateProducts no disponible",
        };
      }

      const confirmed = confirm(
        "¿Eliminar productos duplicados?\nSe mantendrá el más reciente de cada grupo."
      );
      if (!confirmed) {
        return { success: false, message: "Cancelado" };
      }

      await avileoDebug.cleanupDuplicateProducts();
      return {
        success: true,
        message: "Limpieza ejecutada (ver consola)",
        details: "Revisa la consola para detalles",
      };
    });

  const clearStorage = () =>
    executeAction("clearStorage", async () => {
      const confirmed = confirm(
        "⚠️ ADVERTENCIA\n\nEsto eliminará TODOS los datos locales.\nDeberás recargar la página y re-sincronizar.\n\n¿Continuar?"
      );
      if (!confirmed) {
        return { success: false, message: "Cancelado" };
      }

      const databases = await indexedDB.databases();
      for (const dbInfo of databases) {
        const dbName = dbInfo.name;
        if (dbName) {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }

      return {
        success: true,
        message: "IndexedDB limpiada",
        details: "Recarga la página: location.reload()",
      };
    });

  const copyReport = async () => {
    setLoading("copyReport");
    try {
      const avileoDebug = (window as any).avileoDebug;

      const products = await avileoDebug?.productService?.findByBusiness() || [];
      const customers = await avileoDebug?.customerService?.findByBusiness({}) || [];
      const sales = await avileoDebug?.saleService?.findByBusiness() || [];

      const businessId = avileoDebug?.productService?.businessId || "N/A";
      const businessUserId = avileoDebug?.productService?.businessUserId || "N/A";

      const syncStatus = syncService
        ? await syncService.getStatus()
        : null;

      const productDupes = detectDuplicates(products, "Products");
      const customerDupes = detectDuplicates(customers, "Customers");
      const salesDupes = detectDuplicates(sales, "Sales");

      const storageEstimate = await navigator.storage.estimate();

      const report = `
=== AVILEO DEBUG REPORT ===
Generated: ${new Date().toISOString()}

## Context
- URL: ${window.location.href}
- Business ID: ${businessId}
- Business User ID: ${businessUserId}
- Online: ${navigator.onLine ? "✅ Yes" : "❌ No"}

## Duplicate Detection
${formatDuplicateSection(productDupes)}

${formatDuplicateSection(customerDupes)}

${formatDuplicateSection(salesDupes)}

## Sync Status
- Pending: ${syncStatus?.pending || 0}
- Processing: ${syncStatus?.processing || 0}
- Failed: ${syncStatus?.failed || 0}
- Conflicts: ${syncStatus?.conflict || 0}
- Dead Letter: ${syncStatus?.deadLetter || 0}
- Completed: ${syncStatus?.completed || 0}
- Total: ${syncStatus?.total || 0}

## Storage
- Usage: ${Math.round((storageEstimate.usage || 0) / 1024 / 1024)}MB
- Quota: ${Math.round((storageEstimate.quota || 0) / 1024 / 1024)}MB
- IndexedDB Databases: ${(await indexedDB.databases()).length}

## Environment
- User Agent: ${navigator.userAgent}
- Platform: ${navigator.platform}
- Language: ${navigator.language}
- Dev Mode: ${import.meta.env.DEV ? "Yes" : "No"}
`.trim();

      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setResult({
        success: true,
        message: "✅ Reporte copiado al portapapeles",
        details: "Incluye detección de duplicados",
      });
    } catch (error) {
      setResult({
        success: false,
        message: "Error copiando reporte",
        details: String(error),
      });
    } finally {
      setLoading(null);
    }
  };

  const forceSync = () =>
    executeAction("forceSync", async () => {
      if (!actualIsOnline) {
        return {
          success: false,
          message: "Sin conexión",
        };
      }

      await runManualSync({ actualOnline: actualIsOnline });
      return {
        success: true,
        message: "✅ Sync ejecutado",
        details: "Revisa la consola para más detalles",
      };
    });

  const copySyncErrors = async () => {
    setLoading("copySyncErrors");
    setResult(null);
    try {
      const entries = syncLogger.getEntries();
      if (entries.length === 0) {
        await navigator.clipboard.writeText("No sync errors or warnings recorded.");
        setResult({
          success: true,
          message: "✅ Sin errores registrados",
          details: "No hay entradas de error o warning en el buffer",
        });
      } else {
        const lines = entries.map((entry) => {
          const ts = entry.timestamp.toISOString();
          const dataStr = entry.data
            ? ` ${JSON.stringify(entry.data).substring(0, 500)}`
            : "";
          return `[${entry.level.toUpperCase()}] [${ts}] [${entry.prefix}] ${entry.message}${dataStr}`;
        });
        const report = `=== AVILEO SYNC ERRORS ===\n${new Date().toISOString()}\n\n${lines.join("\n\n")}`;
        await navigator.clipboard.writeText(report);
        setResult({
          success: true,
          message: `✅ Copiados ${entries.length} errores/warnings`,
          details: `${entries.filter((e) => e.level === "error").length} errores, ${entries.filter((e) => e.level === "warn").length} warnings`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Error copiando errores",
        details: String(error),
      });
    } finally {
      setLoading(null);
    }
  };

  const actions = [
    {
      icon: Database,
      label: "Verificar Duplicados",
      description: "Revisa productos, clientes y ventas duplicados",
      action: checkDuplicates,
      color: "text-blue-600",
    },
    {
      icon: RefreshCw,
      label: "Limpiar Duplicados",
      description: "Elimina productos duplicados antiguos",
      action: cleanupDuplicates,
      color: "text-orange-600",
    },
    {
      icon: Trash2,
      label: "Reset IndexedDB",
      description: "Borra toda la base de datos local",
      action: clearStorage,
      color: "text-red-600",
    },
    {
      icon: Copy,
      label: copied ? "¡Copiado!" : "Copiar Reporte",
      description: "Genera y copia reporte de diagnóstico",
      action: copyReport,
      color: copied ? "text-green-600" : "text-purple-600",
    },
    {
      icon: RefreshCw,
      label: "Forzar Sync",
      description: "Sincroniza cambios pendientes",
      action: forceSync,
      color: "text-green-600",
    },
    {
      icon: AlertTriangle,
      label: "Copiar Errores",
      description: "Copia últimos errores y warnings de sync",
      action: copySyncErrors,
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <Package className="h-4 w-4 mx-auto text-orange-500" />
          <div className="text-xs text-muted-foreground mt-1">Productos</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <Users className="h-4 w-4 mx-auto text-blue-500" />
          <div className="text-xs text-muted-foreground mt-1">Clientes</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <ShoppingCart className="h-4 w-4 mx-auto text-green-500" />
          <div className="text-xs text-muted-foreground mt-1">Ventas</div>
        </div>
      </div>

      {lastSyncTime && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Clock className="h-3 w-3" />
          <span>
            Último sync: {lastSyncTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action) => {
          const isLoading = loading === action.label.toLowerCase().replace(/ /g, "");
          return (
            <button
              key={action.label}
              onClick={action.action}
              disabled={loading !== null}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl",
                "bg-muted/30 hover:bg-muted/50 transition-colors",
                "text-left disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <action.icon
                className={cn(
                  "h-5 w-5 mt-0.5",
                  action.color,
                  isLoading && "animate-spin"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </button>
          );
        })}
      </div>

      {result && (
        <div
          className={cn(
            "p-3 rounded-xl text-sm",
            result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          )}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <div>
              <div className="font-medium">{result.message}</div>
              {result.details && (
                <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                  {result.details}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 text-xs text-center text-muted-foreground">
        Resultados detallados en consola (F12)
      </div>
    </div>
  );
}
