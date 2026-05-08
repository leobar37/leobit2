import { Command } from "commander";
import { ProcessManager } from "@/services/process-manager";
import { getServices, getAllServiceNames } from "@/services/config-resolver";
import { logError, logCli, logSuccess, logWarning } from "@/services/logger";
import { discoverAllPorts } from "@/services/port-discovery";
import { saveConfig, checkServiceRunning, syncFrontendEnvFiles } from "@/services/config-manager";
import { openBrowser } from "@/services/browser-launcher";
import { createLogServer } from "@/services/log-server";
import { ensureDashboardBuild } from "@/services/dashboard-builder";

export function createDevCommand(): Command {
  const command = new Command("dev");

  command
    .description("Inicia backend, app y dashboard de logs. Los logs se guardan en logs/. Usa avileo logs para consultarlos, avileo status para ver el estado.")
    .option("--only <services>", "Solo iniciar servicios específicos (separados por coma)", (val) =>
      val.split(",").map((s) => s.trim().toLowerCase())
    )
    .option("--no-browser", "No abrir navegador automáticamente")
    .option("--no-dashboard", "No iniciar el dashboard de logs")
    .action(async (options: {
      only?: string[];
      browser?: boolean;
      dashboard?: boolean;
    }) => {
      // Validate service names
      if (options.only) {
        const validNames = getAllServiceNames();
        const invalid = options.only.filter((name) => !validNames.includes(name));
        if (invalid.length > 0) {
          logError(`Servicios inválidos: ${invalid.join(", ")}`);
          logError(`Servicios válidos: ${validNames.join(", ")}`);
          process.exit(1);
        }
      }

      // 1. Descubrir puertos disponibles
      logCli("Descubriendo puertos disponibles...");
      const ports = await discoverAllPorts();
      logCli(`Puertos asignados: backend=${ports.backend}, app=${ports.app}, dashboard=${ports.dashboard}`);

      // 2. Guardar configuración y sincronizar .env files
      saveConfig(ports);
      syncFrontendEnvFiles(ports);
      logCli("Configuración guardada en config.json");

      // 3. Iniciar dashboard inmediatamente (no espera servicios)
      if (options.dashboard !== false) {
        try {
          await ensureDashboardBuild({});
          createLogServer(ports.dashboard);
          logSuccess(`Dashboard listo en http://localhost:${ports.dashboard}`);

          // Abrir navegador en el dashboard por defecto
          if (options.browser !== false) {
            const dashboardUrl = `http://localhost:${ports.dashboard}`;
            logCli(`Abriendo dashboard: ${dashboardUrl}`);
            openBrowser(dashboardUrl);
          }
        } catch (err) {
          logError(`No se pudo iniciar el dashboard: ${err}`);
        }
      }

      // 4. Obtener servicios con puertos descubiertos
      let services = getServices(options.only);

      // 5. Detectar servicios ya en ejecución y filtrarlos
      const alreadyRunning: string[] = [];
      const toStart: typeof services = [];

      for (const svc of services) {
        const isRunning = await checkServiceRunning(svc.name as any);
        if (isRunning) {
          alreadyRunning.push(svc.name);
        } else {
          toStart.push(svc);
        }
      }

      if (alreadyRunning.length > 0) {
        logWarning(`Servicios ya en ejecución (omitidos): ${alreadyRunning.join(", ")}`);
        for (const name of alreadyRunning) {
          const svc = services.find((s) => s.name === name)!;
          logCli(`  ↳ ${name} disponible en http://localhost:${svc.port}`);
        }
      }

      if (toStart.length === 0) {
        logSuccess("Todos los servicios solicitados ya están en ejecución.");
        logCli("Usa `avileo status` para ver el estado de los servicios.");

        // Keep process alive (para mantener el dashboard si se inició)
        await new Promise(() => {});
        return;
      }

      logCli(`Iniciando ${toStart.length} servicio(s) nuevo(s)...`);

      // 6. Iniciar servicios (en paralelo, no bloquea el dashboard)
      const manager = new ProcessManager();
      manager.setupGracefulShutdown();
      await manager.spawnAll(toStart);

      logSuccess("Avileo está lista. Presiona Ctrl+C para detener.");

      // Keep process alive
      await new Promise(() => {
        // Infinite wait - processes run until Ctrl+C
      });
    });

  return command;
}
