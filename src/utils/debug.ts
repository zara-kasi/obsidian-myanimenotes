import type MyAnimeNotesPlugin from '../main';

/**
 * Debug logger that respects the debugMode setting
 * Only logs when debugMode is enabled in plugin settings
 */
export class DebugLogger {
  constructor(private plugin: MyAnimeNotesPlugin, private prefix: string = '') {}

  /**
   * Log a debug message (only if debug mode is enabled)
   * @param message Main message to log
   * @param args Additional arguments to log
   */
  log(message: string, ...args: any[]): void {
    if (this.plugin.settings.debugMode) {
      const fullMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
      console.debug(fullMessage, ...args);
    }
  }

  /**
   * Create a child logger with a combined prefix
   * Useful for sub-modules or specific contexts
   * @param subPrefix Additional prefix to add
   */
  child(subPrefix: string): DebugLogger {
    const newPrefix = this.prefix 
      ? `${this.prefix}:${subPrefix}` 
      : subPrefix;
    return new DebugLogger(this.plugin, newPrefix);
  }
}

/**
 * Creates a debug logger instance
 * @param plugin Plugin instance
 * @param prefix Optional prefix for all log messages
 */
export function createDebugLogger(plugin: MyAnimeNotesPlugin, prefix?: string): DebugLogger {
  return new DebugLogger(plugin, prefix);
}
