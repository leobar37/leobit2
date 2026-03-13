type ElectricSyncEvent = {
  type: "must-refetch" | "up-to-date" | "recoverable-error";
  table: string;
  reason?: "duplicate-key" | "expired-handle";
  error?: string;
  status?: number;
  occurredAt: number;
};

type ElectricSyncCallback = (event: ElectricSyncEvent) => void;

const listeners = new Set<ElectricSyncCallback>();

export function subscribeToElectricSyncEvents(callback: ElectricSyncCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function emitElectricSyncEvent(event: ElectricSyncEvent): void {
  listeners.forEach((callback) => callback(event));
}

export function reportMustRefetch(table: string, status?: number): void {
  emitElectricSyncEvent({
    type: "must-refetch",
    table,
    status,
    occurredAt: Date.now(),
  });
}

export function reportShapeUpToDate(table: string): void {
  emitElectricSyncEvent({
    type: "up-to-date",
    table,
    occurredAt: Date.now(),
  });
}

export function reportRecoverableSyncError(
  table: string,
  reason: "duplicate-key" | "expired-handle",
  error: string
): void {
  emitElectricSyncEvent({
    type: "recoverable-error",
    table,
    reason,
    error,
    occurredAt: Date.now(),
  });
}

export function createElectricFetchClient(table: string) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init);

    // Check HTTP headers first (for transformed 409 responses from backend proxy)
    const electricControl = response.headers.get("electric-control");
    if (electricControl === "must-refetch") {
      reportMustRefetch(table, response.status);
    } else if (electricControl === "up-to-date") {
      reportShapeUpToDate(table);
    }

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    // Also check JSON body for standard Electric responses
    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(responseText);
        const headers = json?.[0]?.headers;
        const control = headers?.control;

        if (control === "must-refetch") {
          reportMustRefetch(table, response.status);
        } else if (control === "up-to-date") {
          reportShapeUpToDate(table);
        }
      } catch {
        // Not valid Electric response, ignore
      }
    }

    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
