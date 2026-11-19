# Crash / error reporting — GlitchTip (auto-hospedado, Brasil)

## Estado atual

**Desligado.** `EXPO_PUBLIC_SENTRY_DSN` está vazio → `initSentry()`
(`src/utils/sentry.ts`) é no-op e nada sai do dispositivo do usuário.

Decisão: não enviar dado de usuário (nem diagnóstico) para servidores nos EUA.
Enquanto o GlitchTip não estiver no ar, a visibilidade de crash vem dos painéis
nativos:

- **iOS** — App Store Connect → _Apps → Zoji → TestFlight/App Analytics →
  Crashes_ (precisa dos dSYMs enviados no build).
- **Android** — Google Play Console → _Qualidade → Android vitals → Crashes e
  ANRs_ (precisa do `mapping.txt` / deobfuscation file no build).

O `logger.ts` continua registrando erros localmente e, no servidor, tudo cai em
`/var/log/zoji/api.jsonl` (P2-13).

## Por que GlitchTip

- **API 100% compatível com o Sentry** → o app não muda; o SDK
  `@sentry/react-native` fala com o GlitchTip só trocando o DSN.
- Open-source, leve: Django + Postgres + Redis (~1 GB RAM), contra os ~8 GB do
  Sentry self-hosted.
- **Dado fica no Brasil**, num servidor seu.

Alternativa sem infra: **Sentry região da UE** (Frankfurt) — mesmo SDK, DSN
`https://…@….de.sentry.io/…` ou `Sentry.init({ region: 'de' })`. Tira o dado dos
EUA, mas a operadora (Functional Software) ainda é dos EUA.

## Subir o GlitchTip (quando for a hora — pós-palestra)

Precisa de uma VM/servidor **separado** (o VPS atual tem 2 GB e é compartilhado).
Uma instância BR de ~2 GB RAM / 1 vCPU resolve (ex.: Magalu Cloud, HostGator VPS,
Hostinger BR, ou uma Oracle Cloud São Paulo free-tier).

```bash
# na VM, com Docker + Docker Compose instalados
mkdir glitchtip && cd glitchtip
curl -O https://glitchtip.com/docker-compose.sample.yml
mv docker-compose.sample.yml docker-compose.yml
```

Editar o `docker-compose.yml`:

- `SECRET_KEY` — gerar: `openssl rand -hex 32`
- `DEFAULT_FROM_EMAIL` e SMTP (pode usar a Infobip/qualquer SMTP) para o convite
  do 1º usuário e alertas
- `GLITCHTIP_DOMAIN=https://glitchtip.suaempresa.com.br`
- `EMAIL_URL` conforme o provedor
- deixar as portas só em `127.0.0.1:8000:8080` e pôr um Nginx + Let's Encrypt na
  frente (mesmo padrão do `deploy/nginx-*.conf` dos outros serviços)

```bash
docker compose up -d
docker compose run --rm web ./manage.py migrate
docker compose run --rm web ./manage.py createsuperuser   # seu login
```

Depois, no painel:

1. criar uma **Organization** (ex.: `zoji`) e um **Project** (`zoji-app`,
   plataforma _React Native_);
2. copiar o **DSN** do projeto (`https://<key>@glitchtip.suaempresa.com.br/<id>`);
3. configurar retenção curta em _Settings → …_ (ex.: 30–90 dias) — é diagnóstico,
   não precisa guardar pra sempre.

## Ligar no app

```bash
# .env do zoji (NÃO commitar)
EXPO_PUBLIC_SENTRY_DSN=https://<key>@glitchtip.suaempresa.com.br/<project_id>
```

Rebuild (`expo prebuild` + Xcode/Gradle). Sem DSN o comportamento não muda.

### Source maps (opcional, pra stack trace legível)

O plugin `@sentry/react-native` faz upload de source maps no build se estas
variáveis existirem (senão, só pula):

```bash
SENTRY_URL=https://glitchtip.suaempresa.com.br
SENTRY_ORG=zoji
SENTRY_PROJECT=zoji-app
SENTRY_AUTH_TOKEN=<token de "Auth Tokens" no painel do GlitchTip>
```

## O que muda na política de privacidade quando ligar

Adicionar (PT/EN/ES, nas chaves `legal.privacy.*` de
`src/i18n/locales/*.ts` **e** no `zoji-api/public/privacy-policy.html`):

- **Dados coletados**: dados de diagnóstico — relatórios de erro e travamento
  (modelo do aparelho, versão do SO e do app, trilha de eventos técnicos). **Não
  inclui** telefone, mensagens, contatos nem credenciais (removidos antes do
  envio).
- **Compartilhamento**: processados em servidor próprio no Brasil (GlitchTip);
  não há transferência internacional.
- **Retenção**: relatórios de erro por até N dias.
- **Cookies/análise**: ajustar a frase "nenhuma análise de terceiros" — é
  diagnóstico técnico próprio, sem rastreamento comportamental nem publicidade.

E nos formulários das lojas: **Apple Privacy Labels** e **Google Play Data
Safety** → declarar _Crash data_ + _Diagnostics / Performance data_, uso
"App functionality", não vinculado à identidade, não usado para rastreamento.
