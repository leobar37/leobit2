import { serve } from "bun";
import { join } from "path";
import { readFileSync } from "fs";

const PORT = process.env.PORT || 3000;
const BUILD_DIR = "./build/client";

const server = serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html for client-side routing
    if (path === "/" || !path.includes(".")) {
      path = "/index.html";
    }

    const filePath = join(BUILD_DIR, path);

    try {
      const file = readFileSync(filePath);
      const contentType = getContentType(path);
      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    } catch (e) {
      // If file not found, serve index.html for client-side routing
      try {
        const indexFile = readFileSync(join(BUILD_DIR, "index.html"));
        return new Response(indexFile, {
          headers: { "Content-Type": "text/html" },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }
  },
});

function getContentType(path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "text/plain";
}

console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
