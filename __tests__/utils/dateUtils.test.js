import { formatDate } from '../../src/utils/dateUtils';

describe('formatDate', () => {
  // Salvar a data atual para testes consistentes
  const currentDate = new Date();

  // Helper para criar datas específicas
  const createDate = (daysAgo = 0, hoursAgo = 0, minutesAgo = 0) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    date.setMinutes(date.getMinutes() - minutesAgo);
    return date;
  };

  it('formata hoje corretamente (apenas horas)', () => {
    // Pega uma data de hoje
    const today = createDate();

    // Formate a hora manualmente para comparação (formato 24h)
    const expectedFormat = today.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Teste
    const formattedDate = formatDate(today);
    expect(formattedDate).toBe(expectedFormat);
  });

  it('formata ontem corretamente (Ontem + hora)', () => {
    // Pega uma data de ontem
    const yesterday = createDate(1);

    // Formate a hora manualmente para comparação (formato 24h)
    const expectedTimeFormat = yesterday.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Teste
    const formattedDate = formatDate(yesterday);
    expect(formattedDate).toContain('Ontem');
    expect(formattedDate).toContain(expectedTimeFormat);
  });

  it('formata datas mais antigas corretamente', () => {
    // Pega uma data de 2 dias atrás
    const oldDate = createDate(2);

    // Teste
    const formattedDate = formatDate(oldDate);

    // Verifica se a data contém o dia e mês no formato correto (não verificamos a hora específica)
    expect(formattedDate).toMatch(/\d{2}\/\d{2}/);
  });

  it('lida com entradas inválidas', () => {
    // Teste com data inválida
    const formattedDate = formatDate('data-invalida');
    expect(formattedDate).toBe('');
  });
});
