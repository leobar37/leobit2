# Bug Report: Authentication Failure with Cross-Origin Requests

**Date:** 2025-03-11  
**Severity:** High  
**Status:** Investigating  
**Component:** Authentication (Better Auth + JWT/Bearer)

---

## Summary

Authentication fails after login when frontend runs on different origin than backend (cross-origin setup). The Bearer token is not being sent from the backend after successful sign-in.

---

## Symptoms

1. Login appears to succeed (no error thrown)
2. Browser console shows: `Cookie "better-auth.session_token" has been rejected because it is in a cross-site context and its "SameSite" is "Lax" or "Strict"`
3. Subsequent API calls fail with `401 Unauthorized`
4. Backend shows: `No autorizado` error in `contextPlugin`

---

## Environment

- **Frontend:** http://localhost:5173 (or Tailscale IP)
- **Backend:** http://100.123.96.35:5201 (different origin)
- **Auth:** Better Auth with bearer + jwt plugins
- **Runtime:** Bun

---

## Root Cause Analysis

### Issue 1: Cross-Origin Cookie Failure

Cookies are being rejected due to SameSite policy when origins differ:
```
Cookie "better-auth.session_token" has been rejected because it is in a cross-site context
```

### Issue 2: Bearer Token Not Being Returned

After login, the backend should return the token in the `set-auth-token` header, but it's not being included in the response.

**Debug logs show:**
```
[Auth] onSuccess - headers: ["content-length", "content-type"]
[Auth] NO token in headers!
```

---

## Current Configuration

### Backend (`packages/backend/src/lib/auth.ts`)

```typescript
export const auth = betterAuth({
  plugins: [
    bearer(),     // For Bearer token validation
    jwt({
      jwt: {
        expirationTime: "7d",
      },
    }),
  ],
  // ...
});
```

### Frontend Auth Client (`packages/app/app/lib/auth-client.ts`)

```typescript
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5201",

  fetchOptions: {
    credentials: "omit",  // Don't send cookies cross-origin

    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        localStorage.setItem("bearer_token", authToken);
      }
    },
  },

  auth: {
    type: "Bearer",
    token: () => getStoredAuthToken() || "",
  },
});
```

### API Client (`packages/app/app/lib/api-client.ts`)

```typescript
export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: "omit",
  },
  headers: (path) => {
    const token = getStoredAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  },
});
```

---

## Expected Behavior

1. User signs in with email/password
2. Backend returns session + `set-auth-token` header with Bearer token
3. Frontend captures token in `onSuccess` callback
4. Token stored in localStorage as `bearer_token`
5. All subsequent API calls include `Authorization: Bearer {token}` header
6. Backend validates token via `auth.api.getSession({ headers })`

---

## Actual Behavior

1. User signs in - no error thrown
2. Backend does NOT return `set-auth-token` header
3. Frontend `onSuccess` callback finds no token
4. Subsequent API calls have no Authorization header
5. Backend `auth.api.getSession()` fails → 401

---

## Investigation Steps Taken

1. ✅ Changed from cookies to Bearer token approach
2. ✅ Set `credentials: "omit"` to avoid cookie issues
3. ✅ Configured `auth: { type: "Bearer", token: ... }` in auth client
4. ✅ Added debug logging - token header is NOT present in response
5. ✅ Checked Better Auth docs - correct header is `set-auth-token`

---

## Open Questions

1. Is the Bearer plugin properly configured on the backend?
2. Is there middleware that strips the `set-auth-token` header?
3. Does `auth.handler(request)` need special configuration to return Bearer token headers?
4. Should we use JWT plugin instead of Bearer plugin for cross-origin auth?

---

## References

- [Better Auth Bearer Plugin Docs](https://www.better-auth.com/docs/plugins/bearer)
- [Better Auth JWT Plugin Docs](https://www.better-auth.com/docs/plugins/jwt)
- [Cross-Origin Cookie Issues](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

---

## Related Files

- `packages/backend/src/lib/auth.ts`
- `packages/backend/src/api/auth.ts`
- `packages/backend/src/plugins/context.ts`
- `packages/app/app/lib/auth-client.ts`
- `packages/app/app/lib/api-client.ts`
- `packages/app/app/hooks/use-auth.ts`
- `packages/app/app/lib/session-storage.ts`

---

## Tags

`authentication` `better-auth` `cors` `bearer-token` `cross-origin`
