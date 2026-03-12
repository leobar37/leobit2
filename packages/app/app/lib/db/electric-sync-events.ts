export type ElectricSyncEvent =
  | {
      type: "must-refetch";
      table: string;
      status: number;
      occurredAt: number;
    }
  | {
      type: "up-to-date";
      table: string;
      occurredAt: number;
    };

type ElectricSyncListener = (event: ElectricSyncEvent) => void;

const listeners = new Set<ElectricSyncListener>();

function emitElectricSyncEvent(event: ElectricSyncEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeToElectricSyncEvents(listener: ElectricSyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportMustRefetch(table: string, status: number) {
  emitElectricSyncEvent({
    type: "must-refetch",
    table,
    status,
    occurredAt: Date.now(),
  });
}

export function reportShapeUpToDate(table: string) {
  emitElectricSyncEvent({
    type: "up-to-date",
    table,
    occurredAt: Date.now(),
  });
}

function isElectricControlMessage(payload: string, control: "must-refetch" | "up-to-date") {
  return payload.includes(`"control":"${control}"`);
}

export function createElectricFetchClient(table: string): typeof fetch {
  const electricFetchClient = async (input: URL | RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, init);

    try {
      const bodyText = await response.clone().text();

      if (isElectricControlMessage(bodyText, "must-refetch")) {
        reportMustRefetch(table, response.status);
      }

      if (isElectricControlMessage(bodyText, "up-to-date")) {
        reportShapeUpToDate(table);
      }
    } catch (error) {
      console.warn(`[ElectricSyncEvents] Failed to inspect response for ${table}`, error);
    }

    return response;
  };

  return electricFetchClient as typeof fetch;
}
