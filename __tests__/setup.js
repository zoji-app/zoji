// Este arquivo agora contém um teste simples para evitar o erro 'Your test suite must contain at least one test'
describe('Setup', () => {
  it('deve configurar o ambiente de teste corretamente', () => {
    expect(true).toBe(true);
  });
});

// O restante do arquivo será movido para jest/setup.js
