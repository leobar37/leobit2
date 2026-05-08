export interface ServiceConfig {
  name: string;
  package: string;
  port: number;
  script: string;
  color: string;
  cwd: string;
}

export interface RunningProcess {
  process: Subprocess;
  config: ServiceConfig;
  ready: boolean;
  exitCode: number | null;
}

export interface Subprocess {
  pid: number;
  kill(signal?: number): void;
  exited: Promise<number>;
  stdout: ReadableStream;
  stderr: ReadableStream;
  stdin: WritableStream;
}
