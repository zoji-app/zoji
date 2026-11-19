/**
 * Formata um objeto Date para exibição amigável
 * @param date Data a ser formatada
 * @returns Data formatada como string
 */
export const formatDate = (date: Date | string | number): string => {
  const dateObj = new Date(date);

  // Verifica se a data é válida
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );

  // Formatador de horas (formato 24h)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Se for hoje, retorna apenas a hora
  if (dateOnly.getTime() === today.getTime()) {
    return formatTime(dateObj);
  }

  // Se for ontem, retorna "Ontem" + hora
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Ontem ${formatTime(dateObj)}`;
  }

  // Se for dentro do ano atual, retorna o dia e mês
  if (dateObj.getFullYear() === now.getFullYear()) {
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Caso contrário, retorna a data completa
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
