const {
  getBackoffState,
  onBackoffChange,
  setBackoff,
  clearBackoff,
} = require('../../src/services/apiBackoffStatus');

describe('apiBackoffStatus (P3-2, item 2)', () => {
  afterEach(() => {
    clearBackoff();
  });

  it('começa inativo', () => {
    expect(getBackoffState()).toEqual({
      active: false,
      retryAt: null,
      reason: null,
    });
  });

  it('setBackoff ativa e notifica listeners', () => {
    const listener = jest.fn();
    const unsubscribe = onBackoffChange(listener);

    const retryAt = Date.now() + 5000;
    setBackoff(retryAt, 'rate_limit');

    expect(getBackoffState()).toEqual({
      active: true,
      retryAt,
      reason: 'rate_limit',
    });
    expect(listener).toHaveBeenCalledWith({
      active: true,
      retryAt,
      reason: 'rate_limit',
    });

    unsubscribe();
  });

  it('clearBackoff volta pro estado inativo e notifica', () => {
    const listener = jest.fn();
    setBackoff(Date.now() + 1000, 'server_error');
    const unsubscribe = onBackoffChange(listener);

    clearBackoff();

    expect(getBackoffState().active).toBe(false);
    expect(listener).toHaveBeenCalledWith({
      active: false,
      retryAt: null,
      reason: null,
    });
    unsubscribe();
  });

  it('clearBackoff é no-op (não notifica) se já estava inativo', () => {
    const listener = jest.fn();
    const unsubscribe = onBackoffChange(listener);

    clearBackoff();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('unsubscribe para de receber notificações', () => {
    const listener = jest.fn();
    const unsubscribe = onBackoffChange(listener);
    unsubscribe();

    setBackoff(Date.now() + 1000, 'rate_limit');

    expect(listener).not.toHaveBeenCalled();
  });
});
