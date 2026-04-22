import { defineConfig } from "tsup";

export default defineConfig([
  // Main entrypoint
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist",
    clean: true,
    splitting: false,
    treeshake: true,
  },
  // Shared submodule (must be early to avoid race with clean:true main entry)
  {
    entry: ["src/shared/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/shared",
    clean: false,
    splitting: false,
    treeshake: true,
  },
  // Core submodule
  {
    entry: ["src/core/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/core",
    clean: false,
    splitting: false,
    treeshake: true,
  },

  // PGlite submodule (frontend)
  {
    entry: ["src/pglite/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/pglite",
    clean: false,
    splitting: false,
    treeshake: true,
    // Externalize peer dependencies
    external: ["@electric-sql/pglite", "drizzle-orm", "drizzle-orm/pglite"],
  },
  // Server submodule (backend)
  {
    entry: ["src/server/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/server",
    clean: false,
    splitting: false,
    treeshake: true,
    // Externalize peer dependencies
    external: ["zod"],
  },
  // React submodule (frontend)
  {
    entry: ["src/react/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/react",
    clean: false,
    splitting: false,
    treeshake: true,
    // Externalize React (peer dependency)
    external: ["react", "react/jsx-runtime"],
    // Enable JSX transformation
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
  },
  // React DevTools submodule
  {
    entry: ["src/react/devtools/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/react/devtools",
    clean: false,
    splitting: false,
    treeshake: true,
    external: ["react", "react/jsx-runtime", "lucide-react"],
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
  },
  // Config submodule
  {
    entry: ["src/config/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/config",
    clean: false,
    splitting: false,
    treeshake: true,
  },
  // Codecs submodule
  {
    entry: ["src/codecs/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/codecs",
    clean: false,
    splitting: false,
    treeshake: true,
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: false,
    outDir: "dist",
    clean: false,
    splitting: false,
    treeshake: true,
    noExternal: ["commander"],
  },
  // Client submodule (frontend - framework-agnostic)
  {
    entry: ["src/client/index.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist/client",
    clean: false,
    splitting: false,
    treeshake: true,
    external: ["@electric-sql/pglite", "drizzle-orm", "drizzle-orm/pglite", "react", "react/jsx-runtime"],
  },
  // Client worker entry (consumed via new URL from database-init)
  {
    entry: ["src/client/pglite.worker.ts"],
    format: ["esm"],
    dts: false,
    outDir: "dist/client",
    clean: false,
    splitting: false,
    treeshake: true,
    external: ["@electric-sql/pglite", "@electric-sql/pglite/worker"],
  },
]);
