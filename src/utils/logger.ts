import Constants from 'expo-constants';
import { sentryCaptureError, sentryBreadcrumb } from './sentry';

// Níveis de log
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// Configuração do logger
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableCrashlytics: boolean;
  prefix: string;
  timestamp: boolean;
}

// Configuração padrão
const defaultConfig: LoggerConfig = {
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR,
  enableConsole: __DEV__ ? true : false,
  enableFile: false, // Pode ser habilitado futuramente
  enableCrashlytics: !__DEV__, // Apenas em produção
  prefix: '',
  timestamp: true,
};

class Logger {
  private config: LoggerConfig;
  private context: string;

  constructor(context: string = 'App', config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...defaultConfig, ...config };
  }

  private formatMessage(
    level: string,
    message: string,
    ...args: any[]
  ): string {
    const timestamp = this.config.timestamp
      ? new Date().toISOString().replace('T', ' ').slice(0, 19)
      : '';
    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    const contextStr = this.context ? `[${this.context}] ` : '';

    return `${timestamp ? `${timestamp} ` : ''}${prefix}${level} ${contextStr}${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private logToConsole(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.config.enableConsole || !this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(
      LogLevel[level],
      message,
      ...args
    );

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`🐛 ${formattedMessage}`, ...args);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️  ${formattedMessage}`, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️  ${formattedMessage}`, ...args);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${formattedMessage}`, ...args);
        break;
    }
  }

  // P3-5: encaminha pro Sentry (no-op se não houver DSN). WARN/INFO viram
  // breadcrumb; ERROR vira captureException (com o Error, se houver) ou
  // captureMessage. Toda PII é mascarada dentro de src/utils/sentry.ts.
  private logToCrashlytics(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.config.enableCrashlytics || !this.shouldLog(level)) {
      return;
    }

    const flat = args.flat();
    const ctx = `[${this.context}] ${message}`;

    if (level === LogLevel.ERROR) {
      const error = flat.find(a => a instanceof Error);
      sentryCaptureError(ctx, error);
    } else if (level === LogLevel.WARN) {
      sentryBreadcrumb('warning', ctx);
    } else if (level === LogLevel.INFO) {
      sentryBreadcrumb('info', ctx);
    }
  }

  // Métodos públicos de logging
  debug(message: string, ...args: any[]): void {
    this.logToConsole(LogLevel.DEBUG, message, ...args);
    this.logToCrashlytics(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logToConsole(LogLevel.INFO, message, ...args);
    this.logToCrashlytics(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logToConsole(LogLevel.WARN, message, ...args);
    this.logToCrashlytics(LogLevel.WARN, message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    this.logToConsole(LogLevel.ERROR, message, error ? [error, ...args] : args);
    this.logToCrashlytics(
      LogLevel.ERROR,
      message,
      error ? [error, ...args] : args
    );
  }

  // Métodos de conveniência
  auth(message: string, ...args: any[]): void {
    this.debug(`[Auth] ${message}`, ...args);
  }

  storage(message: string, ...args: any[]): void {
    this.debug(`[Storage] ${message}`, ...args);
  }

  network(message: string, ...args: any[]): void {
    this.debug(`[Network] ${message}`, ...args);
  }

  ui(message: string, ...args: any[]): void {
    this.debug(`[UI] ${message}`, ...args);
  }

  // Criar novo logger com contexto
  createContext(context: string): Logger {
    return new Logger(context, this.config);
  }

  // Configurar o logger
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Métodos para performance
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`⏱️  [${this.context}] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`⏱️  [${this.context}] ${label}`);
    }
  }

  // Log estruturado para analytics
  event(eventName: string, data?: Record<string, any>): void {
    const message = `Event: ${eventName}`;
    this.info(message, data);

    // Integração futura com analytics
    // analytics().logEvent(eventName, data);
  }

  // Log de performance crítica
  performance(operation: string, duration: number, metadata?: any): void {
    const message = `Performance: ${operation} took ${duration}ms`;
    if (duration > 1000) {
      this.warn(message, metadata);
    } else {
      this.debug(message, metadata);
    }
  }
}

// Instância padrão do logger
export const logger = new Logger('App');

// Loggers específicos por módulo
export const authLogger = new Logger('Auth');
export const storageLogger = new Logger('Storage');
export const networkLogger = new Logger('Network');
export const uiLogger = new Logger('UI');

// Função para configurar todos os loggers
export function configureLogger(config: Partial<LoggerConfig>): void {
  logger.configure(config);
  authLogger.configure(config);
  storageLogger.configure(config);
  networkLogger.configure(config);
  uiLogger.configure(config);
}

// Helper para logs condicionais
export function logIf(
  condition: boolean,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: any[]
): void {
  if (condition) {
    logger[level](message, ...args);
  }
}

// Export padrão
export default logger;
