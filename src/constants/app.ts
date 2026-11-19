/**
 * Constantes gerais da aplicação Zoji!
 */

// Configurações de mensagens
export const MESSAGE_CONSTANTS = {
  MAX_EMOJIS_PER_MESSAGE: 4,
  MAX_MESSAGES_PER_MINUTE: 100,
  MESSAGE_TIMEOUT_MS: 30000, // 30 segundos
} as const;

// Configurações de usuário
export const USER_CONSTANTS = {
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 30,
  PROFILE_EMOJI_REQUIRED: true,
} as const;

// Configurações de autenticação
export const AUTH_CONSTANTS = {
  SMS_TIMEOUT_SECONDS: 60,
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT_HOURS: 24,
} as const;

// Configurações de conectividade
export const CONNECTIVITY_CONSTANTS = {
  RETRY_DELAY_MS: 3000,
  MAX_RETRIES: 3,
  PING_INTERVAL_MS: 30000,
} as const;

// Configurações de cache
export const CACHE_CONSTANTS = {
  CONTACTS_TTL_HOURS: 24,
  MESSAGES_TTL_HOURS: 72,
  PROFILE_TTL_HOURS: 168, // 1 semana
} as const;

// Configurações de performance
export const PERFORMANCE_CONSTANTS = {
  DEBOUNCE_SEARCH_MS: 300,
  THROTTLE_SCROLL_MS: 100,
  IMAGE_CACHE_SIZE_MB: 50,
} as const;

// Configurações de UI
export const UI_CONSTANTS = {
  TOAST_DURATION_MS: 3000,
  ANIMATION_DURATION_MS: 300,
  LOADING_DELAY_MS: 500,
} as const;

// URLs e endpoints
export const URL_CONSTANTS = {
  PRIVACY_POLICY: 'https://de4araujo.dev/zoji/privacy',
  TERMS_OF_SERVICE: 'https://de4araujo.dev/zoji/terms',
  SUPPORT_EMAIL: 'support@de4araujo.dev',
  SECURITY_EMAIL: 'security@de4araujo.dev',
} as const;

// Configurações de desenvolvimento
export const DEV_CONSTANTS = {
  LOG_LEVEL: __DEV__ ? 'debug' : 'error',
  ENABLE_FLIPPER: __DEV__,
  SHOW_DEV_MENU: __DEV__,
} as const;

// Status de relacionamento entre usuários
export const RELATIONSHIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
  REJECTED: 'rejected',
} as const;

// Status de mensagem
export const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// Temas disponíveis
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Idiomas suportados
export const SUPPORTED_LANGUAGES = {
  PT_BR: 'pt-BR',
  EN_US: 'en-US',
  ES_ES: 'es-ES',
} as const;

// Tipos de notificação
export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  CONTACT_REQUEST: 'contact_request',
  CONTACT_ACCEPTED: 'contact_accepted',
  SYSTEM: 'system',
} as const;

// Configurações de validação
export const VALIDATION_PATTERNS = {
  PHONE_NUMBER: /^\+[1-9]\d{1,14}$/,
  EMOJI: /\p{Emoji}/u,
  NICKNAME: /^[a-zA-ZÀ-ÿ\s]{2,30}$/,
} as const;

// Códigos de erro customizados
export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CODE: 'auth/invalid-verification-code',
  AUTH_CODE_EXPIRED: 'auth/code-expired',
  AUTH_TOO_MANY_REQUESTS: 'auth/too-many-requests',

  // Network
  NETWORK_ERROR: 'network/error',
  NETWORK_TIMEOUT: 'network/timeout',

  // Firestore
  PERMISSION_DENIED: 'zoji/permission-denied',
  QUOTA_EXCEEDED: 'zoji/quota-exceeded',

  // Custom
  USER_BLOCKED: 'zoji/user-blocked',
  MESSAGE_TOO_LONG: 'zoji/message-too-long',
  RATE_LIMIT_EXCEEDED: 'zoji/rate-limit-exceeded',
} as const;

// Configurações de Analytics
export const ANALYTICS_EVENTS = {
  // User actions
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
  PROFILE_CREATED: 'profile_created',

  // Messaging
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',

  // Social
  CONTACT_ADDED: 'contact_added',
  CONTACT_BLOCKED: 'contact_blocked',

  // App usage
  APP_OPENED: 'app_opened',
  SCREEN_VIEW: 'screen_view',
} as const;

export type MessageStatus =
  (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];
export type RelationshipStatus =
  (typeof RELATIONSHIP_STATUS)[keyof typeof RELATIONSHIP_STATUS];
export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];
export type SupportedLanguage =
  (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];
export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
