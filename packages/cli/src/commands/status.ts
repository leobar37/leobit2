import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, checkServiceRunning, getAllRunningServices } from "@/services/config-manager";
import { logCli, logError } from "@/services/logger";
import { getAllServiceNames } from "@/services/config-resolver";

export function createStatusCommand(): Command {
  const command = new Command("status");

  command
    .description("Muestra que servicios estan corriendo y en que puerto. Detecta el estado real (no solo lo que dice config.json).")
    .option("--json", "Salida en formato JSON")
    .action(async (options: { json?: boolean }) => {
      const config = loadConfig();

      if (!config) {
        if (options.json) {
          console.log(JSON.stringify({ error: "No hay configuración. Ejecuta `avileo dev` primero." }, null, 2));
        } else {
          logError("No se encontró configuración. Ejecuta `avileo dev` primero.");
        }
        process.exit(1);
      }

      const services = getAllServiceNames();
      const results: Array<{
        name: string;
        port: number;
        url: string;
        isRunning: boolean;
      }> = [];

      for (const name of services) {
        const svc = config.services[name as keyof typeof config.services];
        if (!svc) continue;

        const isRunning = await checkServiceRunning(name as keyof typeof config.services);
        results.push({
          name,
          port: svc.port,
          url: svc.url,
          isRunning,
        });
      }

      if (options.json) {
        console.log(JSON.stringify({
          services: results,
          summary: {
            total: results.length,
            running: results.filter((r) => r.isRunning).length,
            stopped: results.filter((r) => !r.isRunning).length,
          },
        }, null, 2));
        return;
      }

      // Tabla visual
      console.log("");
      console.log(chalk.bold("  Estado de servicios Avileo"));
      console.log(chalk.dim("  ─────────────────────────────────────────"));

      for (const r of results) {
        const statusIcon = r.isRunning ? chalk.green("●") : chalk.gray("○");
        const statusText = r.isRunning
          ? chalk.green("corriendo")
          : chalk.gray("detenido");
        const name = chalk.bold(r.name.padEnd(10));
        const url = chalk.dim(r.url.padEnd(25));
        console.log(`  ${statusIcon} ${name} ${url} ${statusText}`);
      }

      console.log(chalk.dim("  ─────────────────────────────────────────"));

      const runningCount = results.filter((r) => r.isRunning).length;
      const stoppedCount = results.length - runningCount;

      if (runningCount === results.length) {
        console.log(chalk.green(`\n  ✓ Todos los servicios están corriendo`));
      } else if (runningCount === 0) {
        console.log(chalk.gray(`\n  ○ Ningún servicio está corriendo. Ejecuta: avileo dev`));
      } else {
        console.log(`\n  ${chalk.green(String(runningCount))} corriendo, ${chalk.gray(String(stoppedCount))} detenidos`);
      }

      console.log("");
    });

  return command;
}
