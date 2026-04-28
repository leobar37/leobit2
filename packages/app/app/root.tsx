import "./styles/globals.css";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

import { Loader2 } from "lucide-react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Provider as JotaiProvider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { createQueryPersister } from "~/lib/query/persister";
import { queryClient } from "~/lib/query/client";
import { getStoredBusinessId } from "~/lib/session-storage";
// @ts-expect-error virtual module provided by vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

export function HydrateFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <meta name="theme-color" content="#f97316" />
        <meta name="description" content="Sistema de ventas de pollo - Offline first" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Create persister with buster based on current businessId
// This invalidates cache when switching businesses
const queryPersister = createQueryPersister(undefined, getStoredBusinessId() ?? undefined);

export default function App() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const buildId = import.meta.env.VITE_BUILD_ID || "dev";
      const lastBuildId = localStorage.getItem("avileo_build_id");

      if (lastBuildId && lastBuildId !== buildId) {
        console.log(`[SW] Build changed from ${lastBuildId} to ${buildId}, clearing caches...`);
        navigator.serviceWorker.getRegistrations().then(async (regs) => {
          await Promise.all(regs.map((r) => r.unregister()));
          const cacheKeys = "caches" in window ? await window.caches.keys() : [];
          await Promise.all(cacheKeys.map((name) => window.caches.delete(name)));
          localStorage.setItem("avileo_build_id", buildId);
          console.log("[SW] All caches cleared, reloading...");
          window.location.reload();
        });
        return;
      }

      localStorage.setItem("avileo_build_id", buildId);
    }
  }, []);

  useEffect(() => {
    if (typeof registerSW === "function") {
      const updateSW = registerSW({
        immediate: true,
        onRegistered(r: ServiceWorkerRegistration | undefined) {
          console.log("[PWA] Service Worker registered:", r);
          // Check for updates immediately and periodically
          if (r) {
            // Check for updates every 5 minutes
            setInterval(() => {
              console.log("[PWA] Checking for updates...");
              r.update();
            }, 5 * 60 * 1000);

            // Also check immediately if there's a waiting worker
            if (r.waiting) {
              console.log("[PWA] Update already waiting, reloading...");
              r.waiting.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          }
        },
        onRegisterError(error: Error | undefined) {
          console.error("[PWA] Service Worker registration failed:", error);
        },
        onOfflineReady() {
          console.log("[PWA] Ready to work offline");
        },
        onNeedRefresh() {
          // Force reload when new version is available to avoid stale chunks
          console.log("[PWA] New version available, reloading...");
          window.location.reload();
        },
      });

      // Listen for messages from SW about updates
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "SW_UPDATED") {
            console.log("[PWA] SW reports new version, reloading...");
            window.location.reload();
          }
        });

        // Listen for controllerchange (new SW activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[PWA] New Service Worker activated");
        });
      }

      return () => {
        updateSW && updateSW();
      };
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && !import.meta.env.VITE_E2E_MODE) {
      import("react-grab");
    }
  }, []);

  // Suppress known PGlite duplicate key errors during sync
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = String(event.reason);
      if (
        errorMessage.includes("duplicate key value violates unique constraint") ||
        errorMessage.includes("_pkey")
      ) {
        // Silently ignore - these can occur during offline sync reconciliation
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  // Handle module loading errors (stale service worker cache)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = String(event.message || event.error);
      // Detect MIME type errors or failed module loads (stale SW cache)
      if (
        errorMessage.includes("MIME type") ||
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("Cannot read properties of undefined")
      ) {
        console.error("[App] Module loading error detected, likely stale SW cache:", errorMessage);
        // Clear service worker and reload
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            Promise.all(regs.map((r) => r.unregister())).then(() => {
              console.log("[App] Service workers cleared, reloading...");
              window.location.reload();
            });
          });
        }
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <JotaiProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister }}
      >
        <NuqsAdapter>
          <Outlet />
        </NuqsAdapter>
        <Toaster position="top-center" />
      </PersistQueryClientProvider>
    </JotaiProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error('[ErrorBoundary] Caught error:', error);
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    console.error('[ErrorBoundary] Route error response:', error.status, error.statusText);
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    console.error('[ErrorBoundary] Error details:', error.message);
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
