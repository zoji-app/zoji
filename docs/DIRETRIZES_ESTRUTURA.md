# Diretrizes de estrutura e estilo

Como o código do app está organizado e as convenções que um PR deve seguir.

## Pastas

```
src/
├── assets/       # imagens e fontes
├── components/   # componentes reutilizáveis
│   └── ui/       # componentes base: AppButton, AppText, Card, PressableButton, ScreenHeader...
├── constants/    # constantes do app
├── contexts/     # contextos React (tema, autenticação...)
├── data/         # dados estáticos (emojis e traduções de emojis)
├── hooks/        # hooks reutilizáveis (useChatMessages, useContactsSync...)
├── i18n/         # traduções: locales/pt-BR.ts, en.ts e es.ts
├── navigation/   # referência de navegação fora de componentes
├── routes/       # pilhas e abas de navegação
├── screens/      # telas, uma pasta por tela
├── services/     # chamadas à API, WebSocket, contatos, armazenamento
├── stores/       # estado global com zustand
├── theme/        # tokens de design: colors, spacing, radii, typography
├── types/        # tipos TypeScript compartilhados
└── utils/        # funções utilitárias
```

Uma tela fica em `src/screens/NomeDaTela/`, com `index.tsx` e, nas telas já migradas para os tokens, `styles.ts`.

## Estilos e tema

O app tem modo claro e escuro. Por isso as cores vêm sempre do tema, nunca de valores fixos:

```tsx
// styles.ts
import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBackground },
    title: { color: colors.textPrimary },
  });
```

```tsx
// index.tsx
const { colors } = useTheme();
const styles = useMemo(() => getStyles(colors), [colors]);
```

- Prefira os componentes de `components/ui` a recriar botões, textos e cartões.
- Use os tokens de `theme/` (`spacing`, `radii`, `typography`) em vez de números soltos quando houver um equivalente.
- Algumas telas antigas ainda têm o `StyleSheet` dentro do `index.tsx`. Ao mexer nelas, não é preciso migrar tudo. Se migrar, faça num PR separado.

## Textos

Nenhum texto visível fica fixo no código. Toda frase nova entra nos três arquivos de `src/i18n/locales/` (pt-BR, en e es), com a mesma chave.

## Exportações

- Siga o padrão do arquivo ou da pasta onde você está mexendo.
- Componentes novos: de preferência, default export.

## Antes do PR

```bash
npx tsc --noEmit
npm run lint
npm test
```

O hook de pre-commit roda o eslint e o prettier nos arquivos alterados.

## Mudanças de estrutura

Criar ou renomear pastas de `src/`, trocar bibliotecas centrais (navegação, estado, tema) ou mexer em `ios/` e `android/` exige abrir uma issue antes, explicando o motivo.
