import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "~/lib/query/client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const getSessionMock = vi.fn();
const clearStoredAuthStateMock = vi.fn();

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    getSession: getSessionMock,
    signIn: {},
    signUp: {},
    signOut: vi.fn(),
    useSession: vi.fn(),
    changePassword: vi.fn(),
  })),
}));

vi.mock("./session-storage", () => ({
  clearStoredAuthState: clearStoredAuthStateMock,
  getStoredAuthToken: vi.fn(() => "token"),
}));

import { refreshSession } from "./auth-client";

describe("refreshSession", () => {
  beforeEach(() => {
    queryClient.clear();
    getSessionMock.mockReset();
    clearStoredAuthStateMock.mockReset();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });
  });

  it("returns null when getSession succeeds but no data is returned", async () => {
    getSessionMock.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await refreshSession();

    expect(result).toBeNull();
    expect(clearStoredAuthStateMock).not.toHaveBeenCalled();
  });

  it("clears auth state when session error is authentication-related", async () => {
    queryClient.setQueryData(PERSISTED_REMOTE_QUERY_KEYS.authSession, {
      user: { id: "cached-user" },
      session: { id: "cached-session" },
    });

    getSessionMock.mockResolvedValue({
      data: null,
      error: { status: 401, message: "Unauthorized" },
    });

    const result = await refreshSession();

    expect(result).toBeNull();
    expect(clearStoredAuthStateMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(PERSISTED_REMOTE_QUERY_KEYS.authSession)).toBeUndefined();
  });

});
