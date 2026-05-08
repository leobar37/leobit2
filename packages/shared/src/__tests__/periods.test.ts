import { describe, it, expect } from "bun:test";
import {
  getCalendarMonthPeriod,
  isDateInPeriod,
  periodToISOStrings,
} from "../standards/periods";

describe("getCalendarMonthPeriod", () => {
  it("returns UTC start/end for a mid-month date", () => {
    const date = new Date(Date.UTC(2025, 5, 15, 12, 0, 0)); // June 15
    const { periodStart, periodEnd } = getCalendarMonthPeriod(date);

    expect(periodStart.toISOString()).toBe("2025-06-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2025-06-30T23:59:59.999Z");
  });

  it("handles January correctly", () => {
    const date = new Date(Date.UTC(2025, 0, 10));
    const { periodStart, periodEnd } = getCalendarMonthPeriod(date);

    expect(periodStart.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2025-01-31T23:59:59.999Z");
  });

  it("handles December correctly", () => {
    const date = new Date(Date.UTC(2025, 11, 25));
    const { periodStart, periodEnd } = getCalendarMonthPeriod(date);

    expect(periodStart.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });

  it("defaults to current date when no argument is provided", () => {
    const now = new Date();
    const { periodStart, periodEnd } = getCalendarMonthPeriod();

    expect(periodStart.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(periodStart.getUTCMonth()).toBe(now.getUTCMonth());
    expect(periodStart.getUTCDate()).toBe(1);
    expect(periodStart.getUTCHours()).toBe(0);

    expect(periodEnd.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(periodEnd.getUTCMonth()).toBe(now.getUTCMonth());
    expect(periodEnd.getUTCHours()).toBe(23);
    expect(periodEnd.getUTCMinutes()).toBe(59);
    expect(periodEnd.getUTCSeconds()).toBe(59);
    expect(periodEnd.getUTCMilliseconds()).toBe(999);
  });
});

describe("isDateInPeriod", () => {
  it("returns true for a date inside the period", () => {
    const period = getCalendarMonthPeriod(new Date(Date.UTC(2025, 5, 15)));
    const inside = new Date(Date.UTC(2025, 5, 15));
    expect(isDateInPeriod(inside, period)).toBe(true);
  });

  it("returns true for boundary dates", () => {
    const period = getCalendarMonthPeriod(new Date(Date.UTC(2025, 5, 15)));
    expect(isDateInPeriod(period.periodStart, period)).toBe(true);
    expect(isDateInPeriod(period.periodEnd, period)).toBe(true);
  });

  it("returns false for a date outside the period", () => {
    const period = getCalendarMonthPeriod(new Date(Date.UTC(2025, 5, 15)));
    const outside = new Date(Date.UTC(2025, 7, 1));
    expect(isDateInPeriod(outside, period)).toBe(false);
  });
});

describe("periodToISOStrings", () => {
  it("serializes period boundaries to ISO strings", () => {
    const period = getCalendarMonthPeriod(new Date(Date.UTC(2025, 5, 15)));
    const iso = periodToISOStrings(period);

    expect(iso.periodStart).toBe("2025-06-01T00:00:00.000Z");
    expect(iso.periodEnd).toBe("2025-06-30T23:59:59.999Z");
  });
});
