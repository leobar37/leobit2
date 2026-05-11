import "./styles/globals.css";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

import { ArrowLeft, Home, Loader2, TriangleAlert } from "lucide-react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Provider as JotaiProvider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { Button } from "@/components/ui/button";
import { ThemeProvider, themeScript } from "~/components/theme";
import { createQueryPersister } from "~/lib/query/persister";
import { queryClient } from "~/lib/query/client";
import { getStoredBusinessId } from "~/lib/session-storage";
// @ts-expect-error virtual module provided by vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <img src="/logo.svg" alt="Avileo" className="w-20 h-20" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">Avileo</h1>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <meta name="theme-color" content="#f97316" />
        <meta name="description" content="Sistema de ventas de pollo" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
    if (import.meta.env.DEV) {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

      navigator.serviceWorker.getRegistrations().then(async (regs) => {
        if (regs.length === 0) return;
        await Promise.all(regs.map((r) => r.unregister()));
        const cacheKeys = "caches" in window ? await window.caches.keys() : [];
        await Promise.all(cacheKeys.map((name) => window.caches.delete(name)));

        if (!sessionStorage.getItem("avileo_dev_sw_cleared")) {
          sessionStorage.setItem("avileo_dev_sw_cleared", "true");
          window.location.reload();
        }
      });
      return;
    }

    if (typeof registerSW !== "function") return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    const updateSW = registerSW({
      immediate: true,
      onRegistered(r: ServiceWorkerRegistration | undefined) {
        console.log("[PWA] Service Worker registered:", r);
        if (r) {
          const interval = setInterval(() => {
            console.log("[PWA] Checking for updates...");
            r.update();
          }, 5 * 60 * 1000);
          intervals.push(interval);

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
        console.log("[PWA] App ready");
      },
      onNeedRefresh() {
        console.log("[PWA] New version available, reloading...");
        window.location.reload();
      },
    });

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SW_UPDATED") {
        console.log("[PWA] SW reports new version, reloading...");
        window.location.reload();
      }
    };

    const handleControllerChange = () => {
      console.log("[PWA] New Service Worker activated");
    };

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    }

    return () => {
      intervals.forEach(clearInterval);
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      }
      if (updateSW) updateSW();
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && !import.meta.env.VITE_E2E_MODE) {
      import("react-grab");
    }
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
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

function NotFoundPage() {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  const handleGoBack = () => {
    if (typeof window === "undefined") return;

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/";
  };

  return (
    <main className="app-shell relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />

      <section className="shell-card-flat relative w-full max-w-sm overflow-hidden rounded-[32px] border-stone-200/90 bg-white/95 p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:max-w-md sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300" />

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-[0_16px_40px_rgba(249,115,22,0.18)] ring-1 ring-orange-100">
          <TriangleAlert className="h-10 w-10 text-orange-500" aria-hidden="true" />
        </div>

        <div className="mx-auto mb-4 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
          Error 404
        </div>

        <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
          La ruta que intentas abrir ya no existe o fue movida.
        </p>

        {currentPath && (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-600">
            {currentPath}
          </div>
        )}

        <div className="mt-6 grid gap-3">
          <Button
            asChild
            className="h-12 rounded-[18px] bg-orange-500 text-base font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Ir al dashboard
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoBack}
            className="h-12 rounded-[18px] border-stone-200 bg-white text-base font-semibold text-stone-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
        </div>
      </section>
    </main>
  );
}

function GenericErrorPage({
  message,
  details,
  stack,
}: {
  message: string;
  details: string;
  stack?: string;
}) {
  return (
    <main className="app-shell flex min-h-[100svh] items-center justify-center px-4 py-8 sm:px-6">
      <section className="shell-card-flat w-full max-w-md overflow-hidden rounded-[32px] border-stone-200/90 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-red-50 text-red-600 ring-1 ring-red-100">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground">
          {message}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{details}</p>
        <Button asChild className="mt-6 h-11 rounded-[16px] bg-orange-500 hover:bg-orange-600">
          <Link to="/dashboard">
            <Home className="h-4 w-4" />
            Ir al dashboard
          </Link>
        </Button>
        {stack && (
          <pre className="mt-6 max-h-64 overflow-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-100">
            <code>{stack}</code>
          </pre>
        )}
      </section>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error('[ErrorBoundary] Caught error:', error);
  let message = "Oops!";
  let details = "Ocurrió un error inesperado.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    console.error('[ErrorBoundary] Route error response:', error.status, error.statusText);
    if (error.status === 404) {
      return <NotFoundPage />;
    }

    message = "Error";
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    console.error('[ErrorBoundary] Error details:', error.message);
    details = error.message;
    stack = error.stack;
  }

  return <GenericErrorPage message={message} details={details} stack={stack} />;
}
