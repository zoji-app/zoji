import { shouldBlock } from '../../src/hooks/useVersionGate';

describe('shouldBlock (P3-5 version gate)', () => {
  it('bloqueia quando a versão atual é menor que a mínima', () => {
    expect(shouldBlock('1.7.3', '1.8.0')).toBe(true);
    expect(shouldBlock('1.7.3', '1.7.4')).toBe(true);
    expect(shouldBlock('1.6.9', '1.7.0')).toBe(true);
  });

  it('não bloqueia quando igual ou maior', () => {
    expect(shouldBlock('1.8.0', '1.8.0')).toBe(false);
    expect(shouldBlock('2.0.0', '1.8.0')).toBe(false);
  });

  it('min "0.0.0" ou inválido nunca bloqueia', () => {
    expect(shouldBlock('1.0.0', '0.0.0')).toBe(false);
    expect(shouldBlock('1.0.0', '')).toBe(false);
    expect(shouldBlock('1.0.0', 'nope')).toBe(false);
  });

  it('versão atual não-semver → coerção; ilegível → não bloqueia', () => {
    expect(shouldBlock('1.7', '1.8.0')).toBe(true); // coage p/ 1.7.0
    expect(shouldBlock('garbage', '1.8.0')).toBe(false);
  });
});
