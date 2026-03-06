import { act, renderHook } from "@testing-library/react";
import { Window } from "happy-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./use-auth";

let navigateMock: ReturnType<typeof vi.fn>;
let signInEmailMock: ReturnType<typeof vi.fn>;
let signUpEmailMock: ReturnType<typeof vi.fn>;
let signOutMock: ReturnType<typeof vi.fn>;
let changePasswordMock: ReturnType<typeof vi.fn>;
let getBusinessMock: ReturnType<typeof vi.fn>;

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
    useSession: () => ({
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

    localStorage.clear();

    signInEmailMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    signUpEmailMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "user-2",
        },
      },
    });
    signOutMock.mockResolvedValue(undefined);
    changePasswordMock.mockResolvedValue({ error: null, data: null });
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

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("nuevo@example.com", "secret");
    });

    expect(signInEmailMock).toHaveBeenCalledWith({
      email: "nuevo@example.com",
      password: "secret",
    });
    expect(getBusinessMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("current_business_id")).toBe("biz-new");
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

    expect(localStorage.getItem("current_business_id")).toBeNull();
  });

  it("clears auth and business storage on logout", async () => {
    localStorage.setItem("bearer_token", "token-1");
    localStorage.setItem("current_business_id", "biz-1");

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("bearer_token")).toBeNull();
    expect(localStorage.getItem("current_business_id")).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
