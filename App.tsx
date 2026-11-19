import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  NavigationContainer,
  LinkingOptions,
  getStateFromPath as defaultGetStateFromPath,
} from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { DebugPreviewBackButton } from './src/components/DebugPreviewBackButton';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
} from 'react-native-paper';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { wsService } from './src/services/wsService';
import { useWsEvents } from './src/hooks/useWsEvents';
import { Splash } from './src/screens/Splash';
import { useFonts, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import NavigationRoot from './src/routes';
import { useDiscoveryStore } from './src/stores/discoveryStore';
import { useOnboardingStore } from './src/stores/onboardingStore';
import { initializeLanguage } from './src/i18n';
import { RootStackParamList } from './src/types/navigation';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationListeners,
  registerBackgroundNotificationsAsync,
  registerPushToken,
} from './src/services/notifications';
import { LogBox, Platform, AppState, Linking } from 'react-native';
import {
  refreshiOSWidget,
  syncWidgetStatus,
  getWidgetPushToken,
} from './src/services/widgetService';
import { statusApi } from './src/services/statusApi';
import { authApi } from './src/services/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthLoadingOverlay } from './src/components/AuthLoadingOverlay';
import { TranslationProvider } from './src/contexts/TranslationContext';
import { ToastProvider } from './src/contexts/ToastContext';

// Importar o polyfill de crypto para garantir que uuid funcione
import './src/utils/cryptoPolyfill';
// P3-5: crash reporting (no-op sem DSN) — inicializa o quanto antes.
import { initSentry } from './src/utils/sentry';
import { useVersionGate } from './src/hooks/useVersionGate';
import { UpdateRequired } from './src/screens/UpdateRequired';

initSentry();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['zoji://', 'https://zoji.app'],
  config: {
    screens: {
      AddContact: { path: 'add-contact' },
    },
  },
  getStateFromPath(path, options) {
    const clean = path.startsWith('/') ? path.slice(1) : path;
    if (clean.startsWith('oauth/authorize')) {
      const query = clean.includes('?') ? clean.split('?')[1] : '';
      const params = new URLSearchParams(query);
      const clientId = params.get('client_id');
      const redirectUri = params.get('redirect_uri');
      const codeChallenge = params.get('code_challenge');
      const codeChallengeMethod = params.get('code_challenge_method');
      const scope = params.get('scope');
      if (
        clientId &&
        redirectUri &&
        codeChallenge &&
        codeChallengeMethod &&
        scope
      ) {
        return {
          routes: [
            { name: 'MainApp' },
            {
              name: 'AuthorizeAgent',
              params: {
                client_id: clientId,
                redirect_uri: redirectUri,
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod,
                scope,
                state: params.get('state') ?? undefined,
                pairing_token: params.get('pairing_token') ?? undefined,
              },
            },
          ],
        };
      }
    }
    if (clean.startsWith('open-chat')) {
      const query = clean.includes('?') ? clean.split('?')[1] : '';
      const params = new URLSearchParams(query);
      const userId = params.get('userId');
      const nickname = params.get('nickname');
      const profileEmoji = params.get('profileEmoji');
      if (userId && nickname && profileEmoji) {
        return {
          routes: [
            { name: 'MainApp' },
            {
              name: 'Chat',
              params: { contact: { id: userId, nickname, profileEmoji } },
            },
          ],
        };
      }
    }
    return defaultGetStateFromPath(path, options);
  },
};

// Tema do react-native-paper precisa reagir ao ThemeContext — sem isso, os
// componentes do Paper (List.Item, Dialog...) continuam com texto/fundo do
// tema claro fixo, mesmo com o resto da tela em dark mode (achado em teste
// manual: título/descrição de List.Item ilegíveis, texto escuro sobre fundo
// preto). Por isso fica dentro da árvore, não como const de módulo.
const ThemedPaperProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors: themeColors, resolvedTheme } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      // expo-navigation-bar removeu setBackgroundColorAsync/setButtonStyleAsync
      // no bump pro SDK 57 — Android edge-to-edge (15+) não deixa mais o app
      // controlar a cor de fundo da barra de navegação; só o estilo dos
      // ícones continua configurável, via setStyle (API nova). 'dark' = ícones
      // escuros (fundo claro), 'light' = ícones claros (fundo escuro).
      NavigationBar.setStyle(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  }, [resolvedTheme]);

  const paperTheme = useMemo(() => {
    // Base MD3 certa pro tema (não só um punhado de chaves MD2 antigas) — o
    // MD3DarkTheme já traz onSurface/onSurfaceVariant/outline etc. pensados
    // pra fundo escuro; sem isso, List.Item usa os tons claros originais do
    // MD3LightTheme mesmo com o resto do app escuro (achado em teste manual).
    const base = resolvedTheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: themeColors.primary,
        // Texto do Button mode="contained" some sem isso: o MD3DarkTheme tem
        // um onPrimary pensado pro primary roxo padrão do Paper, não pro
        // azul da marca — resultado era texto quase ilegível em cima do
        // botão azul (achado em teste manual no Login).
        onPrimary: '#FFFFFF',
        background: themeColors.pageBackground,
        surface: themeColors.cardBackground,
        onSurface: themeColors.textPrimary,
        onBackground: themeColors.textPrimary,
        onSurfaceVariant: themeColors.textSecondary,
      },
    };
  }, [themeColors, resolvedTheme]);
  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
};

LogBox.ignoreLogs([
  "ViewPropTypes will be removed from React Native. Migrate to ViewPropTypes exported from 'deprecated-react-native-prop-types'.",
  'NativeBase: The contrast ratio of',
  "[react-native-gesture-handler] Seems like you're using an old API with gesture components, check out new Gestures system!",
  "The 'navigation' prop is deprecated. Please use the navigation within the Parent component directly.",
]);

// Cria o canal de notificação Android o mais cedo possível — antes mesmo do login
// Necessário para Android 8+: notificações sem canal válido são descartadas silenciosamente
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Zoji',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    showBadge: true,
    enableLights: true,
    enableVibrate: true,
    sound: 'default',
  }).catch(() => {});
}

// Define como as notificações devem ser manipuladas quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WIDGET_PUSH_TOKEN_SENT_KEY = 'zoji_widget_push_token_sent';

// Lê o token de push dedicado do widget (iOS 26+) e manda pro backend só se
// mudou desde o último envio — evita PUT redundante a cada volta ao foreground.
async function syncWidgetPushToken(): Promise<void> {
  const token = await getWidgetPushToken();
  if (!token) return;
  const lastSent = await AsyncStorage.getItem(WIDGET_PUSH_TOKEN_SENT_KEY);
  if (token === lastSent) return;
  const updated = await authApi.updateProfile({ widget_push_token: token });
  if (updated) {
    await AsyncStorage.setItem(WIDGET_PUSH_TOKEN_SENT_KEY, token);
  }
}

// Componente de navegação que inclui o AuthLoadingOverlay
const AppNavigator = () => {
  const { loading: authLoading, user, hasProfile } = useAuth();
  const { done: onboardingDone } = useOnboardingStore();
  const { done: discoveryDone } = useDiscoveryStore();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const userRef = useRef(user);
  const hasProfileRef = useRef(hasProfile);
  const onboardingDoneRef = useRef(onboardingDone);
  const discoveryDoneRef = useRef(discoveryDone);
  // Armazena dados de notificação quando nav/user ainda não estão prontos
  const pendingNavDataRef = useRef<Record<string, any> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    hasProfileRef.current = hasProfile;
  }, [hasProfile]);

  useEffect(() => {
    onboardingDoneRef.current = onboardingDone;
  }, [onboardingDone]);

  useEffect(() => {
    discoveryDoneRef.current = discoveryDone;
  }, [discoveryDone]);

  // ── WebSocket: conecta quando autenticado, desconecta no logout ──────────
  useEffect(() => {
    if (user?.uid) {
      wsService.connect();
    } else {
      wsService.disconnect();
    }
  }, [user?.uid]);

  // Registra handlers globais para eventos WS → atualiza contatos / mensagens
  useWsEvents();

  // Zera badge ao app voltar ao foreground + sincroniza widget com dados frescos
  useEffect(() => {
    Notifications.setBadgeCountAsync(0);
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      Notifications.setBadgeCountAsync(0);
      if (Platform.OS === 'ios' && userRef.current?.uid) {
        // Busca dados no app (token já está em memória) e escreve no UserDefaults
        // antes de recarregar o widget — atualização instantânea sem rede extra no widget
        statusApi
          .getFriends()
          .then(data => syncWidgetStatus(data.own, data.friends))
          .catch(() => refreshiOSWidget()); // fallback: widget busca por conta própria
        syncWidgetPushToken().catch(() => {});
      } else {
        refreshiOSWidget();
      }
    });
    return () => sub.remove();
  }, []);

  // Registro do token push — re-executa quando o user loga/desloga
  useEffect(() => {
    if (!user?.uid) return;
    registerBackgroundNotificationsAsync().catch(() => {});
    registerPushToken(user.uid, 'app_initialization').catch(() => {});
    if (Platform.OS === 'ios') syncWidgetPushToken().catch(() => {});
  }, [user?.uid]);

  // Executa a navegação real. Retorna true se conseguiu, false se nav/user
  // não estão prontos (o chamador deve guardar o dado e tentar depois).
  const performNavigation = useCallback(
    (data: Record<string, any>): boolean => {
      const nav = navigationRef.current as any;
      if (
        !nav?.isReady() ||
        !userRef.current ||
        hasProfileRef.current === null ||
        onboardingDoneRef.current === null ||
        (hasProfileRef.current === true && discoveryDoneRef.current === null)
      )
        return false;

      if (data?.type === 'NEW_MESSAGE' && data.contactId) {
        nav.navigate('Chat', {
          contact: {
            id: String(data.contactId),
            nickname: data.contactName || 'Usuário',
            profileEmoji: data.profileEmoji || '😊',
          },
        });
        try {
          Notifications.clearLastNotificationResponseAsync?.();
        } catch {}
        return true;
      }
      if (data?.type === 'NEW_GROUP_MESSAGE' && data.groupId) {
        nav.navigate('GroupChat', {
          groupId: Number(data.groupId),
          groupName: data.groupName || 'Grupo',
          groupEmoji: data.groupEmoji || '👥',
        });
        try {
          Notifications.clearLastNotificationResponseAsync?.();
        } catch {}
        return true;
      }
      if (data?.type === 'SECURITY_NOTICE' && data.url) {
        Linking.openURL(data.url).catch(() => {});
        try {
          Notifications.clearLastNotificationResponseAsync?.();
        } catch {}
        return true;
      }
      return false;
    },
    []
  );

  // Tenta navegar; se não der, guarda o dado para tentar depois.
  const handleNotificationData = useCallback(
    (data: Record<string, any>) => {
      if (!performNavigation(data)) {
        pendingNavDataRef.current = data;
      }
    },
    [performNavigation]
  );

  // Esgota a fila pendente assim que nav e user estiverem prontos.
  const flushPendingNav = useCallback(() => {
    const data = pendingNavDataRef.current;
    if (!data) return;
    if (performNavigation(data)) {
      pendingNavDataRef.current = null;
    }
  }, [performNavigation]);

  // Cold start: lê o último response imediatamente; no iOS faz retentativas
  // porque didReceive(UNNotificationResponse) dispara após o AppDelegate retornar,
  // criando uma race condition com o carregamento do JS.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tryFetch = async (): Promise<boolean> => {
      if (cancelled) return false;
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data) {
          handleNotificationData(response.notification.request.content.data);
          return true;
        }
      } catch {}
      return false;
    };

    tryFetch().then(found => {
      if (found || cancelled || Platform.OS !== 'ios') return;
      const t1 = setTimeout(async () => {
        if (cancelled) return;
        const found2 = await tryFetch();
        if (found2 || cancelled) return;
        const t2 = setTimeout(() => {
          if (!cancelled) tryFetch();
        }, 1500);
        timers.push(t2);
      }, 500);
      timers.push(t1);
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Aguarda todas as condições de inicialização antes de tentar navegar —
  // enquanto NavigationRoot mostra <Loading>, Chat/GroupChat não estão no stack.
  useEffect(() => {
    if (
      !user?.uid ||
      hasProfile === null ||
      onboardingDone === null ||
      (hasProfile === true && discoveryDone === null)
    )
      return;
    const timer = setTimeout(flushPendingNav, 300);
    return () => clearTimeout(timer);
  }, [user?.uid, hasProfile, onboardingDone, discoveryDone, flushPendingNav]);

  // Esgota pendências quando o NavigationContainer sinaliza que está pronto.
  const onNavigationReady = useCallback(() => {
    flushPendingNav();
  }, [flushPendingNav]);

  // iOS: ao voltar do background via tap em notificação, o listener de resposta
  // pode não disparar de forma confiável. Este AppState listener busca ativamente
  // o último response e navega, como fallback independente do listener.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      setTimeout(async () => {
        try {
          const lastResponse =
            await Notifications.getLastNotificationResponseAsync();
          if (lastResponse?.notification?.request?.content?.data) {
            // Ignora respostas com mais de 30 segundos para evitar navegar
            // em notificações antigas quando o usuário abre o app manualmente.
            const ageSecs =
              Date.now() / 1000 - (lastResponse.notification.date ?? 0);
            if (ageSecs < 30) {
              handleNotificationData(
                lastResponse.notification.request.content.data
              );
            }
          }
        } catch {}
        flushPendingNav();
      }, 300);
    });
    return () => sub.remove();
  }, [flushPendingNav, handleNotificationData]);

  // Listeners de notificação — configurados uma única vez
  useEffect(() => {
    const unsubscribe = setupNotificationListeners(
      () => {
        // notificação recebida em primeiro plano — sem ação adicional por enquanto
      },
      response => {
        try {
          // expo-notifications tipou .data como possivelmente undefined no
          // bump pro SDK 57 (antes era sempre um objeto, mesmo que vazio).
          const data = response.notification.request.content.data ?? {};
          if (Platform.OS === 'ios') {
            // No iOS, a navegação pode não estar estável imediatamente ao retornar
            // do background. Aguarda um frame antes de tentar navegar;
            // se falhar, o AppState listener acima faz a segunda tentativa.
            setTimeout(() => handleNotificationData(data), 100);
          } else {
            handleNotificationData(data);
          }
        } catch {
          // navegação falhou — ignora silenciosamente
        }
      }
    );

    return () => unsubscribe();
  }, [handleNotificationData]);

  // Efeito para marcar a conclusão da carga inicial após um delay
  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(
        () => {
          setInitialLoadComplete(true);
        },
        Platform.OS === 'android' ? 1500 : 500
      );

      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={onNavigationReady}
        linking={linking}
      >
        <NavigationRoot />
      </NavigationContainer>

      <AuthLoadingOverlay
        loading={authLoading || !initialLoadComplete}
        onFinishLoading={() => setInitialLoadComplete(true)}
      />

      {__DEV__ && <DebugPreviewBackButton />}
    </>
  );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLanguageInitialized, setIsLanguageInitialized] = useState(false);
  const versionGate = useVersionGate();
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeLanguage();
        setIsLanguageInitialized(true);
      } catch {
        setIsLanguageInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!fontsLoaded || isLoading || !isLanguageInitialized) {
    return <Splash onFinish={() => setIsLoading(false)} />;
  }

  // P3-5: versão abaixo da mínima → tela bloqueante, nada mais carrega.
  if (versionGate.status === 'blocked') {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <UpdateRequired storeUrl={versionGate.storeUrl} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <ThemedPaperProvider>
              <LanguageProvider>
                <TranslationProvider>
                  <ToastProvider>
                    <AppNavigator />
                  </ToastProvider>
                </TranslationProvider>
              </LanguageProvider>
            </ThemedPaperProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
