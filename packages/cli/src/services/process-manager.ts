import type { Subprocess } from "bun";
import type { ServiceDefinition } from "./config-resolver";
import { getServiceCwd } from "./config-resolver";
import { logService, logCli, logError, logSuccess, logTable, logWarning } from "./logger";
import { clearAllLogs, parseAndWrite } from "./log-writer";
import { updateServiceRunningState, loadConfig } from "./config-manager";
import type { AvileoConfig } from "./config-manager";

interface ManagedProcess {
  subprocess: Subprocess;
  service: ServiceDefinition;
  ready: boolean;
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private abortController = new AbortController();

  async spawnAll(
    services: ServiceDefinition[],
  ): Promise<void> {
    logCli(`Iniciando ${services.length} servicio(s)...`);

    // Limpiar logs de sesiones anteriores
    clearAllLogs(services.map((s) => s.name));
    logCli("Logs limpiados");

    // Spawn all processes in parallel
    const spawnPromises = services.map((svc) =>
      this.spawn(svc),
    );
    await Promise.all(spawnPromises);

    // Wait for health checks
    await this.waitForAllReady(services);

    // Print summary table
    const tableData = services.map((svc) => ({
      name: svc.name,
      url: `http://localhost:${svc.port}`,
      status: this.processes.get(svc.name)?.ready ? "ready" : "starting",
    }));
    logTable(tableData);

    logSuccess("Todos los servicios están listos. Presiona Ctrl+C para detener.");
  }

  markServiceRunning(name: keyof AvileoConfig["services"], running: boolean): void {
    updateServiceRunningState(name, running);
  }

  private async spawn(
    service: ServiceDefinition,
  ): Promise<void> {
    const cwd = getServiceCwd(service);
    const env: Record<string, string | undefined> = {
      ...process.env,
      FORCE_COLOR: "1",
      PORT: String(service.port),
    };

    // Pasar FRONTEND_URL al backend para CORS
    if (service.name === "backend") {
      const config = loadConfig();
      if (config?.services.app?.url) {
        env.FRONTEND_URL = config.services.app.url;
      }
    }

    logCli(`Iniciando ${service.name} en puerto ${service.port}...`);

    const cmd = this.getDevCommand(service);

    const subprocess = Bun.spawn({
      cmd,
      cwd,
      env,
      stdout: "pipe",
      stderr: "pipe",
      onExit: (proc, exitCode) => {
        this.handleExit(service, exitCode ?? 0);
      },
    });

    this.processes.set(service.name, {
      subprocess,
      service,
      ready: false,
    });

    // Mark as running in config
    this.markServiceRunning(service.name, true);

    // Start reading streams immediately
    this.readStream(service, subprocess.stdout, false);
    this.readStream(service, subprocess.stderr, true);
  }

  private async readStream(
    service: ServiceDefinition,
    stream: ReadableStream<Uint8Array>,
    isError: boolean
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            logService(service.name, line, isError);
            parseAndWrite(service.name, line);
          }
        }
      }
    } catch {
      // Stream closed
    }
  }

  private async waitForAllReady(services: ServiceDefinition[]): Promise<void> {
    const checks = services.map((svc) => this.waitForReady(svc));
    await Promise.all(checks);
  }

  private async waitForReady(service: ServiceDefinition): Promise<void> {
    const maxAttempts = 60;
    const delay = 500;

    for (let i = 0; i < maxAttempts; i++) {
      // Check if process is still running
      const managed = this.processes.get(service.name);
      if (!managed) return;

      const isReady = await this.checkPort(service.port);
      if (isReady) {
        managed.ready = true;
        logService(service.name, `✓ Listo en http://localhost:${service.port}`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    logError(`Timeout esperando ${service.name} en puerto ${service.port}`);
  }

  private async checkPort(port: number): Promise<boolean> {
    try {
      const socket = await Bun.connect({
        hostname: "127.0.0.1",
        port: port,
      } as any);
      socket.end();
      return true;
    } catch {
      return false;
    }
  }

  private handleExit(service: ServiceDefinition, exitCode: number): void {
    const managed = this.processes.get(service.name);
    if (!managed) return;

    if (exitCode !== 0 && exitCode !== null) {
      logError(`${service.name} terminó con código ${exitCode}`);
    }

    this.processes.delete(service.name);
    this.markServiceRunning(service.name, false);

    // If any process exits unexpectedly, kill all others
    if (this.processes.size > 0 && exitCode !== 0) {
      logCli("Un servicio falló. Deteniendo los demás...");
      this.killAll();
    }
  }

  private getDevCommand(service: ServiceDefinition): string[] {
    if (service.name === "app") {
      return ["bun", "run", "react-router", "dev", "--port", String(service.port)];
    }
    // backend
    return ["bun", "run", "--watch", "--no-clear-screen", "src/index.ts"];
  }

  async killService(name: string, timeoutMs = 5000): Promise<boolean> {
    const managed = this.processes.get(name);
    if (!managed) {
      // Try to kill by finding the process externally using config port
      const config = loadConfig();
      const port = config?.services[name as keyof typeof config.services]?.port;
      return this.killExternalProcess(name, port);
    }

    logCli(`Deteniendo ${name}...`);

    try {
      managed.subprocess.kill(15); // SIGTERM
      logService(name, "Señal SIGTERM enviada");

      // Wait for process to actually die
      const died = await this.waitForProcessDeath(name, timeoutMs);
      if (!died) {
        logWarning(`${name} no respondió a SIGTERM, enviando SIGKILL...`);
        try {
          managed.subprocess.kill(9); // SIGKILL
        } catch {
          // Already dead
        }
        await this.waitForProcessDeath(name, 2000);
      }

      this.processes.delete(name);
      this.markServiceRunning(name, false);
      return true;
    } catch {
      this.processes.delete(name);
      this.markServiceRunning(name, false);
      return false;
    }
  }

  private async killExternalProcess(name: string, port?: number): Promise<boolean> {
    // Find and kill process by port using lsof/pkill
    try {
      if (port) {
        // Try to find PID by port and kill it
        const { stdout } = await Bun.$`lsof -ti:${port}`.quiet().nothrow();
        const pid = stdout.toString().trim();
        if (pid) {
          await Bun.$`kill -15 ${pid}`.quiet().nothrow();
          await new Promise((r) => setTimeout(r, 2000));
          // Check if still running
          const check = await Bun.$`kill -0 ${pid}`.quiet().nothrow();
          if (check.exitCode !== 0) {
            this.markServiceRunning(name, false);
            return true;
          }
          // SIGKILL
          await Bun.$`kill -9 ${pid}`.quiet().nothrow();
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async waitForProcessDeath(name: string, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    const managed = this.processes.get(name);
    const config = loadConfig();
    const port = managed?.service.port ?? config?.services[name as keyof typeof config.services]?.port;

    if (!port) return true;

    while (Date.now() - start < timeoutMs) {
      const portFree = await this.checkPort(port);
      if (portFree) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }

  async restartServices(services: ServiceDefinition[]): Promise<void> {
    for (const svc of services) {
      await this.killService(svc.name);
    }

    // Small delay to ensure ports are freed
    await new Promise((r) => setTimeout(r, 1000));

    // Re-spawn all services
    await this.spawnAll(services);
  }

  killAll(): void {
    logCli("Deteniendo todos los servicios...");

    for (const [name, managed] of this.processes) {
      try {
        managed.subprocess.kill(15); // SIGTERM
        this.markServiceRunning(name, false);
        logService(name, "Señal SIGTERM enviada");
      } catch {
        // Process may already be dead
      }
    }

    this.processes.clear();
    this.abortController.abort();
  }

  setupGracefulShutdown(): void {
    const shutdown = () => {
      this.killAll();
      // Give processes time to clean up
      setTimeout(() => {
        process.exit(0);
      }, 500);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
