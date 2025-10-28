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
  enableStorage: boolean;
}

export class Logger {
  private options: LoggerOptions;
  private logs: Array<{
    level: LogLevel;
    message: string;
    timestamp: number;
    args: any[];
  }> = [];

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      prefix: "[Indeks]",
      enableConsole: true,
      enableStorage: false,
      ...options,
    };
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.options.level) return;

    const timestamp = Date.now();
    const logEntry = { level, message, timestamp, args };

    if (this.options.enableStorage) {
      this.logs.push(logEntry);
    }

    if (this.options.enableConsole) {
      const formattedMessage = `${this.options.prefix} ${message}`;

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, ...args);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, ...args);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, ...args);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, ...args);
          break;
      }
    }
  }

  getLogs(): Array<{
    level: LogLevel;
    message: string;
    timestamp: number;
    args: any[];
  }> {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  setConsoleEnabled(enabled: boolean): void {
    this.options.enableConsole = enabled;
  }
}
