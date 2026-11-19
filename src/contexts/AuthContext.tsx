import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { authApi, AuthUser } from '../services/authApi';
import { api } from '../services/apiClient';
import { onSessionExpired } from '../services/sessionExpired';
import { logger } from '../utils/logger';
import { registerForPushNotificationsAsync } from '../services/notifications';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuthContextData {
  user: AuthUser | null;
  loading: boolean;
  hasProfile: boolean | null;
  /** Envia código OTP (WhatsApp → SMS fallback) para o número informado */
  sendCode: (
    phoneNumber: string,
    preferSms?: boolean
  ) => Promise<{
    success: boolean;
    channel?: 'whatsapp' | 'sms';
    error?: string;
    retryAfter?: number;
  }>;
  /** Verifica o código e autentica o usuário */
  signIn: (
    phoneNumber: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  updateProfile: (fields: {
    nickname?: string;
    profile_emoji?: string;
    profile_complete?: boolean;
    push_token?: string;
    require_consent?: boolean;
  }) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Derivado: null enquanto carrega, boolean quando usuário autenticado
  const hasProfile: boolean | null = loading
    ? null
    : user
      ? user.profile_complete
      : null;

  // ─── Registra push token sempre que o usuário estiver disponível ─────────
  useEffect(() => {
    if (!user) return;
    registerForPushNotificationsAsync(user.uid).catch(err =>
      logger.error('[Auth] Erro ao registrar push token:', err)
    );
  }, [user?.uid]);

  // ─── Inicialização: tenta restaurar sessão salva ────────────────────────
  useEffect(() => {
    logger.debug('[Auth] Iniciando restauração de sessão...');
    authApi
      .tryRestoreSession()
      .then(restoredUser => {
        if (restoredUser) {
          logger.debug('[Auth] Sessão restaurada:', restoredUser.uid);
        } else {
          logger.debug('[Auth] Nenhuma sessão encontrada');
        }
        setUser(restoredUser);
      })
      .catch(err => {
        logger.error('[Auth] Erro ao restaurar sessão:', err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Sessão morta (refresh falhou de vez) → derruba pra tela de Login ────
  useEffect(() => {
    return onSessionExpired(() => {
      logger.debug('[Auth] Sessão expirada — voltando pro login');
      setUser(null);
    });
  }, []);

  // ─── Métodos ────────────────────────────────────────────────────────────

  const sendCode = async (phoneNumber: string, preferSms = false) => {
    return authApi.sendCode(phoneNumber, preferSms);
  };

  const signIn = async (
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.verifyCode(phoneNumber, code);
    if (result.success && result.user) {
      setUser(result.user);
      logger.debug('[Auth] Login realizado:', result.user.uid);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const signOut = async () => {
    logger.debug('[Auth] Fazendo logout...');
    await authApi.logout();
    setUser(null);
  };

  const deleteAccount = async () => {
    const result = await authApi.deleteAccount();
    if (result.success) {
      setUser(null);
    } else {
      throw new Error(result.error ?? 'Erro ao excluir conta');
    }
  };

  const reloadProfile = async () => {
    const updated = await authApi.reloadProfile();
    if (updated) setUser(updated);
  };

  const updateProfile = async (
    fields: Parameters<typeof authApi.updateProfile>[0]
  ) => {
    const updated = await authApi.updateProfile(fields);
    if (updated) {
      setUser(updated);
    } else {
      throw new Error('Falha ao atualizar perfil');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasProfile,
        sendCode,
        signIn,
        signOut,
        deleteAccount,
        reloadProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
