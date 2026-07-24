export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[(process.env['LOG_LEVEL'] as LogLevel) ?? 'info'] ?? 1;

function formatMessage(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = { timestamp, level, module, message, ...data };
  return JSON.stringify(base);
}

export function createLogger(module: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (currentLevel <= LOG_LEVELS.debug) {
        process.stdout.write(formatMessage('debug', module, message, data) + '\n');
      }
    },
    info(message: string, data?: Record<string, unknown>) {
      if (currentLevel <= LOG_LEVELS.info) {
        process.stdout.write(formatMessage('info', module, message, data) + '\n');
      }
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (currentLevel <= LOG_LEVELS.warn) {
        process.stderr.write(formatMessage('warn', module, message, data) + '\n');
      }
    },
    error(message: string, data?: Record<string, unknown>) {
      if (currentLevel <= LOG_LEVELS.error) {
        process.stderr.write(formatMessage('error', module, message, data) + '\n');
      }
    },
  };
}
