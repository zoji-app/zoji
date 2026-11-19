// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'pt' }]),
}));

jest.mock('../../src/i18n', () => ({
  i18n: { locale: 'pt-BR' },
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  getCurrentLanguage: jest.fn().mockReturnValue('pt-BR'),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ─── Imports ────────────────────────────────────────────────────────────────

const React = require('react');
const { renderHook, act, waitFor } = require('@testing-library/react-native');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { getLocales } = require('expo-localization');
const { changeLanguage } = require('../../src/i18n');
const {
  LanguageProvider,
  useLanguage,
  languageVersionState,
} = require('../../src/contexts/LanguageContext');

const wrapper = ({ children }) =>
  React.createElement(LanguageProvider, null, children);

// ─── Initialization ──────────────────────────────────────────────────────────

describe('LanguageProvider — initialization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads saved language from AsyncStorage on mount', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('en');

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('en'));

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_language');
    expect(changeLanguage).toHaveBeenCalledWith('en');
  });

  it('falls back to device language when no saved language', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    getLocales.mockReturnValueOnce([{ languageCode: 'es' }]);
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith('es'));

    expect(result.current.language).toBe('es');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'es');
  });

  it('maps Portuguese device language to pt-BR', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    getLocales.mockReturnValueOnce([{ languageCode: 'pt' }]);
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith('pt-BR'));
    expect(result.current.language).toBe('pt-BR');
  });

  it('defaults to en for unsupported device language', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    getLocales.mockReturnValueOnce([{ languageCode: 'fr' }]);
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith('en'));
    expect(result.current.language).toBe('en');
  });

  it('ignores unsupported saved language and falls back to device language', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('fr'); // not supported
    getLocales.mockReturnValueOnce([{ languageCode: 'en' }]);
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith('en'));
    expect(result.current.language).toBe('en');
  });

  it('falls back to pt-BR on AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage fail'));

    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith('pt-BR'));
    expect(result.current.language).toBe('pt-BR');
  });
});

// ─── setLanguage ─────────────────────────────────────────────────────────────

describe('LanguageProvider — setLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('pt-BR');
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('changes language state and persists to AsyncStorage', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('pt-BR'));

    await act(async () => {
      await result.current.setLanguage('en');
    });

    expect(changeLanguage).toHaveBeenCalledWith('en');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'en');
    expect(result.current.language).toBe('en');
  });

  it('increments languageVersion on each change', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('pt-BR'));

    const before = result.current.languageVersion;

    await act(async () => {
      await result.current.setLanguage('es');
    });

    expect(result.current.languageVersion).toBe(before + 1);
    expect(languageVersionState.version).toBe(result.current.languageVersion);
  });

  it('throws when language is not in supported list', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('pt-BR'));

    await expect(
      act(async () => {
        await result.current.setLanguage('fr');
      })
    ).rejects.toThrow('Idioma não suportado');
  });
});

// ─── useLanguage guard ────────────────────────────────────────────────────────

describe('useLanguage outside provider', () => {
  it('throws when used outside LanguageProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLanguage())).toThrow(
      'useLanguage must be used within a LanguageProvider'
    );
    spy.mockRestore();
  });
});
