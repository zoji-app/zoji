# Como contribuir com o Zoji

Obrigado pelo interesse! Antes de começar, leia a [visão do projeto](VISION.md): ela diz o que o Zoji é e o que ele não vai ser.

## Antes de escrever código

- **Bug pequeno ou erro de digitação:** pode abrir o PR direto.
- **Qualquer outra coisa** (recurso novo, mudança de tela, refatoração, dependência nova): abra uma issue antes e espere um retorno. Assim ninguém trabalha dias em algo que não vai entrar.
- **Falha de segurança:** não abra issue pública. Siga o [SECURITY.md](SECURITY.md).

Quem mantém o projeto revisa as contribuições no tempo livre. Pode levar alguns dias para responder.

## Rodando o app

Você precisa de Node 22 ou mais novo, de um simulador ou emulador, e do ambiente do React Native ([guia do Expo](https://docs.expo.dev/get-started/set-up-your-environment/)). Para o iOS, é preciso um Mac com Xcode.

```bash
npm install
npm run dev-server   # terminal 1: API falsa em http://localhost:8080
npm start            # terminal 2: Metro
npm run ios          # ou npm run android
```

### O servidor falso

O app em modo de desenvolvimento conversa com `dev-server/`, uma API falsa com dados em memória. Ela não cria contas reais, não manda SMS e não toca na produção.

- **Login:** qualquer número no formato `+55...`, com o código **123456**.
- **Contatos falsos:** cada conta nova já começa com a Ana e o Beto como amigos, um pedido de amizade do Caio e um grupo. A Ana e o Beto respondem às suas mensagens com um emoji.
- **Os dados somem** quando o servidor para.
- **No emulador Android**, crie um `.env` com `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` (veja o `.env.example`).
- **Para compilar o Android**, copie o arquivo de exemplo do Firebase antes do primeiro build: `cp google-services.example.json android/app/google-services.json`. Com ele o app compila e roda, só as notificações push não funcionam.

Se o app usar um endpoint ou campo que o servidor falso ainda não tem, ele registra "rota não implementada" no terminal. Inclua o que faltar no seu PR.

O código da API de produção não é público.

## Fazendo o PR

1. Faça um fork e crie uma branch a partir da `main`.
2. Mantenha o PR pequeno e com um objetivo só, seguindo as [diretrizes de estrutura e estilo](docs/DIRETRIZES_ESTRUTURA.md).
3. Antes de enviar, rode:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm test
   ```
4. Use o padrão de commits do projeto, por exemplo `fix: lista não atualizava ao receber mensagem` ou `feat: tradução para francês`. Os prefixos são `feat`, `fix`, `refactor`, `test`, `docs` e `chore`.
5. Assine cada commit com DCO (veja abaixo).
6. Preencha o modelo do PR.

### Regras

- **Dependências novas** só depois de discutidas numa issue: tamanho, manutenção, licença e que dados coletam.
- **Nada que colete, envie ou guarde dados pessoais novos** sem aprovação explícita de quem mantém o projeto. Se for aprovado, o PR também atualiza a política de privacidade.
- **Textos de interface** entram nos três idiomas (`src/i18n/locales`), ou o PR avisa que falta tradução.
- **Testes:** correções de bug vêm com um teste que falhava antes da correção, sempre que der.
- **Versão e build:** nenhum PR muda `version`, `buildNumber` ou `versionCode`. Isso faz parte do release.
- **Código nativo** (`ios/`, `android/`) só com discussão prévia. Muita gente contribui só com JavaScript.

## Assinatura dos commits (DCO)

Usamos o [Developer Certificate of Origin](https://developercertificate.org/). Ao assinar, você declara que escreveu o código, ou tem o direito de enviá-lo, sob a licença do projeto. Para assinar, use `-s` no commit:

```bash
git commit -s -m "fix: corrige ordenação da lista de conversas"
```

Isso adiciona a linha `Signed-off-by: Seu Nome <seu@email>` ao commit. PRs com commits sem assinatura não são aceitos.

## Licença

Ao contribuir, você concorda que a sua contribuição será distribuída sob a [Mozilla Public License 2.0](LICENSE), a mesma do projeto.

## Conduta

Todos que participam seguem o [Código de Conduta](CODE_OF_CONDUCT.md).
