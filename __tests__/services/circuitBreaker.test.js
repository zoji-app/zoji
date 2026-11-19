const {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  __resetAllCircuits,
} = require('../../src/services/circuitBreaker');

describe('circuitBreaker (P3-2, item 3)', () => {
  beforeEach(() => {
    __resetAllCircuits();
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('começa fechado (não pausa nada) pra uma key nova', () => {
    expect(isCircuitOpen('banner')).toBe(false);
  });

  it('continua fechado com 1 ou 2 falhas seguidas', () => {
    recordFailure('game');
    expect(isCircuitOpen('game')).toBe(false);
    recordFailure('game');
    expect(isCircuitOpen('game')).toBe(false);
  });

  it('abre depois de 3 falhas seguidas', () => {
    recordFailure('game');
    recordFailure('game');
    recordFailure('game');
    expect(isCircuitOpen('game')).toBe(true);
  });

  it('fecha de novo sozinho depois de 30s', () => {
    recordFailure('emoji-keywords');
    recordFailure('emoji-keywords');
    recordFailure('emoji-keywords');
    expect(isCircuitOpen('emoji-keywords')).toBe(true);

    jest.setSystemTime(new Date('2026-01-01T00:00:29Z')); // 29s — ainda aberto
    expect(isCircuitOpen('emoji-keywords')).toBe(true);

    jest.setSystemTime(new Date('2026-01-01T00:00:31Z')); // 31s — fecha
    expect(isCircuitOpen('emoji-keywords')).toBe(false);
  });

  it('um sucesso zera o contador de falhas', () => {
    recordFailure('banner');
    recordFailure('banner');
    recordSuccess('banner');
    recordFailure('banner');
    recordFailure('banner');
    // só 2 falhas desde o último sucesso — ainda fechado
    expect(isCircuitOpen('banner')).toBe(false);
  });

  it('circuitos de keys diferentes são independentes', () => {
    recordFailure('game');
    recordFailure('game');
    recordFailure('game');
    expect(isCircuitOpen('game')).toBe(true);
    expect(isCircuitOpen('banner')).toBe(false);
  });
});
