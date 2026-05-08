export interface LogEntry {
  time: string;
  service: string;
  level: "error" | "warn" | "info" | "debug";
  msg: string;
}

export interface LogResponse {
  entries: LogEntry[];
  count: number;
}

export interface ServiceConfigEntry {
  port: number;
  url: string;
}

export interface AvileoConfig {
  services: {
    backend: ServiceConfigEntry;
    app: ServiceConfigEntry;
  };
  lastRun: string;
}

export interface ConfigResponse {
  config: AvileoConfig | null;
}
