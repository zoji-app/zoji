import { colors } from '../../src/theme/colors';

describe('Colors', () => {
  it('deve exportar um objeto de cores', () => {
    expect(colors).toBeDefined();
    expect(typeof colors).toBe('object');
  });

  it('deve conter todas as cores esperadas', () => {
    // Verificar cores principais
    expect(colors.primary).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.background).toBeDefined();
    expect(colors.surface).toBeDefined();
    expect(colors.text).toBeDefined();
    expect(colors.textLight).toBeDefined();

    // Verificar cores de mensagens
    expect(colors.messageOut).toBeDefined();
    expect(colors.messageIn).toBeDefined();

    // Verificar cores de layout
    expect(colors.border).toBeDefined();
    expect(colors.headerBackground).toBeDefined();
    expect(colors.statusBar).toBeDefined();

    // Verificar cores de feedback
    expect(colors.success).toBeDefined();
    expect(colors.error).toBeDefined();
    expect(colors.warning).toBeDefined();
  });

  it('deve ter cores em formato hexadecimal válido', () => {
    // Função auxiliar para validar formato hexadecimal
    const isValidHexColor = color => /^#([0-9A-F]{3}){1,2}$/i.test(color);

    // Verificar formatos de todas as cores
    Object.values(colors).forEach(color => {
      expect(isValidHexColor(color)).toBe(true);
    });
  });

  it('deve ter a cor primária correta', () => {
    expect(colors.primary).toBe('#00B2FF');
  });

  it('deve ter as cores de feedback correta', () => {
    expect(colors.success).toBe('#34C759');
    expect(colors.error).toBe('#FF3B30');
    expect(colors.warning).toBe('#FF9500');
  });
});
