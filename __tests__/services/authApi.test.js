// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../src/services/apiClient', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE_URL: 'https://api.zoji.app',
  STORAGE_KEYS: {
    USER: '@zoji:user',
  },
  setMemoryToken: jest.fn(),
}));

// P3-1: tokens agora vivem no SecureStore, não no AsyncStorage.
jest.mock('../../src/services/secureTokens', () => ({
  getAccessToken: jest.fn(() => Promise.resolve(null)),
  getRefreshToken: jest.fn(() => Promise.resolve(null)),
  setAccessToken: jest.fn(() => Promise.resolve()),
  setRefreshToken: jest.fn(() => Promise.resolve()),
  setTokens: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
  migrateLegacyTokens: jest.fn(() => Promise.resolve()),
}));

jest.mock('axios', () => ({ post: jest.fn() }));

// ─── Imports (after mocks) ─────────────────────────────────────────────────

const AsyncStorage = require('@react-native-async-storage/async-storage');
const axiosMock = require('axios');
const {
  api: mockApi,
  setMemoryToken,
} = require('../../src/services/apiClient');
const secure = require('../../src/services/secureTokens');
const { authApi } = require('../../src/services/authApi');

// ─── Constants ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  USER: '@zoji:user',
};

const mockUserRaw = {
  id: 42,
  phone_number: '+5511999990000',
  nickname: 'TestUser',
  profile_emoji: '🤖',
  profile_complete: true,
  require_consent: false,
};

// ─── sendCode ──────────────────────────────────────────────────────────────

describe('authApi.sendCode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success:true on 2xx', async () => {
    axiosMock.post.mockResolvedValueOnce({ data: { channel: 'whatsapp' } });
    const result = await authApi.sendCode('+5511999990000');
    expect(result).toEqual({ success: true, channel: 'whatsapp' });
    expect(axiosMock.post).toHaveBeenCalledWith(
      'https://api.zoji.app/auth/send-code',
      { phone_number: '+5511999990000', prefer_channel: 'auto' }
    );
  });

  it('returns success:false with server error message on failure', async () => {
    axiosMock.post.mockRejectedValueOnce({
      response: { data: { error: 'Número inválido' } },
    });
    const result = await authApi.sendCode('abc');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Número inválido');
  });

  it('returns generic error message when no response body', async () => {
    axiosMock.post.mockRejectedValueOnce(new Error('Network Error'));
    const result = await authApi.sendCode('+5511999990000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao enviar código. Verifique sua conexão.');
  });
});

// ─── verifyCode ────────────────────────────────────────────────────────────

describe('authApi.verifyCode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success:true with normalized user on valid code', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: {
        user: mockUserRaw,
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
      },
    });
    const result = await authApi.verifyCode('+5511999990000', '123456');

    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: 42,
      uid: '42',
      phoneNumber: '+5511999990000',
    });
    expect(setMemoryToken).toHaveBeenCalledWith('access-abc');
    expect(secure.setTokens).toHaveBeenCalledWith('access-abc', 'refresh-xyz');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.USER,
      JSON.stringify(result.user)
    );
  });

  it('returns success:false with server error on invalid code', async () => {
    axiosMock.post.mockRejectedValueOnce({
      response: { data: { error: 'Código incorreto' } },
    });
    const result = await authApi.verifyCode('+5511999990000', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Código incorreto');
  });

  it('returns generic error when no server response', async () => {
    axiosMock.post.mockRejectedValueOnce(new Error('timeout'));
    const result = await authApi.verifyCode('+5511999990000', '000000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Código inválido');
  });
});

// ─── logout ────────────────────────────────────────────────────────────────

describe('authApi.logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.post with refresh token then clears storage', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    mockApi.post.mockResolvedValueOnce({});

    await authApi.logout();

    expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', {
      refresh_token: 'refresh-xyz',
    });
    expect(secure.clearTokens).toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('skips api.post when no refresh token exists', async () => {
    secure.getRefreshToken.mockResolvedValueOnce(null);

    await authApi.logout();

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(secure.clearTokens).toHaveBeenCalled();
  });

  it('still clears storage even if api.post throws', async () => {
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    mockApi.post.mockRejectedValueOnce(new Error('Network error'));

    try {
      await authApi.logout();
    } catch {}

    expect(secure.clearTokens).toHaveBeenCalled();
  });
});

// ─── tryRestoreSession ─────────────────────────────────────────────────────

describe('authApi.tryRestoreSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when no access token in storage', async () => {
    secure.getAccessToken.mockResolvedValueOnce(null);
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const result = await authApi.tryRestoreSession();
    expect(result).toBeNull();
    expect(setMemoryToken).not.toHaveBeenCalled();
  });

  it('returns normalized user from cache when token and user both exist', async () => {
    secure.getAccessToken.mockResolvedValueOnce('access-abc');
    secure.getRefreshToken.mockResolvedValueOnce('refresh-xyz');
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockUserRaw));

    const result = await authApi.tryRestoreSession();
    expect(secure.migrateLegacyTokens).toHaveBeenCalled();
    expect(setMemoryToken).toHaveBeenCalledWith('access-abc');
    expect(result).toMatchObject({ uid: '42', phoneNumber: '+5511999990000' });
  });

  it('fetches profile from API when token exists but user not cached', async () => {
    secure.getAccessToken.mockResolvedValueOnce('access-abc');
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    mockApi.get.mockResolvedValueOnce({ data: mockUserRaw });

    const result = await authApi.tryRestoreSession();
    expect(mockApi.get).toHaveBeenCalledWith('/user/profile');
    expect(result).toMatchObject({ uid: '42' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.USER,
      expect.any(String)
    );
  });

  it('clears session and returns null on 401 when fetching profile', async () => {
    secure.getAccessToken.mockResolvedValueOnce('stale-token');
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

    const result = await authApi.tryRestoreSession();
    expect(setMemoryToken).toHaveBeenLastCalledWith(null);
    expect(secure.clearTokens).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null (without throwing) on non-401 profile fetch error', async () => {
    secure.getAccessToken.mockResolvedValueOnce('stale-token');
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    const result = await authApi.tryRestoreSession();
    expect(result).toBeNull();
  });
});

// ─── reloadProfile ─────────────────────────────────────────────────────────

describe('authApi.reloadProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches profile, caches it and returns normalized user', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockUserRaw });
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const result = await authApi.reloadProfile();
    expect(result).toMatchObject({ uid: '42', phoneNumber: '+5511999990000' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.USER,
      expect.any(String)
    );
  });

  it('returns null on error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('fail'));
    const result = await authApi.reloadProfile();
    expect(result).toBeNull();
  });
});

// ─── updateProfile ─────────────────────────────────────────────────────────

describe('authApi.updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('puts fields, caches updated user and returns normalized user', async () => {
    const updatedRaw = { ...mockUserRaw, nickname: 'NewName' };
    mockApi.put.mockResolvedValueOnce({ data: updatedRaw });
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const result = await authApi.updateProfile({ nickname: 'NewName' });
    expect(mockApi.put).toHaveBeenCalledWith('/user/profile', {
      nickname: 'NewName',
    });
    expect(result).toMatchObject({ nickname: 'NewName', uid: '42' });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('returns null on error', async () => {
    mockApi.put.mockRejectedValueOnce(new Error('fail'));
    const result = await authApi.updateProfile({ nickname: 'x' });
    expect(result).toBeNull();
  });
});

// ─── deleteAccount ─────────────────────────────────────────────────────────

describe('authApi.deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes account and clears storage on success', async () => {
    mockApi.delete.mockResolvedValueOnce({});
    AsyncStorage.multiRemove.mockResolvedValueOnce(undefined);

    const result = await authApi.deleteAccount();
    expect(result).toEqual({ success: true });
    expect(mockApi.delete).toHaveBeenCalledWith('/user/account');
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      Object.values(STORAGE_KEYS)
    );
  });

  it('returns success:false with server error on failure', async () => {
    mockApi.delete.mockRejectedValueOnce({
      response: { data: { error: 'Conta não encontrada' } },
    });

    const result = await authApi.deleteAccount();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Conta não encontrada');
  });

  it('returns generic error when no server response body', async () => {
    mockApi.delete.mockRejectedValueOnce(new Error('Network'));
    const result = await authApi.deleteAccount();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao excluir conta');
  });
});
