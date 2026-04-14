import { act, renderHook } from "@testing-library/react";
import { Window } from "happy-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./use-auth";

function createSuccessRequest<T extends Record<string, unknown>>(result?: T) {
  const request: Record<string, unknown> = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
  };

  queueMicrotask(() => {
    const onsuccess = request.onsuccess as
      | ((event: { target: typeof request }) => void)
      | null;
    onsuccess?.({ target: request });
  });

  return request as unknown as IDBOpenDBRequest;
}

let navigateMock: ReturnType<typeof vi.fn>;
let signInEmailMock: ReturnType<typeof vi.fn>;
let signUpEmailMock: ReturnType<typeof vi.fn>;
let signOutMock: ReturnType<typeof vi.fn>;
let changePasswordMock: ReturnType<typeof vi.fn>;
let getBusinessMock: ReturnType<typeof vi.fn>;
let refreshSessionMock: ReturnType<typeof vi.fn>;
let clearAuthSessionCacheMock: ReturnType<typeof vi.fn>;

vi.mock("react-router", () => ({
  useNavigate: () => {
    navigateMock ??= vi.fn();
    return navigateMock;
  },
}));

vi.mock("../lib/auth-client", () => {
  signInEmailMock = vi.fn();
  signUpEmailMock = vi.fn();
  signOutMock = vi.fn();
  changePasswordMock = vi.fn();
  refreshSessionMock = vi.fn();
  clearAuthSessionCacheMock = vi.fn();

  return {
    authClient: {
      signIn: {
        email: signInEmailMock,
      },
      signUp: {
        email: signUpEmailMock,
      },
      signOut: signOutMock,
    },
    useAuthSession: () => ({
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
        },
      },
      isPending: false,
    }),
    changePassword: changePasswordMock,
    refreshSession: refreshSessionMock,
    clearAuthSessionCache: clearAuthSessionCacheMock,
  };
});

vi.mock("../lib/api-client", () => {
  getBusinessMock = vi.fn();

  return {
    api: {
      businesses: {
        me: {
          get: getBusinessMock,
        },
      },
    },
  };
});

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const windowInstance = new Window();

    Object.defineProperty(globalThis, "localStorage", {
      value: windowInstance.localStorage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: windowInstance,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: windowInstance.document,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open: vi.fn((dbName: string) =>
          createSuccessRequest({
            name: dbName,
            close: vi.fn(),
          })
        ),
        deleteDatabase: vi.fn(() => createSuccessRequest()),
      },
    });

    localStorage.clear();

    signInEmailMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    signInEmailMock.mockImplementation(async () => {
      localStorage.setItem("bearer_token", "token-1");
      return {
        error: null,
        data: {
          user: {
            id: "user-1",
          },
        },
      };
    });
    signUpEmailMock.mockImplementation(async () => {
      localStorage.setItem("bearer_token", "token-2");
      return {
        error: null,
        data: {
          user: {
            id: "user-2",
          },
        },
      };
    });
    signOutMock.mockResolvedValue(undefined);
    changePasswordMock.mockResolvedValue({ error: null, data: null });
    refreshSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-1",
      },
    });
    getBusinessMock.mockResolvedValue({
      error: null,
      data: {
        success: true,
        data: {
          id: "biz-new",
        },
      },
    });
  });

  it("rehydrates the current business after login", async () => {
    localStorage.setItem("current_business_id", "biz-old");
    localStorage.setItem("avileo_pull_cursor", "cursor-old");

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("nuevo@example.com", "secret");
    });

    expect(signInEmailMock).toHaveBeenCalledWith({
      email: "nuevo@example.com",
      password: "secret",
    });
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(getBusinessMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("current_business_id")).toBe("biz-new");
    expect(localStorage.getItem("avileo_local_db_namespace")).toBe(
      "user-1__biz-new__session-1"
    );
  });

  it("clears the stale business context if hydration fails", async () => {
    localStorage.setItem("current_business_id", "biz-old");
    getBusinessMock.mockResolvedValue({
      error: { value: "forbidden" },
      data: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("nuevo@example.com", "secret");
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("current_business_id")).toBeNull();
  });

  it("fails login when the session cannot be restored", async () => {
    refreshSessionMock.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await expect(result.current.login("nuevo@example.com", "secret")).rejects.toThrow(
      "No se pudo restaurar la sesión"
    );

    expect(getBusinessMock).not.toHaveBeenCalled();
  });

  it("clears auth and business storage on logout", async () => {
    localStorage.setItem("bearer_token", "token-1");
    localStorage.setItem("current_business_id", "biz-1");
    localStorage.setItem("avileo_pull_cursor", "cursor-1");
    localStorage.setItem("avileo_pull_cursor:user-1__biz-1__session-1", "cursor-2");
    localStorage.setItem("avileo_pull_cursor:user-2__biz-2__session-2", "cursor-3");

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("bearer_token")).toBeNull();
    expect(localStorage.getItem("current_business_id")).toBeNull();
    expect(localStorage.getItem("avileo_local_db_namespace")).toBeNull();
    expect(localStorage.getItem("avileo_pull_cursor")).toBeNull();
    expect(localStorage.getItem("avileo_pull_cursor:user-1__biz-1__session-1")).toBeNull();
    expect(localStorage.getItem("avileo_pull_cursor:user-2__biz-2__session-2")).toBeNull();
    expect(clearAuthSessionCacheMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
  });
});
