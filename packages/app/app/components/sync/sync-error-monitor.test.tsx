import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportMustRefetch, reportShapeUpToDate } from "../../lib/db/electric-sync-events";
import { SyncErrorMonitor } from "./sync-error-monitor";
import { SyncProvider } from "./sync-status";

describe("SyncErrorMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows the recovery dialog after repeated must-refetch events", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SyncProvider>
          <SyncErrorMonitor />
        </SyncProvider>
      </QueryClientProvider>
    );

    act(() => {
      reportMustRefetch("sale_items", 409);
      reportMustRefetch("sale_items", 409);
    });

    expect(screen.getByText("Problema de sincronización detectado")).toBeTruthy();
    expect(
      screen.getByText(/Electric pidió reiniciar la sincronización de/i)
    ).toBeTruthy();
  });

  it("does not show the dialog if the stream recovers before the grace window ends", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SyncProvider>
          <SyncErrorMonitor />
        </SyncProvider>
      </QueryClientProvider>
    );

    act(() => {
      reportMustRefetch("sale_items", 409);
      reportShapeUpToDate("sale_items");
      vi.advanceTimersByTime(8_000);
    });

    expect(
      screen.queryByText("Problema de sincronización detectado")
    ).toBeNull();
  });
});
