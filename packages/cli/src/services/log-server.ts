import { Elysia, t } from "elysia";
import { join } from "node:path";
import { readFileSync, existsSync, statSync } from "node:fs";
import { readLogs } from "./log-reader";
import type { LogFilter } from "./log-reader";
import { loadConfig } from "./config-manager";

const LOGS_DIR = join(process.cwd(), "logs");
const DASHBOARD_BUILD = join(process.cwd(), "packages", "cli", "dist", "dashboard");

function getLogFile(service: string): string {
  return join(LOGS_DIR, `${service}.jsonl`);
}

function serveStaticFile(path: string): Response {
  const ext = path.split(".").pop() ?? "";
  const mimeTypes: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff2: "font/woff2",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";

  try {
    const content = readFileSync(path);
    return new Response(content, { headers: { "Content-Type": contentType } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export function createLogServer(port: number): Elysia {
  const app = new Elysia();

  // Serve React dashboard static files
  app.get("/assets/*", ({ params }) => {
    const filePath = join(DASHBOARD_BUILD, "assets", params["*"] as string);
    return serveStaticFile(filePath);
  });

  app.get("/", () => {
    const indexPath = join(DASHBOARD_BUILD, "index.html");
    if (!existsSync(indexPath)) {
      return new Response(
        `Dashboard no construido. Ejecuta: bun run --filter @avileo/cli dashboard:build`,
        { status: 503, headers: { "Content-Type": "text/plain" } }
      );
    }
    return serveStaticFile(indexPath);
  });

  // Fallback for SPA routes
  app.get("/*", ({ request }) => {
    const url = new URL(request.url);
    const filePath = join(DASHBOARD_BUILD, url.pathname);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return serveStaticFile(filePath);
    }
    const indexPath = join(DASHBOARD_BUILD, "index.html");
    if (existsSync(indexPath)) {
      return serveStaticFile(indexPath);
    }
    return new Response("Not found", { status: 404 });
  });

  app.get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/api/config", () => {
    const config = loadConfig();
    return { config };
  });

  app.get("/api/logs", async ({ query }) => {
    const filter: LogFilter = {
      service: query.service || undefined,
      level: query.level || undefined,
      grep: query.grep || undefined,
      lines: query.lines ? parseInt(String(query.lines), 10) : 100,
      since: query.since || undefined,
    };

    const entries = await readLogs(filter);

    return {
      entries,
      count: entries.length,
    };
  }, {
    query: t.Object({
      service: t.Optional(t.String()),
      level: t.Optional(t.String()),
      grep: t.Optional(t.String()),
      lines: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
  });

  app.get("/api/logs/stream", async ({ query, set }) => {
    set.headers["Content-Type"] = "text/event-stream";
    set.headers["Cache-Control"] = "no-cache";
    set.headers["Connection"] = "keep-alive";

    const filter: LogFilter = {
      service: query.service || undefined,
      level: query.level || undefined,
      grep: query.grep || undefined,
      lines: query.lines ? parseInt(String(query.lines), 10) : 100,
    };

    const service = filter.service || "all";
    const file = service === "all" ? null : getLogFile(service);

    let lastSize = 0;

    if (file && existsSync(file)) {
      try {
        const stats = readFileSync(file);
        lastSize = stats.length;
      } catch {
        lastSize = 0;
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        const send = async () => {
          try {
            const entries = await readLogs(filter);
            const data = JSON.stringify({ entries, count: entries.length });
            controller.enqueue(`data: ${data}\n\n`);
          } catch {
            // ignore
          }
        };

        // Send initial data
        send();

        // Poll every 1s
        const interval = setInterval(send, 1000);

        // Cleanup
        const cleanup = () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        // Client disconnect
        const closeHandler = () => cleanup();
      },
    });

    return stream;
  }, {
    query: t.Object({
      service: t.Optional(t.String()),
      level: t.Optional(t.String()),
      grep: t.Optional(t.String()),
      lines: t.Optional(t.String()),
    }),
  });

  app.listen(port);

  return app;
}
