import { Command } from "commander";
import { readLogs, formatLogEntry, getLogStats, formatStats } from "@/services/log-reader";
import type { LogFilter } from "@/services/log-reader";
import { logError } from "@/services/logger";
import { getAllServiceNames } from "@/services/config-resolver";

const VALID_SERVICES = getAllServiceNames();
const VALID_LEVELS = ["error", "warn", "info", "debug"];

export function createLogsCommand(): Command {
  const command = new Command("logs");

  command
    .description("Muestra logs persistentes de los servicios. Sin servicios corriendo tambien funciona — los logs se guardan en disco (logs/*.jsonl). Usa avileo logs --help para todas las opciones.")
    .option("--service <name>", "Filtrar por servicio (backend|app). Usa comas para multiples: backend,app")
    .option("--level <level>", "Filtrar por nivel: error|warn|info|debug")
    .option("--grep <text>", "Buscar texto en el mensaje")
    .option("--lines <n>", "Ultimas N lineas", "100")
    .option("--since <iso>", "Desde timestamp ISO")
    .option("-f, --follow", "Tail en tiempo real")
    .option("--format <fmt>", "Salida: text|json", "text")
    .option("--stats", "Mostrar resumen de cantidades por nivel y servicio")
    .action(async (options: {
      service?: string;
      level?: string;
      grep?: string;
      lines?: string;
      since?: string;
      follow?: boolean;
      format?: string;
      stats?: boolean;
    }) => {
      // Validate services (supports comma-separated)
      const requestedServices = options.service
        ? options.service.split(",").map((s) => s.trim().toLowerCase())
        : [];
      const invalidServices = requestedServices.filter(
        (s) => !VALID_SERVICES.includes(s)
      );
      if (invalidServices.length > 0) {
        logError(`Servicios inválidos: ${invalidServices.join(", ")}`);
        logError(`Servicios válidos: ${VALID_SERVICES.join(", ")}`);
        process.exit(1);
      }

      if (options.level && !VALID_LEVELS.includes(options.level)) {
        logError(`Nivel inválido: ${options.level}`);
        logError(`Niveles válidos: ${VALID_LEVELS.join(", ")}`);
        process.exit(1);
      }

      // Stats mode: just show counts, no full logs
      if (options.stats) {
        const stats = await getLogStats(requestedServices.length > 0 ? requestedServices : undefined);
        console.log(formatStats(stats));
        return;
      }

      const filter: LogFilter = {
        service: options.service,
        level: options.level,
        grep: options.grep,
        lines: parseInt(options.lines ?? "100", 10),
        since: options.since,
      };

      if (options.follow) {
        await tailLogs(filter, options.format ?? "text");
      } else {
        await showLogs(filter, options.format ?? "text");
      }
    });

  return command;
}

async function showLogs(filter: LogFilter, format: string): Promise<void> {
  const entries = await readLogs(filter);

  if (entries.length === 0) {
    console.log("No se encontraron logs. Ejecuta `bun run avileo dev` primero para generar logs.");
    return;
  }

  if (format === "json") {
    console.log(JSON.stringify(entries, null, 2));
  } else {
    for (const entry of entries) {
      console.log(formatLogEntry(entry));
    }
  }
}

async function tailLogs(filter: LogFilter, format: string): Promise<void> {
  console.log("Siguiendo logs (Ctrl+C para salir)...\n");

  let lastCount = 0;

  const poll = async () => {
    const entries = await readLogs(filter);

    if (entries.length > lastCount) {
      const newEntries = entries.slice(lastCount);
      for (const entry of newEntries) {
        if (format === "json") {
          console.log(JSON.stringify(entry));
        } else {
          console.log(formatLogEntry(entry));
        }
      }
      lastCount = entries.length;
    }
  };

  // Poll cada 500ms
  const interval = setInterval(poll, 500);

  // Cleanup on exit
  process.on("SIGINT", () => {
    clearInterval(interval);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(interval);
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}
