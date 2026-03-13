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

export default defineConfig({
  plugins: [
    isDev && suppressReactDevToolsWarning(),
    reactRouter(),
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
    !isDev && VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
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
        ],
      },
      includeAssets: ["favicon.png", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "PollosPro",
        short_name: "PollosPro",
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
    exclude: ["@electric-sql/pglite", "@electric-sql/pglite-sync"],
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
      external: ["@electric-sql/pglite/dist/fs/nodefs.js"],
    },
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
  assetsInclude: ["**/*.md"],
});
