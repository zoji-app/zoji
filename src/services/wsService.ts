/**
 * Serviço WebSocket do Zoji.
 *
 * Garante:
 *   - Uma única conexão WS autenticada via JWT
 *   - Reconexão automática com backoff exponencial (2s → 60s)
 *   - Reconexão ao voltar do background (AppState active)
 *   - Refresh automático do token antes de reconectar quando expirado
 *   - Keepalive via ping a cada 25s
 */

import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL, clearSession, refreshAccessToken } from './apiClient';
import { getAccessToken } from './secureTokens';
import { logger } from '../utils/logger';

// HTTPS → wss://host/ws (via Nginx proxy); HTTP → ws://host:8082 (dev direto)
const WS_BASE_URL = API_BASE_URL.startsWith('https://')
  ? API_BASE_URL.replace(/^https:\/\//, 'wss://') + '/ws'
  : API_BASE_URL.replace(/^http:\/\//, 'ws://').replace(/:\d+$/, '') + ':8082';

export type WsEventType =
  | 'message.new'
  | 'profile.updated'
  | 'relationship.updated'
  | 'contact.added'
  | 'connected'
  | 'pong'
  | 'auth_ok'
  | 'error'
  | 'typing.start'
  | 'typing.stop'
  | 'account.deleted';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export type WsEventHandler = (payload: any) => void;

class WsService {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<WsEventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 2000;
  private readonly maxDelay = 60000;
  private shouldReconnect = false;
  private authErrorCount = 0;
  private _status: WsStatus = 'disconnected';

  // P3-3: autenticação por mensagem ({type:'auth'}) em vez de ?token= na URL.
  // Se o servidor for antigo (fecha sem responder ao auth), cai pro modo query
  // string por esta sessão.
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private useQueryAuth = false;
  private readonly authDeadlineMs = 5000;

  constructor() {
    // Reconecta quando o app volta ao foreground (iOS/Android matam conexões em background)
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && this.shouldReconnect) {
        logger.debug(
          '[WsService] App voltou ao foreground — verificando conexão'
        );
        if (!this.isConnected) {
          this._reconnect();
        }
      }
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      logger.warn('[WsService] Sem access token — conexão adiada');
      return;
    }
    this.shouldReconnect = true;
    this.reconnectDelay = 2000;
    this.authErrorCount = 0;
    this.useQueryAuth = false;
    this._open(token);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this._clearTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._setStatus('disconnected');
    logger.debug('[WsService] Desconectado');
  }

  /** Envia novo token ao servidor após renovação do JWT. */
  reauth(newToken: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', token: newToken }));
    }
  }

  /** Envia mensagem genérica ao servidor (se conectado). */
  send(type: string, payload?: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload: payload ?? {} }));
    }
  }

  on(type: WsEventType | string, handler: WsEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get status(): WsStatus {
    return this._status;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private _open(token: string): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this._clearAuthTimer();

    this._setStatus('connecting');
    // P3-3: sem ?token= na URL (não vai pro log do Nginx). Só o modo de
    // compatibilidade com servidor antigo usa query string.
    const url = this.useQueryAuth
      ? `${WS_BASE_URL}?token=${encodeURIComponent(token)}`
      : WS_BASE_URL;
    logger.debug(
      `[WsService] Conectando… (${this.useQueryAuth ? 'query' : 'msg'} auth)`
    );
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      logger.debug('[WsService] Conexão estabelecida');
      this.reconnectDelay = 2000;
      this.authErrorCount = 0;
      this._startPing();

      if (!this.useQueryAuth) {
        // Autentica pela primeira mensagem e espera confirmação.
        this.ws?.send(JSON.stringify({ type: 'auth', token }));
        this.authTimer = setTimeout(() => {
          // Servidor não respondeu ao auth → provavelmente é antigo. Cai pro
          // modo query string por esta sessão e reconecta uma vez.
          logger.warn(
            '[WsService] Sem resposta ao auth em 5s — fallback ?token='
          );
          this.useQueryAuth = true;
          if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
          }
          this._open(token);
        }, this.authDeadlineMs);
      }
    };

    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string);

        // Servidor confirmou autenticação → conexão pronta
        if (msg.type === 'connected' || msg.type === 'auth_ok') {
          this._clearAuthTimer();
          this._setStatus('connected');
        }

        // Erro de autenticação: token expirado → tenta refresh antes de reconectar
        if (msg.type === 'error' && /token/i.test(msg.payload?.message ?? '')) {
          logger.warn(
            '[WsService] Token rejeitado pelo servidor — tentando refresh'
          );
          this.authErrorCount++;
          if (this.authErrorCount <= 2) {
            this.ws!.onclose = null;
            this.ws!.close();
            this._refreshAndReconnect();
          } else {
            logger.error(
              '[WsService] Não foi possível renovar token — desconectando'
            );
            this.disconnect();
          }
          return;
        }

        this._emit(msg.type, msg.payload ?? {});
      } catch {
        logger.warn('[WsService] Mensagem não-JSON recebida');
      }
    };

    this.ws.onclose = (event: any) => {
      this._stopPing();
      this._clearAuthTimer();
      if (this.shouldReconnect) {
        this._setStatus('connecting');
        const code = event?.code ?? '?';
        const reason = event?.reason ? ` — ${event.reason}` : '';
        // P3-2: jitter (50–100% do delay) pra não sincronizar a reconexão de
        // centenas de clientes após uma queda do servidor.
        const wait = Math.round(
          this.reconnectDelay * (0.5 + Math.random() * 0.5)
        );
        logger.warn(
          `[WsService] Conexão fechada (code ${code}${reason}) — reconectando em ~${Math.round(wait / 1000)}s`
        );
        this.reconnectTimer = setTimeout(() => this._reconnect(), wait);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      } else {
        this._setStatus('disconnected');
      }
    };

    this.ws.onerror = (event: any) => {
      const msg = event?.message ?? event?.type ?? 'desconhecido';
      logger.warn(`[WsService] Erro de conexão: ${msg}`);
      // onclose sempre dispara após onerror
    };
  }

  private async _reconnect(): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      // Sem token: tenta de novo mais tarde
      const wait = Math.round(
        this.reconnectDelay * (0.5 + Math.random() * 0.5)
      );
      this.reconnectTimer = setTimeout(() => this._reconnect(), wait);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      return;
    }
    this._open(token);
  }

  private _clearAuthTimer(): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
  }

  private async _refreshAndReconnect(): Promise<void> {
    const newToken = await refreshAccessToken();
    if (newToken) {
      logger.debug('[WsService] Token renovado — reconectando');
      this.reconnectDelay = 2000;
      this._open(newToken);
    } else {
      logger.error('[WsService] Refresh falhou — sessão encerrada');
      await clearSession();
      this.disconnect();
    }
  }

  private _setStatus(status: WsStatus): void {
    if (this._status === status) return;
    this._status = status;
    this._emit('__ws_status', { status });
  }

  private _emit(type: string, payload: any): void {
    this.listeners.get(type)?.forEach(handler => {
      try {
        handler(payload);
      } catch (e) {
        logger.error('[WsService] Erro no handler de evento:', e as Error);
      }
    });
  }

  private _startPing(): void {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private _stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private _clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._clearAuthTimer();
    this._stopPing();
  }
}

export const wsService = new WsService();
