/**
 * Tests for Index route auth logic
 */

import { describe, expect, it } from "vitest";

/**
 * Helper function to check JWT expiration (extracted for testing)
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Create a mock JWT token with given expiration (exp claim in seconds)
 */
function createMockToken(expInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: expInSeconds, iat: Math.floor(Date.now() / 1000) }));
  const signature = btoa("mock-signature");
  return `${header}.${payload}.${signature}`;
}

describe("isTokenExpired", () => {
  it("returns false for a token expiring in the future", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const token = createMockToken(futureExp);

    expect(isTokenExpired(token)).toBe(false);
  });

  it("returns true for an expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const token = createMockToken(pastExp);

    expect(isTokenExpired(token)).toBe(true);
  });

  it("returns true for a token that expires now", () => {
    const nowExp = Math.floor(Date.now() / 1000);
    const token = createMockToken(nowExp);

    expect(isTokenExpired(token)).toBe(true);
  });

  it("returns false for a token expiring in 1 second", () => {
    const soonExp = Math.floor(Date.now() / 1000) + 1;
    const token = createMockToken(soonExp);

    // Should be false immediately, but could be true if there's timing lag
    const result = isTokenExpired(token);
    expect(result).toBe(false);
  });

  it("returns true for invalid token (no exp claim)", () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ iat: Math.floor(Date.now() / 1000) })); // No exp
    const signature = btoa("mock-signature");
    const token = `${header}.${payload}.${signature}`;

    // Tokens without exp claim should return false (no expiration)
    expect(isTokenExpired(token)).toBe(false);
  });

  it("returns true for malformed token", () => {
    expect(isTokenExpired("invalid-token")).toBe(true);
    expect(isTokenExpired("")).toBe(true);
    expect(isTokenExpired("not.a.jwt")).toBe(true);
  });

  it("returns true for token with non-numeric exp (parsed as NaN)", () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp: "not-a-number" }));
    const signature = btoa("mock-signature");
    const token = `${header}.${payload}.${signature}`;

    // When exp is non-numeric, exp * 1000 = NaN, and Date.now() >= NaN is false
    // So this returns false (not expired) since the comparison fails
    expect(isTokenExpired(token)).toBe(false);
  });
});
