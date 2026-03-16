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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Provider as JotaiProvider } from "jotai";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
    },
  },
});

export default function App() {
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

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster position="top-center" />
      </QueryClientProvider>
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
