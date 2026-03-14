import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRecentDateTime } from "./date-utils";

describe("formatRecentDateTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T15:00:00-05:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a fallback when the date is missing", () => {
    expect(formatRecentDateTime(null)).toBe("Sin fecha");
  });

  it("shows relative minutes for sales from the same day", () => {
    expect(
      formatRecentDateTime(new Date("2026-03-15T14:40:00-05:00")),
    ).toBe("hace 20 min");
  });

  it("shows the yesterday label with time inside the 48-hour window", () => {
    expect(
      formatRecentDateTime(new Date("2026-03-14T10:30:00-05:00")),
    ).toMatch(/^Ayer, /);
  });

  it("falls back to an absolute date for sales older than two days", () => {
    const formatted = formatRecentDateTime(
      new Date("2026-03-12T09:15:00-05:00"),
    );

    expect(formatted.startsWith("hace")).toBe(false);
    expect(formatted.startsWith("Ayer")).toBe(false);
    expect(formatted).toContain("mar");
  });

  it("returns a fallback when the date is invalid", () => {
    expect(formatRecentDateTime("fecha-invalida")).toBe("Sin fecha");
  });
});
