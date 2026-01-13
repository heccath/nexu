export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
  json?: boolean;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  prefix?: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const LOG_COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private showTimestamp: boolean;
  private useColors: boolean;
  private jsonOutput: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.prefix = options.prefix ?? '';
    this.showTimestamp = options.timestamp ?? true;
    this.useColors = options.colors ?? true;
    this.jsonOutput = options.json ?? false;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private formatPretty(level: Exclude<LogLevel, 'silent'>, message: string): string {
    const parts: string[] = [];

    if (this.showTimestamp) {
      const time = new Date().toISOString();
      parts.push(this.useColors ? `${DIM}[${time}]${RESET}` : `[${time}]`);
    }

    const levelTag = `[${level.toUpperCase()}]`;
    if (this.useColors) {
      parts.push(`${LOG_COLORS[level]}${BOLD}${levelTag}${RESET}`);
    } else {
      parts.push(levelTag);
    }

    if (this.prefix) {
      parts.push(this.useColors ? `${DIM}[${this.prefix}]${RESET}` : `[${this.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  private log(level: Exclude<LogLevel, 'silent'>, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const consoleMethod =
      level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';

    if (this.jsonOutput) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(this.prefix && { prefix: this.prefix }),
        ...(context && { context }),
      };
      // eslint-disable-next-line no-console
      console[consoleMethod](this.formatJson(entry));
    } else {
      const formatted = this.formatPretty(level, message);
      if (context) {
        // eslint-disable-next-line no-console
        console[consoleMethod](formatted, context);
      } else {
        // eslint-disable-next-line no-console
        console[consoleMethod](formatted);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      timestamp: this.showTimestamp,
      colors: this.useColors,
      json: this.jsonOutput,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.shouldLog(level);
  }

  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { durationMs: Math.round(duration * 100) / 100 });
    };
  }

  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const end = this.time(label);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  group(label: string): void {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    console.group(this.formatPretty('debug', label));
  }

  groupEnd(): void {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    console.groupEnd();
  }

  table(data: unknown): void {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    console.table(data);
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}
