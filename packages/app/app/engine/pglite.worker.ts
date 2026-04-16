import { PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";

// Get the base URL for the worker directory to resolve WASM files
// Using import.meta.url ensures correct resolution in both dev and production
const workerBaseUrl = new URL("./", import.meta.url);

function locatePgliteFile(file: string): string {
  if (file === "postgres.data") {
    return `${workerBaseUrl}pglite.data`;
  }
  if (file === "postgres.wasm") {
    return `${workerBaseUrl}pglite.wasm`;
  }
  return file;
}

worker({
  async init(options) {
    return PGlite.create({
      dataDir: options.dataDir,
      relaxedDurability: true,
      locateFile: locatePgliteFile,
    });
  },
});
