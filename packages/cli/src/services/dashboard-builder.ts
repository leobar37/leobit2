import { existsSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawn } from "bun";
import { logCli, logSuccess, logError } from "./logger";

const DASHBOARD_SRC = join(process.cwd(), "packages", "cli", "dashboard");
const DASHBOARD_BUILD = join(process.cwd(), "packages", "cli", "dist", "dashboard");
const VITE_CONFIG = join(DASHBOARD_SRC, "vite.config.ts");

function getAllFiles(dir: string, base = dir): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, base));
      } else {
        files.push(fullPath);
      }
    }
  } catch {
    // ignore
  }
  return files;
}

export function dashboardBuildExists(): boolean {
  return existsSync(join(DASHBOARD_BUILD, "index.html"));
}

export function isDashboardBuildStale(): boolean {
  if (!dashboardBuildExists()) return true;

  const buildStat = statSync(join(DASHBOARD_BUILD, "index.html"));
  const buildTime = buildStat.mtimeMs;

  // Check if vite config is newer
  try {
    const viteStat = statSync(VITE_CONFIG);
    if (viteStat.mtimeMs > buildTime) return true;
  } catch {
    return true;
  }

  // Check if any source file is newer
  const srcFiles = getAllFiles(join(DASHBOARD_SRC, "src"));
  for (const file of srcFiles) {
    try {
      const stat = statSync(file);
      if (stat.mtimeMs > buildTime) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

export async function buildDashboard(): Promise<void> {
  logCli("Construyendo dashboard React...");

  return new Promise((resolve, reject) => {
    const subprocess = spawn({
      cmd: ["bun", "run", "dashboard:build"],
      cwd: join(process.cwd(), "packages", "cli"),
      stdout: "inherit",
      stderr: "inherit",
    });

    subprocess.exited.then((code) => {
      if (code === 0) {
        logSuccess("Dashboard construido exitosamente");
        resolve();
      } else {
        logError(`Dashboard build falló con código ${code}`);
        reject(new Error(`Build exit code: ${code}`));
      }
    });
  });
}

export async function ensureDashboardBuild(options: {
  force?: boolean;
  skip?: boolean;
}): Promise<void> {
  if (options.skip) {
    if (!dashboardBuildExists()) {
      throw new Error(
        "Dashboard no construido. Ejecuta sin --skip-build o corre: bun run --filter @avileo/cli dashboard:build"
      );
    }
    logCli("Saltando build del dashboard (--skip-build)");
    return;
  }

  if (options.force) {
    logCli("Forzando reconstrucción del dashboard (--force-build)");
    await buildDashboard();
    return;
  }

  if (!dashboardBuildExists()) {
    logCli("Dashboard no encontrado, construyendo...");
    await buildDashboard();
    return;
  }

  if (isDashboardBuildStale()) {
    logCli("Dashboard desactualizado, reconstruyendo...");
    await buildDashboard();
    return;
  }

  logCli("Dashboard ya está construido y actualizado");
}
