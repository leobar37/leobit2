import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  clearStoredAuthStateMock,
  getStoredAuthTokenMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  clearStoredAuthStateMock: vi.fn(),
  getStoredAuthTokenMock: vi.fn(() => "token"),
}));

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
  getStoredAuthToken: getStoredAuthTokenMock,
}));

import { refreshSession } from "./auth-client";

describe("refreshSession", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    clearStoredAuthStateMock.mockReset();
    getStoredAuthTokenMock.mockReset();
    getStoredAuthTokenMock.mockReturnValue("token");
  });

  it("returns session data when getSession succeeds", async () => {
    getSessionMock.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { id: "session-1" } },
      error: null,
    });

    const result = await refreshSession();

    expect(result).toEqual({
      user: { id: "user-1" },
      session: { id: "session-1" },
    });
    expect(clearStoredAuthStateMock).not.toHaveBeenCalled();
  });

  it("clears auth state when session error is authentication-related", async () => {
    getSessionMock.mockResolvedValue({
      data: null,
      error: { status: 401, message: "Unauthorized" },
    });

    const result = await refreshSession();

    expect(result).toBeNull();
    expect(clearStoredAuthStateMock).toHaveBeenCalledTimes(1);
  });

  it("preserves auth state when session error is network-related", async () => {
    getSessionMock.mockResolvedValue({
      data: null,
      error: { message: "Failed to fetch" },
    });

    const result = await refreshSession();

    expect(result).toBeNull();
    expect(clearStoredAuthStateMock).not.toHaveBeenCalled();
  });

  it("treats expired session messages as authentication errors", async () => {
    getSessionMock.mockResolvedValue({
      data: null,
      error: { message: "Session expired" },
    });

    const result = await refreshSession();

    expect(result).toBeNull();
    expect(clearStoredAuthStateMock).toHaveBeenCalledTimes(1);
  });
});
