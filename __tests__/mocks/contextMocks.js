import React from 'react';

// Mock do ThemeContext
export const ThemeContextMock = React.createContext({
  theme: {
    colors: {
      primary: '#6200ee',
      background: '#f5f5f5',
      surface: '#ffffff',
      accent: '#03dac6',
      error: '#b00020',
      text: '#000000',
      onSurface: '#000000',
      disabled: '#9e9e9e',
      placeholder: '#9e9e9e',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#f50057',
    },
    dark: false,
  },
  themeMode: 'light',
  toggleTheme: jest.fn(),
});

export const ThemeProviderMock = ({ children }) => {
  const [themeMode, setThemeMode] = React.useState('light');

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  const theme = {
    colors:
      themeMode === 'light'
        ? {
            primary: '#6200ee',
            background: '#f5f5f5',
            surface: '#ffffff',
            accent: '#03dac6',
            error: '#b00020',
            text: '#000000',
            onSurface: '#000000',
            disabled: '#9e9e9e',
            placeholder: '#9e9e9e',
            backdrop: 'rgba(0,0,0,0.5)',
            notification: '#f50057',
          }
        : {
            primary: '#bb86fc',
            background: '#121212',
            surface: '#121212',
            accent: '#03dac6',
            error: '#cf6679',
            text: '#ffffff',
            onSurface: '#ffffff',
            disabled: '#6e6e6e',
            placeholder: '#6e6e6e',
            backdrop: 'rgba(0,0,0,0.5)',
            notification: '#f50057',
          },
    dark: themeMode === 'dark',
  };

  return (
    <ThemeContextMock.Provider value={{ theme, themeMode, toggleTheme }}>
      <div
        testID='container'
        style={{ backgroundColor: theme.colors.background }}
      >
        <div testID='theme-mode'>{themeMode}</div>
        <button testID='toggle-button' onClick={toggleTheme}>
          Toggle Theme
        </button>
        {children}
      </div>
    </ThemeContextMock.Provider>
  );
};

// Mock do AuthContext
export const AuthContextMock = React.createContext({
  user: null,
  profile: null,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  deleteAccount: jest.fn(),
});

export const AuthProviderMock = ({
  children,
  initialUser = null,
  initialProfile = null,
}) => {
  const [user, setUser] = React.useState(initialUser);
  const [profile, setProfile] = React.useState(initialProfile);
  const [isLoading, setIsLoading] = React.useState(false);

  const login = jest.fn((phoneNumber, verificationId, verificationCode) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({ uid: 'test-user-id', phoneNumber });
      setIsLoading(false);
    }, 0);
    return Promise.resolve({ user: { uid: 'test-user-id', phoneNumber } });
  });

  const logout = jest.fn(() => {
    setIsLoading(true);
    setTimeout(() => {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }, 0);
    return Promise.resolve();
  });

  const updateProfile = jest.fn(profileData => {
    setIsLoading(true);
    setTimeout(() => {
      setProfile({ ...profile, ...profileData });
      setIsLoading(false);
    }, 0);
    return Promise.resolve();
  });

  const deleteAccount = jest.fn(() => {
    setIsLoading(true);
    setTimeout(() => {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }, 0);
    return Promise.resolve();
  });

  return (
    <AuthContextMock.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        logout,
        updateProfile,
        deleteAccount,
      }}
    >
      {user && (
        <div testID='user-info'>
          Usuário: {user.uid} - {profile ? 'Com perfil' : 'Sem perfil'}
        </div>
      )}
      <button testID='logout-button' onClick={logout}>
        Logout
      </button>
      {children}
    </AuthContextMock.Provider>
  );
};

// Mock do LanguageContext
export const LanguageContextMock = React.createContext({
  language: 'pt-BR',
  setLanguage: jest.fn(),
});

export const LanguageProviderMock = ({
  children,
  initialLanguage = 'pt-BR',
}) => {
  const [language, setLanguage] = React.useState(initialLanguage);

  return (
    <LanguageContextMock.Provider value={{ language, setLanguage }}>
      <div testID='language-container'>
        <div testID='current-language'>{language}</div>
        {children}
      </div>
    </LanguageContextMock.Provider>
  );
};
