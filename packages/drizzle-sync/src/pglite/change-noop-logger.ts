/**
 * NoOp Logger
 * Default logger implementation that does nothing.
 * Used when no logger is injected.
 */

import type { ISyncLogger } from "../core";

export class NoOpLogger implements ISyncLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug?(): void {}
}
