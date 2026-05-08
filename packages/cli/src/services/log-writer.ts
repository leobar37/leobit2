import { appendFileSync, mkdirSync, truncateSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface LogEntry {
  time: string;
  service: string;
  level: "error" | "warn" | "info" | "debug";
  msg: string;
}

const LOGS_DIR = join(process.cwd(), "logs");

function ensureLogsDir(): void {
  mkdirSync(LOGS_DIR, { recursive: true });
}

function getLogFile(service: string): string {
  return join(LOGS_DIR, `${service}.jsonl`);
}

function detectLevel(line: string): LogEntry["level"] {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("err:") || lower.includes("❌") || lower.includes("fail")) {
    return "error";
  }
  if (lower.includes("warn") || lower.includes("warning") || lower.includes("⚠️")) {
    return "warn";
  }
  if (lower.includes("debug") || lower.includes("trace")) {
    return "debug";
  }
  return "info";
}

export function clearLog(service: string): void {
  ensureLogsDir();
  const file = getLogFile(service);
  if (existsSync(file)) {
    truncateSync(file, 0);
  }
}

export function clearAllLogs(services: string[]): void {
  for (const service of services) {
    clearLog(service);
  }
}

export function writeLog(entry: LogEntry): void {
  ensureLogsDir();
  const file = getLogFile(entry.service);
  const line = JSON.stringify(entry) + "\n";
  appendFileSync(file, line);
}

export function parseAndWrite(service: string, line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  const entry: LogEntry = {
    time: new Date().toISOString(),
    service,
    level: detectLevel(trimmed),
    msg: trimmed,
  };

  writeLog(entry);
}
