/**
 * sessionExpired — avisa o resto do app quando a sessão morre de vez
 * (refresh do token falhou, via apiClient.ts ou wsService.ts). Mesmo
 * padrão de pub-sub já usado em apiBackoffStatus.ts: módulo simples em
 * vez de classe, pra não acoplar apiClient/wsService no AuthContext.
 *
 * Sem isso, clearSession() limpava os tokens mas o AuthContext nunca
 * ficava sabendo — o usuário ficava preso em telas autenticadas com a
 * sessão morta, e cada tela gerava seu próprio 401 de novo.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitSessionExpired(): void {
  listeners.forEach(fn => fn());
}
