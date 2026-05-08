import chalk from "chalk";

const PREFIX_WIDTH = 8;

const COLORS: Record<string, (text: string) => string> = {
  backend: chalk.green,
  app: chalk.blue,
};

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function getPrefix(name: string): string {
  const upper = name.toUpperCase();
  const padded = upper.padStart(PREFIX_WIDTH).slice(-PREFIX_WIDTH);
  return padded;
}

export function logService(name: string, message: string, isError = false): void {
  const colorFn = COLORS[name] || chalk.white;
  const prefix = colorFn(`[${getPrefix(name)}]`);
  const time = chalk.dim(`[${formatTime()}]`);
  const output = isError ? chalk.red(message) : message;
  console.log(`${time} ${prefix} ${output}`);
}

export function logCli(message: string): void {
  const prefix = chalk.yellow("[    CLI]");
  const time = chalk.dim(`[${formatTime()}]`);
  console.log(`${time} ${prefix} ${message}`);
}

export function logError(message: string): void {
  const prefix = chalk.red("[   ERROR]");
  const time = chalk.dim(`[${formatTime()}]`);
  console.error(`${time} ${prefix} ${chalk.red(message)}`);
}

export function logSuccess(message: string): void {
  const prefix = chalk.green("[     OK ]");
  const time = chalk.dim(`[${formatTime()}]`);
  console.log(`${time} ${prefix} ${chalk.green(message)}`);
}

export function logWarning(message: string): void {
  const prefix = chalk.yellow("[   WARN]");
  const time = chalk.dim(`[${formatTime()}]`);
  console.log(`${time} ${prefix} ${chalk.yellow(message)}`);
}

export function logTable(services: { name: string; url: string; status: string }[]): void {
  console.log("");
  console.log(chalk.bold("  Servicios en ejecución:"));
  console.log(chalk.dim("  ─────────────────────────────────────────"));
  for (const svc of services) {
    const colorFn = COLORS[svc.name] || chalk.white;
    const name = colorFn(svc.name.padEnd(10));
    const status = svc.status === "ready" ? chalk.green("✓ ready") : chalk.yellow("⟳ starting");
    console.log(`  ${name} ${svc.url.padEnd(30)} ${status}`);
  }
  console.log(chalk.dim("  ─────────────────────────────────────────"));
  console.log("");
}
