import { Command } from "commander";
import { createLogServer } from "@/services/log-server";
import { ensureDashboardBuild } from "@/services/dashboard-builder";
import { logCli, logSuccess, logError } from "@/services/logger";
import { openBrowser } from "@/services/browser-launcher";

export function createDashboardCommand(): Command {
  const command = new Command("dashboard");

  command
    .description("Abre el dashboard web de logs con streaming en vivo (SSE). Si no esta construido, lo compila automaticamente con Vite.")
    .option("--port <port>", "Puerto del dashboard", "5174")
    .option("--no-browser", "No abrir navegador automáticamente")
    .option("--force-build", "Forzar reconstrucción del dashboard")
    .option("--skip-build", "Saltar build del dashboard (error si no existe)")
    .action(async (options: {
      port?: string;
      browser?: boolean;
      forceBuild?: boolean;
      skipBuild?: boolean;
    }) => {
      const port = parseInt(options.port ?? "3099", 10);

      logCli("Iniciando dashboard de logs...");

      try {
        await ensureDashboardBuild({
          force: options.forceBuild,
          skip: options.skipBuild,
        });
      } catch (error) {
        logError(String(error));
        process.exit(1);
      }

      try {
        const server = createLogServer(port);
        logSuccess(`Dashboard listo en http://localhost:${port}`);

        if (options.browser !== false) {
          openBrowser(`http://localhost:${port}`);
        }

        logCli("Presiona Ctrl+C para detener.");

        // Keep process alive
        await new Promise(() => {});
      } catch (error) {
        logError(`Error al iniciar dashboard: ${error}`);
        process.exit(1);
      }
    });

  return command;
}
