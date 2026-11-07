export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level: LogLevel;
  prefix: string;
  enableConsole: boolean;
}

const CONSOLE_METHOD = {
  [LogLevel.DEBUG]: "debug",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error",
} as const;

export class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      prefix: "[Indeks]",
      enableConsole: true,
      ...options,
    };
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, args);
  }

  setConsoleEnabled(enabled: boolean): void {
    this.options.enableConsole = enabled;
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (!this.options.enableConsole || level < this.options.level) return;
    console[CONSOLE_METHOD[level]](`${this.options.prefix} ${message}`, ...args);
  }
}
