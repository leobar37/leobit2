import { PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";

function locatePgliteFile(file: string): string {
  if (file === "postgres.data") {
    return "/pglite.data";
  }
  if (file === "postgres.wasm") {
    return "/pglite.wasm";
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
