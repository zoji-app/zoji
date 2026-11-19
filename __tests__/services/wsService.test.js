// P3-3: WebSocket autenticado por mensagem ({type:'auth'}) + fallback ?token=.

jest.mock('../../src/services/secureTokens', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('jwt-abc')),
}));

jest.mock('../../src/services/apiClient', () => ({
  API_BASE_URL: 'https://api.zoji.app',
  refreshAccessToken: jest.fn(() => Promise.resolve('jwt-new')),
  clearSession: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn() },
}));

// ─── Mock WebSocket controlável ──────────────────────────────────────────────
let lastSocket = null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    lastSocket = this;
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }

  // helpers de teste
  _open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  _message(obj) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}

global.WebSocket = MockWebSocket;

const { wsService } = require('../../src/services/wsService');
const apiClient = require('../../src/services/apiClient');

describe('wsService — auth por mensagem (P3-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    lastSocket = null;
    wsService.disconnect();
  });

  it('conecta sem ?token= e manda {type:auth} no onopen', async () => {
    await wsService.connect();
    expect(lastSocket.url).toBe('wss://api.zoji.app/ws');

    lastSocket._open();
    expect(lastSocket.sent[0]).toEqual({ type: 'auth', token: 'jwt-abc' });
    // ainda não "connected" — espera confirmação do servidor
    expect(wsService.status).toBe('connecting');
  });

  it('marca connected só depois do auth_ok / connected', async () => {
    await wsService.connect();
    lastSocket._open();
    lastSocket._message({ type: 'auth_ok', payload: { user_id: 1 } });
    expect(wsService.status).toBe('connected');
  });

  it('faz fallback pra ?token= se o servidor não responder ao auth em 5s', async () => {
    await wsService.connect();
    lastSocket._open();
    const firstSocket = lastSocket;

    // servidor antigo: nada volta
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(firstSocket.readyState).toBe(MockWebSocket.CLOSED);
    expect(lastSocket).not.toBe(firstSocket);
    expect(lastSocket.url).toBe('wss://api.zoji.app/ws?token=jwt-abc');
  });

  it('não faz fallback se o auth_ok chega dentro da janela', async () => {
    await wsService.connect();
    lastSocket._open();
    const firstSocket = lastSocket;
    lastSocket._message({ type: 'connected', payload: {} });

    jest.advanceTimersByTime(6000);
    expect(lastSocket).toBe(firstSocket);
    expect(wsService.status).toBe('connected');
  });
});

// Fix do incidente de fail2ban (401 em loop): quando o servidor rejeita o
// token e o refresh também falha, a sessão precisa morrer de vez — não só
// no WS, senão o resto do app (Chat, Friends, etc.) continua achando que
// está autenticado e martelando a API.
describe('wsService — refresh falhou de vez (sessão morta)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    lastSocket = null;
    wsService.disconnect();
  });

  it('chama clearSession e desconecta quando o refresh falha após token rejeitado', async () => {
    apiClient.refreshAccessToken.mockResolvedValueOnce(null);

    await wsService.connect();
    lastSocket._open();
    lastSocket._message({
      type: 'error',
      payload: { message: 'token expirado' },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.clearSession).toHaveBeenCalled();
    expect(wsService.status).toBe('disconnected');
  });
});
