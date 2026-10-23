export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

type LogSubscriber = (entry: LogEntry) => void;

class StructuredLogger {
  private buffer: LogEntry[] = [];
  private maxBufferSize: number = 200;
  private subscribers: Set<LogSubscriber> = new Set();

  public log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level,
      module,
      message,
      data,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Always output to local console for dev visibility
    const prefix = `[OmniPulse:${module}][${level}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, data || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, data || '');
    } else if (level === 'INFO') {
      console.info(prefix, message, data || '');
    } else {
      console.debug(prefix, message, data || '');
    }

    this.subscribers.forEach((sub) => {
      try {
        sub(entry);
      } catch (err) {
        console.error('Logger subscriber threw error:', err);
      }
    });
  }

  public debug(module: string, message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', module, message, data);
  }

  public info(module: string, message: string, data?: Record<string, unknown>): void {
    this.log('INFO', module, message, data);
  }

  public warn(module: string, message: string, data?: Record<string, unknown>): void {
    this.log('WARN', module, message, data);
  }

  public error(module: string, message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', module, message, data);
  }

  public getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
  }

  public subscribe(sub: LogSubscriber): () => void {
    this.subscribers.add(sub);
    return () => {
      this.subscribers.delete(sub);
    };
  }
}

export const appLogger = new StructuredLogger();
