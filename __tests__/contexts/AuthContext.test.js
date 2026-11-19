// ─── Mocks ──────────────────────────────────────────────────────────────────

// AuthContext.tsx calls registerForPushNotificationsAsync on user change.
// Without this mock, the real implementation would reach authApi.updateProfile
// during initialization, consuming one-time mocks set up for specific tests.
jest.mock('../../src/services/notifications', () => ({
  BACKGROUND_NOTIFICATION_TASK: 'BACKGROUND-NOTIFICATION-TASK',
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue(null),
  registerBackgroundNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  configureNotificationHandler: jest.fn(),
  setupNotificationListeners: jest.fn().mockReturnValue(() => {}),
  registerPushToken: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/authApi', () => ({
  authApi: {
    tryRestoreSession: jest.fn(),
    sendCode: jest.fn(),
    verifyCode: jest.fn(),
    logout: jest.fn(),
    deleteAccount: jest.fn(),
    reloadProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock('../../src/services/apiClient', () => ({
  api: {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  API_BASE_URL: 'https://api.zoji.app',
  STORAGE_KEYS: {
    ACCESS_TOKEN: '@zoji:access_token',
    REFRESH_TOKEN: '@zoji:refresh_token',
    USER: '@zoji:user',
  },
  setMemoryToken: jest.fn(),
  getMemoryToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ─── Imports ────────────────────────────────────────────────────────────────

const React = require('react');
const { renderHook, act, waitFor } = require('@testing-library/react-native');
const { authApi } = require('../../src/services/authApi');
const { AuthProvider, useAuth } = require('../../src/contexts/AuthContext');
// Módulo real (não mockado) — testa a assinatura de verdade, igual o
// resto do arquivo testa o AuthContext de ponta a ponta.
const { emitSessionExpired } = require('../../src/services/sessionExpired');

// ─── Helpers ────────────────────────────────────────────────────────────────

const wrapper = ({ children }) =>
  React.createElement(AuthProvider, null, children);

const mockUser = {
  id: 1,
  uid: '1',
  phone_number: '+5511999990000',
  phoneNumber: '+5511999990000',
  nickname: 'Alice',
  profile_emoji: '😊',
  profile_complete: true,
  require_consent: false,
};

// ─── Initialization ──────────────────────────────────────────────────────────

describe('AuthProvider — initialization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with loading:true and user:null', () => {
    authApi.tryRestoreSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets user after session is restored', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toMatchObject({ uid: '1', nickname: 'Alice' });
  });

  it('sets user:null when no session found', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('sets user:null and loading:false when tryRestoreSession throws', async () => {
    authApi.tryRestoreSession.mockRejectedValueOnce(new Error('storage error'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });
});

// ─── hasProfile ──────────────────────────────────────────────────────────────

describe('AuthProvider — hasProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is null while loading', () => {
    authApi.tryRestoreSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.hasProfile).toBeNull();
  });

  it('is true when user has profile_complete:true', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce({
      ...mockUser,
      profile_complete: true,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasProfile).toBe(true);
  });

  it('is false when user has profile_complete:false', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce({
      ...mockUser,
      profile_complete: false,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasProfile).toBe(false);
  });

  it('is null when no user (not loading)', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasProfile).toBeNull();
  });
});

// ─── sendCode ────────────────────────────────────────────────────────────────

describe('AuthProvider — sendCode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates to authApi.sendCode and returns the result', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    authApi.sendCode.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => {
      response = await result.current.sendCode('+5511999990000');
    });

    expect(authApi.sendCode).toHaveBeenCalledWith('+5511999990000', false);
    expect(response).toEqual({ success: true });
  });

  it('returns error result from authApi.sendCode', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    authApi.sendCode.mockResolvedValueOnce({
      success: false,
      error: 'Número inválido',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => {
      response = await result.current.sendCode('invalid');
    });

    expect(response).toEqual({ success: false, error: 'Número inválido' });
  });
});

// ─── signIn ──────────────────────────────────────────────────────────────────

describe('AuthProvider — signIn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets user and returns true on successful verification', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    authApi.verifyCode.mockResolvedValueOnce({ success: true, user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.signIn('+5511999990000', '123456');
    });

    expect(ok).toEqual({ success: true });
    expect(result.current.user).toMatchObject({ uid: '1' });
  });

  it('returns false and leaves user null on failed verification', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(null);
    authApi.verifyCode.mockResolvedValueOnce({
      success: false,
      error: 'Código inválido',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.signIn('+5511999990000', 'wrong');
    });

    expect(ok).toEqual({ success: false, error: 'Código inválido' });
    expect(result.current.user).toBeNull();
  });
});

// ─── signOut ─────────────────────────────────────────────────────────────────

describe('AuthProvider — signOut', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls authApi.logout and clears user', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.logout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});

// ─── sessão expirada (fix do incidente de fail2ban) ──────────────────────────

describe('AuthProvider — sessão expirada', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limpa o usuário quando emitSessionExpired é disparado', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => {
      emitSessionExpired();
    });

    await waitFor(() => expect(result.current.user).toBeNull());
  });
});

// ─── deleteAccount ───────────────────────────────────────────────────────────

describe('AuthProvider — deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears user on success', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.deleteAccount.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(result.current.user).toBeNull();
  });

  it('throws error on failure without clearing user', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.deleteAccount.mockResolvedValueOnce({
      success: false,
      error: 'Falha',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await expect(
      act(async () => {
        await result.current.deleteAccount();
      })
    ).rejects.toThrow('Falha');
    expect(result.current.user).toMatchObject({ uid: '1' });
  });

  it('throws generic error when no error message provided', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.deleteAccount.mockResolvedValueOnce({ success: false });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await expect(
      act(async () => {
        await result.current.deleteAccount();
      })
    ).rejects.toThrow('Erro ao excluir conta');
  });
});

// ─── reloadProfile ───────────────────────────────────────────────────────────

describe('AuthProvider — reloadProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates user when reloadProfile returns new data', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.reloadProfile.mockResolvedValueOnce({
      ...mockUser,
      nickname: 'AliceUpdated',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.reloadProfile();
    });

    expect(result.current.user).toMatchObject({ nickname: 'AliceUpdated' });
  });

  it('does not change user when reloadProfile returns null', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.reloadProfile.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.reloadProfile();
    });

    expect(result.current.user).toMatchObject({ nickname: 'Alice' });
  });
});

// ─── updateProfile ───────────────────────────────────────────────────────────

describe('AuthProvider — updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates user state with returned profile data', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.updateProfile.mockResolvedValueOnce({
      ...mockUser,
      profile_emoji: '🎉',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.updateProfile({ profile_emoji: '🎉' });
    });

    expect(authApi.updateProfile).toHaveBeenCalledWith({ profile_emoji: '🎉' });
    expect(result.current.user).toMatchObject({ profile_emoji: '🎉' });
  });

  it('throws and does not change user when updateProfile returns null', async () => {
    authApi.tryRestoreSession.mockResolvedValueOnce(mockUser);
    authApi.updateProfile.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await expect(
      act(async () => {
        await result.current.updateProfile({ nickname: 'fail' });
      })
    ).rejects.toThrow('Falha ao atualizar perfil');

    expect(result.current.user).toMatchObject({ nickname: 'Alice' });
  });
});
