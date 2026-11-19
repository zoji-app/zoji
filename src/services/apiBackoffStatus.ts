/**
 * apiBackoffStatus — avisa a UI quando o apiClient está esperando pra
 * re-tentar uma chamada (429/5xx/rede — ver apiClient.ts). Mesmo padrão
 * de pub-sub já usado em wsService.ts (`on()`/`_emit()`), só que como
 * módulo simples em vez de classe, pra não acoplar em nada do WS.
 *
 * P3-2, item 2: dá pro Login/Chat mostrarem "Muita gente entrando agora"
 * sem travar a UI (nada de Alert.alert bloqueante).
 */

export interface BackoffState {
  active: boolean;
  retryAt: number | null; // epoch ms — quando a próxima tentativa deve rodar
  reason: 'rate_limit' | 'server_error' | null;
}

type Listener = (state: BackoffState) => void;

const IDLE: BackoffState = { active: false, retryAt: null, reason: null };

let current: BackoffState = IDLE;
const listeners = new Set<Listener>();

export function getBackoffState(): BackoffState {
  return current;
}

export function onBackoffChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setBackoff(
  retryAt: number,
  reason: 'rate_limit' | 'server_error'
): void {
  current = { active: true, retryAt, reason };
  listeners.forEach(fn => fn(current));
}

export function clearBackoff(): void {
  if (!current.active) return;
  current = IDLE;
  listeners.forEach(fn => fn(current));
}
