export const colors = {
  primary: '#00B2FF', // Azul do olho do logo
  accent: '#FFD93D', // Amarelo vibrante
  background: '#F2F2F7', // Fundo padrão do iOS
  surface: '#B8C7C7', // Atualizado para o tom verde-azulado do login
  text: '#2C3E50', // Azul escuro mais suave
  textLight: '#34495E', // Azul médio para melhor legibilidade
  messageOut: '#E1FEC6', // Verde mais suave para mensagens enviadas
  messageIn: '#FFFFFF', // Branco para mensagens recebidas
  border: '#A3B5B5', // Tom mais escuro do verde-azulado para bordas
  headerBackground: '#B8C7C7', // Mesmo tom do login
  statusBar: '#B8C7C7', // Mesmo tom do login
  textSecondary: '#8E8E93',
  // Cores de feedback
  success: '#34C759', // Verde do iOS
  error: '#FF3B30', // Vermelho do iOS
  warning: '#FF9500', // Laranja do iOS

  // Escala nova (proposta de design tokens) — chaves adicionadas, nenhuma
  // das de cima foi alterada. Telas migram pra essa escala uma de cada vez;
  // Login foi a primeira (ver artifact "Zoji — Proposta de Design Tokens").
  primary500: '#00B2FF', // Ilustrações/ícones grandes — não usar com texto em cima (falha AA)
  primary700: '#0077B3', // Botões, links, texto de destaque — passa AA (4.9:1)
  primary900: '#004D73', // Estado pressed/ativo
  neutral0: '#FFFFFF',
  neutral100: '#F2F2F7',
  neutral300: '#D1D5DB',
  neutral500: '#8E8E93',
  neutral700: '#52616F',
  neutral900: '#1C2833',

  // Camada semântica (piloto de dark mode, ver [[project_zoji_dark_mode]]) —
  // só pra papel de fundo/texto de página, não pro valor literal. neutral0-900
  // e primary500-900 continuam fixos nos dois temas (tela por tela pode ter
  // um branco/preto literal que NÃO deve inverter, ex: texto branco sobre um
  // selo escuro semi-transparente no Chat — inverter neutral0 quebraria isso).
  pageBackground: '#F2F2F7', // = neutral100
  cardBackground: '#FFFFFF', // = neutral0
  textPrimary: '#1C2833', // = neutral900
  hairline: '#D1D5DB', // = neutral300
};

// Só os tokens semânticos mudam — o resto (marca, neutros literais, cores de
// feedback) é herdado igual, de propósito: pilotando só o necessário pra
// Configurações antes de espalhar pro resto do app.
export const darkColors: typeof colors = {
  ...colors,
  pageBackground: '#000000',
  cardBackground: '#1C1C1E',
  textPrimary: '#F2F2F7',
  textSecondary: '#98989F',
  hairline: '#38383A',
};

// Tema "Zoji" — derivado do escuro (mesmo texto/marca/feedback), só troca o
// fundo pra azul-marinho em vez de preto puro. Validado via mockup de cores
// antes de implementar (paleta aprovada; nenhum componente muda).
export const zojiColors: typeof colors = {
  ...colors,
  pageBackground: '#0A1330',
  cardBackground: '#16224D',
  textPrimary: '#F2F2F7',
  textSecondary: '#9AA8C9',
  hairline: '#2B3A66',
};
