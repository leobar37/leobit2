import { connect } from "node:net";

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1");
    socket.on("connect", () => {
      socket.end();
      resolve(false); // Puerto ocupado
    });
    socket.on("error", () => {
      resolve(true); // Puerto libre
    });
  });
}

export async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No se encontró puerto disponible desde ${startPort} después de ${maxAttempts} intentos`);
}

export interface DiscoveredPorts {
  backend: number;
  app: number;
  dashboard: number;
}

const DEFAULT_PORTS: DiscoveredPorts = {
  backend: 3000,
  app: 3002,
  dashboard: 3099,
};

export async function discoverAllPorts(): Promise<DiscoveredPorts> {
  const assigned = new Set<number>();

  const backend = await findAvailablePort(DEFAULT_PORTS.backend);
  assigned.add(backend);

  // Ensure app port doesn't collide with backend
  let app = await findAvailablePort(DEFAULT_PORTS.app);
  while (assigned.has(app)) {
    app = await findAvailablePort(app + 1);
  }
  assigned.add(app);

  // Dashboard usa puerto fijo 5174
  const dashboard = 5174;
  if (!await isPortAvailable(dashboard)) {
    throw new Error(
      `Puerto ${dashboard} ocupado. Libéralo o usa \`avileo dashboard --port <otro>\`.`
    );
  }
  assigned.add(dashboard);

  return { backend, app, dashboard };
}
