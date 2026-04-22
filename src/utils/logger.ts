import { environment } from '../config/environment';

// Suppress console logging in production
if (environment !== 'development') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = () => {};
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatEntry(entry: LogEntry): string {
    const dataStr = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
    const stackStr = entry.stack ? `\nStack: ${entry.stack}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}${stackStr}`;
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const formatted = this.formatEntry(entry);
    
    if (environment === 'development') {
      // Suppress 404 network errors in console
      if (level === 'error' && data && typeof data === 'object' && 'additionalData' in data) {
        const additionalData = (data as { additionalData?: { status?: number; url?: string } }).additionalData;
        if (additionalData?.status === 404) {
          return; // Don't log 404 errors to console
        }
      }
      
      switch (level) {
        case 'error':
          console.error(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'debug':
          console.debug(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();