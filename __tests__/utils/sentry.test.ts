import { scrubString, scrubObject } from '../../src/utils/sentry';

describe('sentry PII scrubbing (P3-5)', () => {
  it('mascara telefones em string', () => {
    expect(scrubString('login de +5511999998888')).toBe('login de [phone]');
    expect(scrubString('to: 11 99999-8888 ok')).toBe('to: [phone] ok');
    expect(scrubString('sem telefone aqui')).toBe('sem telefone aqui');
  });

  it('redige chaves sensíveis em objeto (recursivo)', () => {
    const out = scrubObject({
      user: 'ana',
      Authorization: 'Bearer abc.def',
      nested: { refresh_token: 'xyz', phone: '+5511999998888', ok: 1 },
      list: ['+5511988887777', 'texto'],
    });
    expect(out.Authorization).toBe('[redacted]');
    expect((out.nested as any).refresh_token).toBe('[redacted]');
    expect((out.nested as any).phone).toBe('[phone]');
    expect((out.nested as any).ok).toBe(1);
    expect((out.list as any[])[0]).toBe('[phone]');
    expect((out.list as any[])[1]).toBe('texto');
  });
});
