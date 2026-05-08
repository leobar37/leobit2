#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { createDevCommand } from "@/commands/dev";
import { createLogsCommand } from "@/commands/logs";
import { createDashboardCommand } from "@/commands/dashboard";
import { createStatusCommand } from "@/commands/status";

const program = new Command();

program
  .name("avileo")
  .description("CLI de Avileo — Levanta servicios, consulta logs y monitorea el estado de tu proyecto.")
  .version("1.0.0")
  .addHelpText("after", `
${chalk.bold("Solucion de problemas comunes:")}

  ${chalk.yellow("¿Servicio no arranca?")}
    Revisa los logs:  ${chalk.cyan("avileo logs --level error")}
    Tambien puedes abrir el dashboard en el navegador:
      ${chalk.cyan("avileo dashboard")}

  ${chalk.yellow("¿Puerto ocupado?")}
    Verifica que servicios estan corriendo:
      ${chalk.cyan("avileo status")}
    Mata los procesos en los puertos conflictivos y vuelve a intentar.

  ${chalk.yellow("¿No hay logs?")}
    Ejecuta ${chalk.cyan("avileo dev")} primero para generar logs.
    Los logs se guardan en el directorio ${chalk.dim("logs/")}.

  ${chalk.yellow("¿Dashboard no carga?")}
    Reconstruye el dashboard:
      ${chalk.cyan("avileo dashboard --force-build")}
    O usa un puerto alternativo:
      ${chalk.cyan("avileo dashboard --port 4000")}

  ${chalk.yellow("¿Quieres ver solo un servicio?")}
    ${chalk.cyan("avileo dev --only backend")}
    ${chalk.cyan("avileo dev --only backend,app")}

  ${chalk.dim("Logs persistentes:")} ${chalk.dim("logs/backend.jsonl, logs/app.jsonl")}
  ${chalk.dim("Configuracion:")}   ${chalk.dim("config.json (auto-generado)")}
  ${chalk.dim("Dashboard API:")}   ${chalk.dim("GET /api/logs | GET /api/logs/stream (SSE)")}
`);

program.addCommand(createDevCommand());
program.addCommand(createLogsCommand());
program.addCommand(createDashboardCommand());
program.addCommand(createStatusCommand());

// Default help when no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
