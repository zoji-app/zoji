/**
 * Crash/error reporting (P3-5).
 *
 * DESLIGADO por padrão (EXPO_PUBLIC_SENTRY_DSN vazio) — decisão de não mandar
 * dado de usuário pros EUA. Enquanto isso, usamos os painéis de crash da
 * App Store Connect e do Google Play Console.
 *
 * O SDK é o `@sentry/react-native`, mas o DSN pode apontar pra qualquer backend
 * compatível com a API do Sentry:
 *   - GlitchTip auto-hospedado no Brasil  (recomendado — ver docs/CRASH-REPORTING.md)
 *   - Sentry região da UE (Frankfurt)     (`region: 'de'` / DSN `.de.sentry.io`)
 * Nenhuma mudança de código pra trocar — só o valor do env.
 *
 * Quando ativo: erros JS, crash/ANR nativo e breadcrumbs de rede — SEMPRE com
 * PII mascarada (telefone vira [phone], nunca loga token/senha/refresh; corpo,
 * headers e cookies das requisições são removidos).
 */
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

let _enabled = false;

export function isSentryEnabled(): boolean {
  return _enabled;
}

// ── Scrubbers de PII ────────────────────────────────────────────────────────

const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const SECRET_KEY_RE = /token|secret|password|refresh|authorization|bearer/i;

export function scrubString(s: string): string {
  return s.replace(PHONE_RE, '[phone]');
}

function scrubValue(v: unknown): unknown {
  if (typeof v === 'string') return scrubString(v);
  if (Array.isArray(v)) return v.map(scrubValue);
  if (v && typeof v === 'object')
    return scrubObject(v as Record<string, unknown>);
  return v;
}

export function scrubObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    out[k] = SECRET_KEY_RE.test(k) ? '[redacted]' : scrubValue(val);
  }
  return out;
}

// ── init ───────────────────────────────────────────────────────────────────

export function initSentry(): void {
  const dsn =
    (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ||
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    '';

  if (!dsn) return; // sem DSN → não inicializa

  try {
    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      release: Constants.expoConfig?.version ?? undefined,
      // Sem tracing de performance por ora — só erros/crash.
      tracesSampleRate: 0,
      enableAutoSessionTracking: true,
      // Nunca enviar o corpo/headers das requisições.
      sendDefaultPii: false,
      maxBreadcrumbs: 40,

      beforeBreadcrumb(crumb) {
        if (crumb.message) crumb.message = scrubString(crumb.message);
        if (crumb.data)
          crumb.data = scrubObject(crumb.data) as typeof crumb.data;
        // Breadcrumbs de rede: só método + host + status, sem query/headers/body.
        if (
          crumb.category === 'http' &&
          crumb.data &&
          typeof crumb.data.url === 'string'
        ) {
          try {
            const u = new URL(crumb.data.url);
            crumb.data.url = `${u.origin}${u.pathname}`;
          } catch {
            /* deixa como está (já scrubbado) */
          }
        }
        return crumb;
      },

      beforeSend(event) {
        if (event.request) {
          delete event.request.headers;
          delete event.request.cookies;
          delete event.request.data;
        }
        if (event.extra)
          event.extra = scrubObject(event.extra) as typeof event.extra;
        if (event.message) event.message = scrubString(event.message);
        if (event.exception?.values) {
          for (const v of event.exception.values) {
            if (v.value) v.value = scrubString(v.value);
          }
        }
        return event;
      },
    });
    _enabled = true;
  } catch {
    _enabled = false;
  }
}

// ── API usada pelo logger ─────────────────────────────────────────────────

export function sentryCaptureError(message: string, error?: unknown): void {
  if (!_enabled) return;
  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: { logMessage: scrubString(message) },
    });
  } else {
    Sentry.captureMessage(scrubString(message), 'error');
  }
}

export function sentryBreadcrumb(
  level: 'debug' | 'info' | 'warning',
  message: string,
  data?: Record<string, unknown>
): void {
  if (!_enabled) return;
  Sentry.addBreadcrumb({
    level,
    message: scrubString(message),
    data: data ? (scrubObject(data) as Record<string, unknown>) : undefined,
  });
}
