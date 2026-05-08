import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DiscoveredPorts } from "./port-discovery";
import { isPortAvailable } from "./port-discovery";
import { logCli } from "./logger";

export interface ServiceConfigEntry {
  port: number;
  url: string;
  isRunning: boolean;
}

export interface AvileoConfig {
  services: {
    backend: ServiceConfigEntry;
    app: ServiceConfigEntry;
    dashboard: ServiceConfigEntry;
  };
  lastRun: string;
}

const CONFIG_PATH = join(process.cwd(), "config.json");

export function loadConfig(): AvileoConfig | null {
  if (!existsSync(CONFIG_PATH)) {
    return null;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as AvileoConfig;
  } catch {
    return null;
  }
}

export function saveConfig(ports: DiscoveredPorts): void {
  const config: AvileoConfig = {
    services: {
      backend: { port: ports.backend, url: `http://localhost:${ports.backend}`, isRunning: false },
      app: { port: ports.app, url: `http://localhost:${ports.app}`, isRunning: false },
      dashboard: { port: ports.dashboard, url: `http://localhost:${ports.dashboard}`, isRunning: false },
    },
    lastRun: new Date().toISOString(),
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function updateServiceRunningState(
  serviceName: keyof AvileoConfig["services"],
  isRunning: boolean
): void {
  const config = loadConfig();
  if (!config) return;

  const svc = config.services[serviceName];
  if (svc) {
    svc.isRunning = isRunning;
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }
}

export async function checkServiceRunning(serviceName: keyof AvileoConfig["services"]): Promise<boolean> {
  const config = loadConfig();
  if (!config) return false;

  const svc = config.services[serviceName];
  if (!svc) return false;

  // Verificación real: el puerto está ocupado?
  const portAvailable = await isPortAvailable(svc.port);
  const actuallyRunning = !portAvailable;

  // Sincronizar config si hay discrepancia
  if (svc.isRunning !== actuallyRunning) {
    updateServiceRunningState(serviceName, actuallyRunning);
  }

  return actuallyRunning;
}

export async function getAllRunningServices(): Promise<string[]> {
  const config = loadConfig();
  if (!config) return [];

  const running: string[] = [];
  for (const [name, svc] of Object.entries(config.services)) {
    const portAvailable = await isPortAvailable(svc.port);
    const actuallyRunning = !portAvailable;
    if (svc.isRunning !== actuallyRunning) {
      updateServiceRunningState(name as keyof AvileoConfig["services"], actuallyRunning);
    }
    if (actuallyRunning) {
      running.push(name);
    }
  }
  return running;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

/**
 * Sincroniza VITE_API_URL en el archivo .env del paquete app
 * para que apunte al puerto correcto del backend.
 */
export function syncFrontendEnvFiles(ports: DiscoveredPorts): void {
  const packagesDir = join(process.cwd(), "packages");

  const backendHost = detectBackendHost();
  const backendUrl = `http://${backendHost}:${ports.backend}`;

  const envFile = join(packagesDir, "app", ".env");

  if (!existsSync(envFile)) {
    return;
  }

  let content = readFileSync(envFile, "utf-8");
  let modified = false;

  const regex = new RegExp(`^VITE_API_URL=.*$`, "m");
  if (regex.test(content)) {
    const newLine = `VITE_API_URL=${backendUrl}`;
    content = content.replace(regex, newLine);
    modified = true;
  }

  if (modified) {
    writeFileSync(envFile, content);
    const relativePath = envFile.replace(process.cwd() + "/", "");
    logCli(`  ↳ Sincronizado VITE_API_URL en ${relativePath}`);
  }
}

/**
 * Detecta el host del backend para usar en VITE_API_URL.
 * Si no puede detectarlo, usa localhost.
 */
function detectBackendHost(): string {
  return process.env.AVILEO_DEV_HOST?.trim() || "localhost";
}
