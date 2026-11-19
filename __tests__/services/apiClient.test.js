// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// P3-1: tokens vivem no SecureStore
jest.mock('../../src/services/secureTokens', () => ({
  getAccessToken: jest.fn(() => Promise.resolve(null)),
  getRefreshToken: jest.fn(() => Promise.resolve(null)),
  setAccessToken: jest.fn(() => Promise.resolve()),
  setRefreshToken: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({ NativeModules: {} }));

// P3-2: notificação de backoff pra UI (RetryBanner) — mockado pra verificar
// só que foi chamado certo, sem precisar montar componente nenhum aqui.
jest.mock('../../src/services/apiBackoffStatus', () => ({
  setBackoff: jest.fn(),
  clearBackoff: jest.fn(),
}));

// Sessão morta → avisa o AuthContext (ver sessionExpired.ts) — mockado pra
// verificar que foi chamado, sem precisar montar o AuthProvider aqui.
jest.mock('../../src/services/sessionExpired', () => ({
  emitSessionExpired: jest.fn(),
}));

// Capture interceptors registered by the module under test
let requestInterceptor = null;
let requestErrorHandler = null;
let responseSuccessInterceptor = null;
let responseErrorInterceptor = null;

const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn((fn, errFn) => {
        requestInterceptor = fn;
        requestErrorHandler = errFn;
      }),
    },
    response: {
      use: jest.fn((successFn, errFn) => {
        responseSuccessInterceptor = successFn;
        responseErrorInterceptor = errFn;
      }),
    },
  },
};

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

// ─── Imports ────────────────────────────────────────────────────────────────

const AsyncStorage = require('@react-native-async-storage/async-storage');
const axios = require('axios');
const secure = require('../../src/services/secureTokens');
const backoffStatus = require('../../src/services/apiBackoffStatus');
const sessionExpired = require('../../src/services/sessionExpired');
const {
  setMemoryToken,
  getMemoryToken,
  refreshAccessToken,
  STORAGE_KEYS,
  API_BASE_URL,
} = require('../../src/services/apiClient');

// ─── setMemoryToken / getMemoryToken ────────────────────────────────────────

describe('setMemoryToken / getMemoryToken', () => {
  afterEach(() => setMemoryToken(null));

  it('starts as null', () => {
    expect(getMemoryToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setMemoryToken('my-jwt');
    expect(getMemoryToken()).toBe('my-jwt');
  });

  it('can be cleared back to null', () => {
    setMemoryToken('some-token');
    setMemoryToken(null);
    expect(getMemoryToken()).toBeNull();
  });
});

// ─── refreshAccessToken ─────────────────────────────────────────────────────

describe('refreshAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMemoryToken(null);
  });

  it('returns null when no refresh token in storage', async () => {
    secure.getRefreshToken.mockResolvedValueOnce(null);
    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });

  it('fetches new access token, saves to storage and memory', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'new-access', user: null },
    });

    const result = await refreshAccessToken();

    expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: 'refresh-xyz',
    });
    expect(result).toBe('new-access');
    expect(getMemoryToken()).toBe('new-access');
    expect(secure.setAccessToken).toHaveBeenCalledWith('new-access');
  });

  it('persists the rotated refresh token when present (P2-7)', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-old');
    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access',
        refresh_token: 'refresh-new',
        user: null,
      },
    });

    await refreshAccessToken();

    expect(secure.setRefreshToken).toHaveBeenCalledWith('refresh-new');
  });

  it('also saves user to storage when user is in refresh response', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access',
        user: { id: 1, phone_number: '+5511999990000', nickname: 'Alice' },
      },
    });

    await refreshAccessToken();

    const [key, json] = AsyncStorage.setItem.mock.calls.at(-1);
    expect(key).toBe(STORAGE_KEYS.USER);
    const savedUser = JSON.parse(json);
    expect(savedUser.uid).toBe('1');
    expect(savedUser.phoneNumber).toBe('+5511999990000');
  });

  it('returns null on network error', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    axios.post.mockRejectedValueOnce(new Error('Network error'));

    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });
});

// ─── Request interceptor ────────────────────────────────────────────────────

describe('request interceptor', () => {
  afterEach(() => setMemoryToken(null));

  it('adds Authorization header when token is set', () => {
    setMemoryToken('bearer-token');
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBe('Bearer bearer-token');
  });

  it('does not add Authorization header when no token', () => {
    setMemoryToken(null);
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

// ─── Response interceptor ───────────────────────────────────────────────────

describe('response interceptor — success passthrough', () => {
  it('passes successful responses through unchanged', () => {
    const response = { status: 200, data: { ok: true } };
    expect(responseSuccessInterceptor(response)).toBe(response);
  });
});

describe('response interceptor — 401 token refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMemoryToken(null);
  });

  it('clears session and rejects when 401 with no refresh token', async () => {
    secure.getRefreshToken.mockResolvedValueOnce(null);

    const error = {
      config: { _retry: false, headers: {} },
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBeDefined();
    expect(secure.clearTokens).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    expect(sessionExpired.emitSessionExpired).toHaveBeenCalled();
  });

  it('refreshes token and persists it after a 401', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'fresh-token', user: null },
    });

    const error = {
      config: { _retry: false, headers: {} },
      response: { status: 401 },
    };

    try {
      await responseErrorInterceptor(error);
    } catch {
      // o retry via api(original) usa o mockAxiosInstance (não é callable) — ok
    }

    expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: 'refresh-xyz',
    });
    expect(secure.setAccessToken).toHaveBeenCalledWith('fresh-token');
  });

  it('does not retry a request that already has _retry:true', async () => {
    const error = {
      config: { _retry: true, headers: {} },
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBeDefined();
    expect(secure.getRefreshToken).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors unchanged', async () => {
    const error = {
      config: { _retry: false },
      response: { status: 500 },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
  });
});

describe('response interceptor — 429/5xx retry com backoff (P3-2)', () => {
  beforeEach(() => {
    backoffStatus.setBackoff.mockClear();
    backoffStatus.clearBackoff.mockClear();
  });

  // jest.setup.js liga jest.useFakeTimers() globalmente — o sleep() real do
  // apiClient nunca resolveria sozinho; advanceTimersByTimeAsync avança o
  // relógio E dá vazão às microtasks/promises pendentes.
  it('avisa o backoff (rate_limit) e respeita Retry-After num 429 em requisição idempotente', async () => {
    const error = {
      config: { method: 'get', headers: {} },
      response: { status: 429, headers: { 'retry-after': '0.05' } },
    };

    // mockAxiosInstance não é chamável — o retry em si rejeita, mas o que
    // importa aqui é que o aviso de backoff foi disparado corretamente
    // ANTES da tentativa (mesmo padrão do teste de 401 acima).
    const promise = responseErrorInterceptor(error);
    const assertion = expect(promise).rejects.toBeDefined();
    await jest.advanceTimersByTimeAsync(100);
    await assertion;

    expect(backoffStatus.setBackoff).toHaveBeenCalledTimes(1);
    const [retryAt, reason] = backoffStatus.setBackoff.mock.calls[0];
    expect(reason).toBe('rate_limit');
    expect(retryAt).toBeGreaterThan(Date.now() - 1000); // ~agora + 50ms
    expect(backoffStatus.clearBackoff).toHaveBeenCalledTimes(1);
  });

  it('avisa o backoff (server_error) num 503 em requisição idempotente', async () => {
    const error = {
      config: { method: 'get', headers: {} },
      response: { status: 503, headers: {} },
    };

    const promise = responseErrorInterceptor(error);
    const assertion = expect(promise).rejects.toBeDefined();
    await jest.advanceTimersByTimeAsync(3000); // 1ª tentativa: 1s base + até 1s de jitter
    await assertion;

    expect(backoffStatus.setBackoff).toHaveBeenCalledTimes(1);
    expect(backoffStatus.setBackoff.mock.calls[0][1]).toBe('server_error');
  });

  it('NÃO re-tenta POST sem retryable:true (ex.: /auth/verify-code)', async () => {
    const error = {
      config: { method: 'post', headers: {} },
      response: { status: 503, headers: {} },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    expect(backoffStatus.setBackoff).not.toHaveBeenCalled();
  });

  it('re-tenta POST /messages marcado explicitamente como retryable', async () => {
    const error = {
      config: { method: 'post', retryable: true, headers: {} },
      response: { status: 502, headers: {} },
    };

    const promise = responseErrorInterceptor(error);
    const assertion = expect(promise).rejects.toBeDefined();
    await jest.advanceTimersByTimeAsync(3000);
    await assertion;
    expect(backoffStatus.setBackoff).toHaveBeenCalledTimes(1);
  });

  it('NÃO re-tenta depois de esgotar as 3 tentativas', async () => {
    const error = {
      config: { method: 'get', headers: {}, _retryCount: 3 },
      response: { status: 502, headers: {} },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    expect(backoffStatus.setBackoff).not.toHaveBeenCalled();
  });
});

describe('resolveApiBaseUrl', () => {
  const { resolveApiBaseUrl } = require('../../src/services/apiClient');

  it('release sempre usa a produção, mesmo com EXPO_PUBLIC_API_URL', () => {
    expect(resolveApiBaseUrl(false, undefined)).toBe('https://api.zoji.app');
    expect(resolveApiBaseUrl(false, 'http://localhost:8080')).toBe(
      'https://api.zoji.app'
    );
  });

  it('em dev, sem variável, usa o servidor falso local', () => {
    expect(resolveApiBaseUrl(true, undefined)).toBe('http://localhost:8080');
    expect(resolveApiBaseUrl(true, '  ')).toBe('http://localhost:8080');
  });

  it('em dev, respeita EXPO_PUBLIC_API_URL e tira a barra final', () => {
    expect(resolveApiBaseUrl(true, 'https://api.zoji.app/')).toBe(
      'https://api.zoji.app'
    );
    expect(resolveApiBaseUrl(true, 'http://10.0.2.2:8080')).toBe(
      'http://10.0.2.2:8080'
    );
  });
});
