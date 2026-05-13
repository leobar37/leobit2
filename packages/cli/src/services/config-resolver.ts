import path from "node:path";
import { loadConfig } from "./config-manager";

export interface ServiceDefinition {
  name: string;
  packageName: string;
  port: number;
  color: string;
}

const DEFAULT_PORTS: Record<string, number> = {
  backend: 3000,
  app: 3002,
  dashboard: 5173,
};

const COLORS: Record<string, string> = {
  backend: "#22c55e",
  app: "#3b82f6",
};

function getColor(name: string): string {
  return COLORS[name] ?? "#ffffff";
}

function getServicePort(name: string): number {
  const config = loadConfig();
  if (config) {
    const svc = config.services[name as keyof typeof config.services];
    if (svc) {
      return svc.port;
    }
  }
  return DEFAULT_PORTS[name] ?? 3000;
}

export function buildServices(filter?: string[]): ServiceDefinition[] {
  const all: ServiceDefinition[] = [
    {
      name: "backend",
      packageName: "@avileo/backend",
      port: getServicePort("backend"),
      color: getColor("backend"),
    },
    {
      name: "app",
      packageName: "@avileo/app",
      port: getServicePort("app"),
      color: getColor("app"),
    },
  ];

  if (!filter || filter.length === 0) {
    return all;
  }
  return all.filter((s) => filter.includes(s.name));
}

export function getServices(filter?: string[]): ServiceDefinition[] {
  return buildServices(filter);
}

export function getServiceCwd(service: ServiceDefinition): string {
  const packageDir = service.packageName.replace("@avileo/", "");
  return path.resolve(process.cwd(), "packages", packageDir);
}

export function getAllServiceNames(): string[] {
  return ["backend", "app"];
}
