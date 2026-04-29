import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MobileSlot,
  MobileSlotHost,
  MobileSlotProvider,
} from "./mobile-slots";

describe("MobileSlot", () => {
  it("removes stale footer content after unmount", () => {
    const { rerender } = render(
      <MobileSlotProvider>
        <MobileSlotHost data-testid="footer-host" name="footer" />
        <MobileSlot name="footer">Guardar</MobileSlot>
      </MobileSlotProvider>,
    );

    expect(screen.getByTestId("footer-host").textContent).toContain("Guardar");

    rerender(
      <MobileSlotProvider>
        <MobileSlotHost data-testid="footer-host" name="footer" />
      </MobileSlotProvider>,
    );

    expect(screen.getByTestId("footer-host").textContent).toBe("");
    expect(screen.queryByText("Guardar")).toBeNull();
  });

  it("warns and renders the last writer for single-writer slots", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <MobileSlotProvider>
        <MobileSlotHost data-testid="footer-host" name="footer" />
        <MobileSlot name="footer">Primero</MobileSlot>
        <MobileSlot name="footer">Segundo</MobileSlot>
      </MobileSlotProvider>,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("footer-host").textContent).toContain("Segundo");
    expect(screen.queryByText("Primero")).toBeNull();

    warnSpy.mockRestore();
  });

  it("keeps host target intact when a slot rerenders with new content", () => {
    const { rerender } = render(
      <MobileSlotProvider>
        <MobileSlotHost data-testid="footer-host" name="footer" />
        <MobileSlot name="footer" priority={5}>
          <span data-testid="slot-content">Theme Toggle Placeholder</span>
        </MobileSlot>
      </MobileSlotProvider>,
    );

    const host = screen.getByTestId("footer-host");

    expect(host.textContent).toContain("Theme Toggle Placeholder");
    expect(screen.getByTestId("slot-content")).toBeTruthy();

    rerender(
      <MobileSlotProvider>
        <MobileSlotHost data-testid="footer-host" name="footer" />
        <MobileSlot name="footer" priority={5}>
          <button type="button">Theme Toggle</button>
        </MobileSlot>
      </MobileSlotProvider>,
    );

    expect(screen.getByRole("button", { name: "Theme Toggle" })).toBeTruthy();
    expect(screen.queryByTestId("slot-content")).toBeNull();
    expect(host.textContent).toBe("Theme Toggle");
    expect(host.textContent).not.toContain("Theme Toggle Placeholder");
  });
});
