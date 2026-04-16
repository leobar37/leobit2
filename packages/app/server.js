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

    // Determine if this is an asset request (has file extension)
    const isAsset = /\.[a-zA-Z0-9]+$/.test(path);
    const isAssetExt = path.match(/\.(js|css|wasm|data|png|jpg|jpeg|svg|ico|woff2|json|webmanifest)$/);

    // Default to index.html for client-side routing (only for non-asset paths)
    if (path === "/" || (!isAsset && !path.includes("."))) {
      path = "/index.html";
    }

    const filePath = join(BUILD_DIR, path);

    try {
      const file = readFileSync(filePath);
      const contentType = getContentType(path);
      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Cross-Origin-Embedder-Policy": "credentialless",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      });
    } catch (e) {
      // For asset files, return 404 to let the PWA know the file is missing
      // This triggers the service worker update mechanism
      if (isAssetExt) {
        console.error(`[Server] Asset not found: ${path}`);
        return new Response(`Asset not found: ${path}`, { status: 404 });
      }

      // If file not found and not an asset, serve index.html for client-side routing
      try {
        const indexFile = readFileSync(join(BUILD_DIR, "index.html"));
        return new Response(indexFile, {
          headers: {
            "Content-Type": "text/html",
            "Cross-Origin-Embedder-Policy": "credentialless",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
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
  if (path.endsWith(".wasm")) return "application/wasm";
  if (path.endsWith(".data")) return "application/octet-stream";
  return "text/plain";
}

console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
