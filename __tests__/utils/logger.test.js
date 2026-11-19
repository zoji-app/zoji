jest.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

const consoleSpy = {
  debug: jest.spyOn(global.console, 'debug').mockImplementation(() => {}),
  info: jest.spyOn(global.console, 'info').mockImplementation(() => {}),
  warn: jest.spyOn(global.console, 'warn').mockImplementation(() => {}),
  error: jest.spyOn(global.console, 'error').mockImplementation(() => {}),
  time: jest.spyOn(global.console, 'time').mockImplementation(() => {}),
  timeEnd: jest.spyOn(global.console, 'timeEnd').mockImplementation(() => {}),
};

const {
  logger,
  authLogger,
  storageLogger,
  networkLogger,
  uiLogger,
  LogLevel,
  configureLogger,
  logIf,
} = require('../../src/utils/logger');

// Enable console output and set lowest level for all tests
beforeAll(() => {
  configureLogger({
    enableConsole: true,
    level: LogLevel.DEBUG,
    timestamp: false,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('logger — basic logging', () => {
  it('debug() calls console.debug', () => {
    logger.debug('hello debug');
    expect(consoleSpy.debug).toHaveBeenCalled();
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('hello debug');
  });

  it('info() calls console.info', () => {
    logger.info('hello info');
    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.info.mock.calls[0][0]).toContain('hello info');
  });

  it('warn() calls console.warn', () => {
    logger.warn('hello warn');
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.warn.mock.calls[0][0]).toContain('hello warn');
  });

  it('error() calls console.error', () => {
    logger.error('hello error');
    expect(consoleSpy.error).toHaveBeenCalled();
    expect(consoleSpy.error.mock.calls[0][0]).toContain('hello error');
  });
});

describe('logger — level filtering', () => {
  it('does not call console.debug when level is set above DEBUG', () => {
    logger.configure({ level: LogLevel.ERROR });
    logger.debug('filtered out');
    logger.info('also filtered');
    logger.warn('also filtered');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    // Restore
    logger.configure({ level: LogLevel.DEBUG });
  });

  it('only logs ERROR and above at ERROR level', () => {
    logger.configure({ level: LogLevel.ERROR });
    logger.error('error visible');
    expect(consoleSpy.error).toHaveBeenCalled();
    logger.configure({ level: LogLevel.DEBUG });
  });

  it('does not log when enableConsole is false', () => {
    logger.configure({ enableConsole: false });
    logger.debug('silent');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    logger.configure({ enableConsole: true });
  });
});

describe('logger — message format', () => {
  it('includes context [App] in output', () => {
    logger.debug('ctx test');
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[App]');
  });

  it('includes timestamp when enabled', () => {
    logger.configure({ timestamp: true });
    logger.debug('ts');
    expect(consoleSpy.debug.mock.calls[0][0]).toMatch(/\d{4}-\d{2}-\d{2}/);
    logger.configure({ timestamp: false });
  });

  it('omits timestamp when disabled', () => {
    logger.configure({ timestamp: false });
    logger.debug('no ts');
    expect(consoleSpy.debug.mock.calls[0][0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('logger — convenience methods', () => {
  it('auth() adds [Auth] to message', () => {
    logger.auth('login');
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[Auth]');
  });

  it('storage() adds [Storage] to message', () => {
    logger.storage('read');
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[Storage]');
  });

  it('network() adds [Network] to message', () => {
    logger.network('request');
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[Network]');
  });

  it('ui() adds [UI] to message', () => {
    logger.ui('render');
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[UI]');
  });
});

describe('logger — createContext', () => {
  it('returns a child logger with the given context label', () => {
    const child = logger.createContext('Router');
    child.debug('route change');
    expect(consoleSpy.debug).toHaveBeenCalled();
    expect(consoleSpy.debug.mock.calls[0][0]).toContain('[Router]');
  });
});

describe('logger — time / timeEnd', () => {
  it('calls console.time at DEBUG level', () => {
    logger.time('op');
    expect(consoleSpy.time).toHaveBeenCalled();
  });

  it('calls console.timeEnd at DEBUG level', () => {
    logger.timeEnd('op');
    expect(consoleSpy.timeEnd).toHaveBeenCalled();
  });

  it('does not call console.time when level is above DEBUG', () => {
    logger.configure({ level: LogLevel.ERROR });
    logger.time('op');
    expect(consoleSpy.time).not.toHaveBeenCalled();
    logger.configure({ level: LogLevel.DEBUG });
  });
});

describe('logger — event', () => {
  it('logs event name via info()', () => {
    logger.event('user_login');
    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.info.mock.calls[0][0]).toContain('user_login');
  });

  it('accepts optional data object', () => {
    expect(() => logger.event('page_view', { page: '/home' })).not.toThrow();
  });
});

describe('logger — performance', () => {
  it('warns when duration > 1000ms', () => {
    logger.performance('heavy-op', 1500);
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('debugs when duration <= 1000ms', () => {
    logger.performance('fast-op', 200);
    expect(consoleSpy.debug).toHaveBeenCalled();
  });
});

describe('configureLogger', () => {
  it('applies config to authLogger, storageLogger and others', () => {
    configureLogger({
      enableConsole: true,
      level: LogLevel.DEBUG,
      timestamp: false,
    });
    authLogger.debug('auth');
    storageLogger.debug('storage');
    networkLogger.debug('network');
    uiLogger.debug('ui');
    expect(consoleSpy.debug).toHaveBeenCalledTimes(4);
  });
});

describe('logIf', () => {
  it('logs when condition is true', () => {
    logIf(true, 'debug', 'yes');
    expect(consoleSpy.debug).toHaveBeenCalled();
  });

  it('does not log when condition is false', () => {
    logIf(false, 'debug', 'no');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
  });

  it('supports all log levels', () => {
    logIf(true, 'warn', 'warn msg');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });
});
