import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const isDev = process.env.NODE_ENV === "development";

// Suppress React DevTools warning
function suppressReactDevToolsWarning(): Plugin {
  return {
    name: "suppress-react-devtools-warning",
    apply: "client",
    transformCode(code) {
      return code.replace(
        /console\.warn\("Download the React DevTools[^"]*"\);?/g,
        "// React DevTools warning suppressed"
      );
    },
  };
}

// Add COOP/COEP headers for WASM support in Firefox
function crossOriginIsolation(): Plugin {
  return {
    name: "cross-origin-isolation",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        next();
      });
    },
  };
}

// Force ES module format for workers (required for PGlite worker with module resolution)
function workerEsFormat(): Plugin {
  return {
    name: "worker-es-format",
    config(config) {
      // @ts-expect-error Vite internal worker option
      config.worker = { format: 'es' };
      return config;
    },
  };
}

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  plugins: [
    isDev && suppressReactDevToolsWarning(),
    workerEsFormat(),
    crossOriginIsolation(),
    reactRouter(),
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      // Enable in dev for offline testing
      disable: false,
      devOptions: {
        enabled: false, // Disable SW in dev to avoid intercepting API requests
        type: "module",
      },
      // Exclude engine files that use browser-only APIs (causes SSR build errors)
      // Exclude index.html from precaching - always fetch fresh to avoid stale chunk references
      exclude: [
        /app\/engine\/.*/,
        /node_modules\/.*/,
        /index\.html$/, // Never precache index.html - always get fresh from network
      ],
      workbox: {
        // Cache static assets but NOT index.html (prevents stale HTML with old chunk references)
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2,wasm,data}"],
        // Increase limit for PGlite WASM files (~9MB wasm + ~5MB data)
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // Disable navigateFallback - we handle navigation via runtimeCaching NetworkFirst
        // navigateFallback can use stale precached index.html, which causes chunk loading errors
        // Instead, runtimeCaching with request.mode === "navigate" handles all navigation
        navigateFallback: undefined,
        navigateFallbackAllowlist: undefined,
        // Clean old caches when SW updates
        cleanupOutdatedCaches: true,
        // Skip waiting so new SW activates immediately
        skipWaiting: true,
        clientsClaim: true,
        // runtimeCaching must be ordered with navigation LAST for highest priority
        // Workbox checks routes in reverse registration order
        runtimeCaching: [
          // PGlite WASM files - cache for offline database initialization
          {
            urlPattern: /\.(wasm|data)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "pglite-cache",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // .html files - NetworkFirst
          {
            urlPattern: /\.html$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Navigation requests - NetworkFirst to always get fresh index.html
          // This MUST be LAST in runtimeCaching to have highest priority
          // Workbox matches routes in reverse order, so this will be checked first
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "navigate-cache",
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 60 * 5, // 5 minutes only - very short
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3, // If network takes >3s, use cache
            },
          },
        ],
      },
      includeAssets: ["favicon.png", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "Avileo",
        short_name: "Avileo",
        description: "Sistema de ventas de pollo - Offline first",
        theme_color: "#f97316",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["business", "finance", "productivity"],
        lang: "es",
        dir: "ltr",
        shortcuts: [
          {
            name: "Nueva Venta",
            short_name: "Venta",
            description: "Crear una nueva venta",
            url: "/ventas/nueva",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Clientes",
            short_name: "Clientes",
            description: "Ver lista de clientes",
            url: "/clientes",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
    include: [
      "react-day-picker",
      "date-fns",
      "@date-fns/tz",
      "lucide-react",
      "recharts",
    ],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [
        "@electric-sql/pglite/dist/fs/nodefs.js",
        // Exclude engine files from SSR/bundling - they use browser-only APIs
        // Use a function to ensure we only match relative imports, not absolute Docker paths
        (id) => {
          // Only match if it's a relative path containing "app/engine/"
          // This avoids matching /app/packages/app/app/engine/... in Docker
          return !id.startsWith('/') && id.includes('app/engine/');
        },
      ],
    },
  },
  ssr: {
    // Exclude browser-only modules from SSR
    external: ["@electric-sql/pglite", "@electric-sql/pglite/worker"],
    noExternal: [],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: ["..", "/Users/leobar37/code/avileo/node_modules/.bun"],
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      clearScreen: () => {},
    },
  },
  assetsInclude: ["**/*.md", "**/*.wasm", "**/*.data"],
});
