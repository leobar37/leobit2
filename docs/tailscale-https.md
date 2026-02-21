# Tailscale HTTPS Setup Guide

This guide explains how to enable HTTPS with Tailscale certificates for true cross-site cookie support in production-like environments.

## Current Setup (Vite Proxy - Development)

The current configuration uses Vite's proxy feature to make frontend and backend appear as the same origin:

- **Frontend**: `http://100.123.96.35:5173`
- **Backend**: `http://100.123.96.35:5201` (proxied via `/api`)
- **Cookies**: `SameSite=Lax` (works with same origin)

This works well for development but is not suitable for production.

## Production Setup (Tailscale HTTPS)

For production or testing cross-device with proper HTTPS:

### 1. Enable Tailscale HTTPS

```bash
# Enable HTTPS certificates in Tailscale
tailscale up --accept-dns

# Get your Tailscale DNS name
tailscale status
# Look for: your-machine.tailxxxxx.ts.net
```

### 2. Generate Certificates

```bash
# Tailscale automatically provides certificates
# Your machine DNS will be: macbook-pro-de-elmer.tailxxxxx.ts.net
```

### 3. Update Environment Variables

**packages/app/.env:**
```env
VITE_API_URL=https://macbook-pro-de-elmer.tailxxxxx.ts.net:5201
```

**packages/backend/.env:**
```env
FRONTEND_URL="https://macbook-pro-de-elmer.tailxxxxx.ts.net:5173"
BETTER_AUTH_BASE_URL="https://macbook-pro-de-elmer.tailxxxxx.ts.net:5201"
BETTER_AUTH_CROSS_SITE="true"
```

### 4. Configure Vite for HTTPS

**packages/app/vite.config.ts:**
```typescript
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";
import os from "os";

// Get Tailscale certificate paths
const tailscaleDir = path.join(os.homedir(), ".tailscale", "certs");
const certDomain = "macbook-pro-de-elmer.tailxxxxx.ts.net";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    https: {
      cert: fs.readFileSync(path.join(tailscaleDir, `${certDomain}.crt`)),
      key: fs.readFileSync(path.join(tailscaleDir, `${certDomain}.key`)),
    },
  },
});
```

### 5. Configure Elysia for HTTPS

**packages/backend/src/index.ts:**
```typescript
import { Elysia } from "elysia";
import fs from "fs";
import path from "path";
import os from "os";

const tailscaleDir = path.join(os.homedir(), ".tailscale", "certs");
const certDomain = "macbook-pro-de-elmer.tailxxxxx.ts.net";

const app = new Elysia()
  // ... routes ...
  .listen({
    port: Number(process.env.PORT) || 5201,
    hostname: "0.0.0.0",
    tls: {
      cert: fs.readFileSync(path.join(tailscaleDir, `${certDomain}.crt`)),
      key: fs.readFileSync(path.join(tailscaleDir, `${certDomain}.key`)),
    },
  });
```

### 6. Update Auth Configuration

**packages/backend/src/lib/auth.ts:**

With HTTPS enabled, the auth configuration will automatically use:
- `sameSite: "none"` (for cross-site cookies)
- `secure: true` (HTTPS required)

### 7. Revert API Prefix (Optional)

If you want to remove the `/api` prefix for cleaner URLs:

**packages/backend/src/index.ts:**
```typescript
// Remove the .group("/api", ...) wrapper
// Move all .use() calls back to root level
```

**packages/app/vite.config.ts:**
```typescript
// Remove the proxy configuration
server: {
  host: "0.0.0.0",
  port: 5173,
  // Remove proxy section
}
```

## Cookie Behavior Matrix

| Scenario | Same Origin | Protocol | SameSite | Secure | Works? |
|----------|-------------|----------|----------|--------|--------|
| Dev + Proxy | Yes | HTTP | Lax | false | ✅ Yes |
| Dev + HTTPS | No | HTTPS | None | true | ✅ Yes |
| Dev + HTTP | No | HTTP | None | false | ❌ No (browser rejects) |
| Production | No | HTTPS | None | true | ✅ Yes |

## Troubleshooting

### Certificate not found
```bash
# Generate certificate manually
tailscale cert macbook-pro-de-elmer.tailxxxxx.ts.net
```

### CORS errors
Ensure `trustedOrigins` in auth.ts includes your HTTPS URLs:
```typescript
trustedOrigins: [
  "https://macbook-pro-de-elmer.tailxxxxx.ts.net:5173",
  "https://macbook-pro-de-elmer.tailxxxxx.ts.net:5201",
]
```

### Cookies not being set
Check browser DevTools:
1. Application → Cookies → verify domain and flags
2. Network → verify Set-Cookie headers in responses
3. Console → look for cookie rejection warnings

## References

- [Tailscale HTTPS Documentation](https://tailscale.com/kb/1153/enabling-https)
- [Better Auth Cookie Security](https://www.better-auth.com/docs/reference/security)
- [SameSite Cookie Recipes](https://web.dev/articles/samesite-cookie-recipes)
