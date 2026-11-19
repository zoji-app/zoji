/**
 * Circuit breaker leve (P3-2, item 3) — pausa chamadas NÃO essenciais
 * (banner, emoji-keywords, game) por um tempo depois de falhas seguidas,
 * pra não continuar martelando uma API que já está sofrendo com o
 * essencial (login, mensagens, WS).
 *
 * Escopo por `key` (uma feature por chave — 'banner', 'emoji-keywords',
 * 'game'), não no cliente HTTP inteiro: features essenciais nunca devem
 * ser pausadas por isto.
 */

const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS = 30_000;

interface CircuitState {
  consecutiveFailures: number;
  openUntil: number | null;
}

const circuits = new Map<string, CircuitState>();

function getState(key: string): CircuitState {
  let s = circuits.get(key);
  if (!s) {
    s = { consecutiveFailures: 0, openUntil: null };
    circuits.set(key, s);
  }
  return s;
}

/** true = não tenta a chamada agora, use o fallback/cache. */
export function isCircuitOpen(key: string): boolean {
  const s = getState(key);
  if (s.openUntil === null) return false;
  if (Date.now() < s.openUntil) return true;
  // Janela passou — fecha o circuito e zera, deixa tentar de novo.
  s.openUntil = null;
  s.consecutiveFailures = 0;
  return false;
}

export function recordSuccess(key: string): void {
  const s = getState(key);
  s.consecutiveFailures = 0;
  s.openUntil = null;
}

export function recordFailure(key: string): void {
  const s = getState(key);
  s.consecutiveFailures += 1;
  if (s.consecutiveFailures >= FAILURE_THRESHOLD && s.openUntil === null) {
    s.openUntil = Date.now() + OPEN_DURATION_MS;
  }
}

/** Só pra testes — reseta todo o estado entre specs. */
export function __resetAllCircuits(): void {
  circuits.clear();
}
