import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import type { LogEntry } from "./log-writer";

function findProjectRoot(): string {
  let current = process.cwd();

  while (current !== resolve(current, "..")) {
    if (
      existsSync(join(current, "package.json")) &&
      existsSync(join(current, "packages"))
    ) {
      return current;
    }
    current = resolve(current, "..");
  }

  return process.cwd();
}

const LOGS_DIR = join(findProjectRoot(), "logs");

function getLogFile(service: string): string {
  return join(LOGS_DIR, `${service}.jsonl`);
}

export interface LogFilter {
  service?: string;
  level?: string;
  grep?: string;
  lines?: number;
  since?: string;
}

function matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter.level && entry.level !== filter.level) {
    return false;
  }
  if (filter.grep && !entry.msg.toLowerCase().includes(filter.grep.toLowerCase())) {
    return false;
  }
  if (filter.since) {
    const sinceDate = new Date(filter.since).getTime();
    const entryDate = new Date(entry.time).getTime();
    if (entryDate < sinceDate) {
      return false;
    }
  }
  return true;
}

async function readLinesReverse(filePath: string, maxLines: number): Promise<string[]> {
  const lines: string[] = [];

  try {
    const stream = createReadStream(filePath);
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      lines.push(line);
    }
  } catch {
    return [];
  }

  // Return last N lines
  if (maxLines > 0 && lines.length > maxLines) {
    return lines.slice(-maxLines);
  }
  return lines;
}

export async function readLogs(filter: LogFilter): Promise<LogEntry[]> {
  const services = filter.service
    ? filter.service.split(",").map((s) => s.trim().toLowerCase())
    : ["backend", "app"];
  const allEntries: LogEntry[] = [];
  const maxLines = filter.lines ?? 100;

  for (const service of services) {
    const file = getLogFile(service);
    const lines = await readLinesReverse(file, maxLines);

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as LogEntry;
        if (matchesFilter(entry, filter)) {
          allEntries.push(entry);
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  // Sort by time ascending
  allEntries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Apply global line limit after merge
  if (allEntries.length > maxLines) {
    return allEntries.slice(-maxLines);
  }

  return allEntries;
}

export interface LogStats {
  total: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
  byService: Record<string, { total: number; error: number; warn: number; info: number; debug: number }>;
}

export async function getLogStats(services?: string[]): Promise<LogStats> {
  const targetServices = services?.length
    ? services
    : ["backend", "app"];

  const stats: LogStats = {
    total: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    byService: {},
  };

  for (const service of targetServices) {
    const file = getLogFile(service);
    const lines = await readLinesReverse(file, 1000);

    const serviceStats = { total: 0, error: 0, warn: 0, info: 0, debug: 0 };

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as LogEntry;
        serviceStats.total++;
        serviceStats[entry.level]++;
        stats.total++;
        stats[entry.level]++;
      } catch {
        // Skip malformed lines
      }
    }

    if (serviceStats.total > 0) {
      stats.byService[service] = serviceStats;
    }
  }

  return stats;
}

export function formatLogEntry(entry: LogEntry): string {
  const time = new Date(entry.time).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const levelColors: Record<string, string> = {
    error: "\x1b[31m", // red
    warn: "\x1b[33m",  // yellow
    info: "\x1b[36m",  // cyan
    debug: "\x1b[90m", // gray
  };

  const reset = "\x1b[0m";
  const color = levelColors[entry.level] || "";
  const service = entry.service.padEnd(8);
  const level = entry.level.toUpperCase().padEnd(5);

  return `[${time}] [${service}] [${color}${level}${reset}] ${entry.msg}`;
}

export function formatStats(stats: LogStats): string {
  const lines: string[] = [];
  lines.push(`\x1b[1mResumen de logs (últimas 1000 líneas)\x1b[0m`);
  lines.push(`  Total: ${stats.total} | Errores: \x1b[31m${stats.error}\x1b[0m | Warnings: \x1b[33m${stats.warn}\x1b[0m | Info: \x1b[36m${stats.info}\x1b[0m | Debug: \x1b[90m${stats.debug}\x1b[0m`);
  lines.push("");

  for (const [service, s] of Object.entries(stats.byService)) {
    lines.push(`  \x1b[1m${service}\x1b[0m: ${s.total} total | \x1b[31m${s.error}\x1b[0m err | \x1b[33m${s.warn}\x1b[0m warn | \x1b[36m${s.info}\x1b[0m info | \x1b[90m${s.debug}\x1b[0m debug`);
  }

  return lines.join("\n");
}
