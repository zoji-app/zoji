# Zoji

Aplicativo de bate-papo minimalista onde a comunicação acontece exclusivamente por emojis. Disponível para iOS e Android.

O código do app é aberto sob a [MPL-2.0](LICENSE). Quer ajudar? Comece pela [visão do projeto](VISION.md) e pelo [guia de contribuição](CONTRIBUTING.md).

|                              | iOS                                                          | Android                                                                         |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Loja**                     | [App Store](https://apps.apple.com/br/app/zoji/id6762674303) | [Google Play](https://play.google.com/store/apps/details?id=dev.de4araujo.zoji) |
| **Identificador**            | Bundle ID `dev.de4araujo.zoji`                               | Package `dev.de4araujo.zoji`                                                    |
| **Versão mínima do sistema** | iOS 16.4                                                     | Android 7.0 (API 24)                                                            |
| **SDK alvo**                 | —                                                            | API 36 (`targetSdkVersion` e `compileSdkVersion`)                               |

---

## Stack

- **React Native** + **Expo** (New Architecture habilitada)
- **TypeScript**
- **React Navigation** — navegação entre telas
- **Zustand** — estado global de autenticação
- **Shopify Restyle** — sistema de tema e componentes
- **Axios** — cliente HTTP para a API do Zoji
- **WebSocket** — mensagens em tempo real
- **Expo Notifications + FCM** — push notifications
- **expo-contacts** — sincronização de contatos do dispositivo
- **i18next** — internacionalização (pt-BR, en, es)
- **rn-emoji-keyboard** — seletor de emojis

---

## Estrutura

```
zoji/
├── app.config.js          # Configuração Expo (versão, bundle IDs, plugins)
├── assets/                # Ícones, splash, imagens
├── android/               # Projeto Android nativo
├── ios/                   # Projeto iOS nativo
└── src/
    ├── screens/
    │   ├── Login/             # Autenticação via número de telefone (OTP)
    │   ├── ProfileSetup/      # Configuração inicial de nickname e emoji
    │   ├── Friends/           # Lista de conversas e contatos
    │   ├── Chat/              # Chat individual (emojis)
    │   ├── GroupChat/         # Chat em grupo
    │   ├── AddContact/        # Adicionar contatos que usam o Zoji
    │   ├── CreateGroup/       # Criação de grupo
    │   ├── GroupDetails/      # Detalhes e membros do grupo
    │   ├── DeviceContacts/    # Contatos do dispositivo
    │   ├── BlockedContacts/   # Lista de bloqueados
    │   ├── Profile/           # Perfil do usuário
    │   ├── Settings/          # Configurações do app
    │   ├── PrivacyPolicy/     # Política de privacidade
    │   └── TermsOfUse/        # Termos de uso
    ├── services/
    │   ├── apiClient.ts           # Instância Axios com interceptors JWT
    │   ├── wsService.ts           # Cliente WebSocket (mensagens em tempo real)
    │   ├── authApi.ts             # Login, verificação OTP, refresh token
    │   ├── messagesApi.ts         # Envio e histórico de mensagens
    │   ├── groupsApi.ts           # Grupos e mensagens de grupo
    │   ├── contactsApi.ts         # Contatos e relacionamentos
    │   ├── relationshipsApi.ts    # Solicitações de amizade
    │   ├── pushNotifications.ts   # Registro e handling de push
    │   ├── notifications.ts       # Notificações locais
    │   ├── storage.ts             # AsyncStorage (tokens, cache local)
    │   ├── localMessages.ts       # Cache local de mensagens
    │   ├── messageSync.ts         # Sincronização de mensagens
    │   ├── contacts.ts            # Gerenciamento de contatos local
    │   ├── deviceContacts.ts      # Acesso a contatos do dispositivo
    │   └── emojiBlocklist.ts      # Blocklist de emojis (validação local)
    ├── stores/
    │   └── authStore.ts       # Estado de autenticação (Zustand)
    ├── contexts/              # Contextos React adicionais
    ├── components/            # Componentes reutilizáveis
    ├── hooks/                 # Hooks personalizados
    ├── routes/                # Configuração de navegação
    ├── i18n/
    │   └── locales/           # Traduções: pt-BR, en, es
    ├── theme/                 # Tema Restyle (cores, espaçamentos, tipografia)
    ├── types/                 # Tipos e interfaces TypeScript
    └── utils/                 # Funções utilitárias
```

---

## Instalação local

**Pré-requisitos:** Node.js 22+, npm, Xcode (iOS) e Android Studio (Android).

```bash
npm install
npm run dev-server   # API falsa em http://localhost:8080 (login com o código 123456)
npm start            # Metro
npm run ios          # ou npm run android
```

Em modo de desenvolvimento, o app usa o servidor falso de `dev-server/` e nunca a produção. Os detalhes estão no [CONTRIBUTING.md](CONTRIBUTING.md#rodando-o-app).

**No Android**, antes do primeiro build:

```bash
cp google-services.example.json android/app/google-services.json   # Firebase de exemplo (push não funciona)
echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:8080" > .env               # no emulador, localhost é 10.0.2.2
```

---

## Build de produção

Só o mantenedor publica versões, com as chaves de assinatura do projeto. A versão fica em sincronia em `app.config.js`, `ios/Zoji.xcodeproj/project.pbxproj` e `android/app/build.gradle`.

**iOS** — gerado localmente via Xcode:

```bash
# Abrir o workspace (não o .xcodeproj) e fazer Product > Archive
open ios/Zoji.xcworkspace
```

**Android** — gerado localmente via Gradle. Precisa do `android/keystore.properties` com a chave de upload e do `google-services.json` real do Firebase, que ficam só com o mantenedor:

```bash
cd android
./gradlew bundleRelease
# AAB gerado em: android/app/build/outputs/bundle/release/
```

---

## Testes

```bash
npm test
```

---

## Internacionalização

O app suporta três idiomas configurados em `src/i18n/locales/`:

| Arquivo    | Idioma             |
| ---------- | ------------------ |
| `pt-BR.ts` | Português (padrão) |
| `en.ts`    | Inglês             |
| `es.ts`    | Espanhol           |

---

## Licença

[Mozilla Public License 2.0](LICENSE). © De Araujo Desenvolvimento LTDA.

O nome e o ícone do Zoji não fazem parte da licença. Veja o [TRADEMARK.md](TRADEMARK.md).
