import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { i18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { hasSeenOnboarding } from '../services/onboardingService';
import { useOnboardingStore } from '../stores/onboardingStore';
import { hasCompletedDiscovery } from '../services/discoveryService';
import { useDiscoveryStore } from '../stores/discoveryStore';
import { RootStackParamList, RootTabParamList } from '../types/navigation';
import { useTheme, useThemeColors } from '../contexts/ThemeContext';
import logger from '../utils/logger';

import { Loading } from '../screens/Loading';
import { Login } from '../screens/Login';
import { Friends } from '../screens/Friends';
import { Profile } from '../screens/Profile';
import { Settings } from '../screens/Settings';
import { Chat } from '../screens/Chat';
import { ProfileSetup } from '../screens/ProfileSetup';
import { AddContact } from '../screens/AddContact';
import { DeviceContacts } from '../screens/DeviceContacts';
import { BlockedContacts } from '../screens/BlockedContacts';
import { ConnectedAgents } from '../screens/ConnectedAgents';
import { ManageAgentPermissions } from '../screens/ManageAgentPermissions';
import { AuthorizeAgent } from '../screens/AuthorizeAgent';
import { TermsOfUse } from '../screens/TermsOfUse';
import { PrivacyPolicy } from '../screens/PrivacyPolicy';
import { CreateGroup } from '../screens/CreateGroup';
import { GroupChat } from '../screens/GroupChat';
import { GroupDetails } from '../screens/GroupDetails';
import { AddGroupMembers } from '../screens/AddGroupMembers';
import { Onboarding } from '../screens/Onboarding';
import { DiscoverContacts } from '../screens/DiscoverContacts';
import { Debug } from '../screens/Debug';
import { Game } from '../screens/Game';
import { GamePlay } from '../screens/Game/GamePlay';
import { GameResult } from '../screens/Game/GameResult';
import { GameRanking } from '../screens/Game/GameRanking';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function MainAppTabs() {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [forceUpdate, setForceUpdate] = React.useState(0);

  React.useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [language]);

  const getFriendsOptions = React.useCallback(
    () => ({
      tabBarLabel: i18n.t('friends.title'),
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <MaterialCommunityIcons
          name='account-multiple'
          color={color}
          size={size}
        />
      ),
    }),
    [forceUpdate]
  );

  const getProfileOptions = React.useCallback(
    () => ({
      tabBarLabel: i18n.t('profile.title'),
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <MaterialCommunityIcons
          name='account-circle-outline'
          color={color}
          size={size}
        />
      ),
    }),
    [forceUpdate]
  );

  const getSettingsOptions = React.useCallback(
    () => ({
      tabBarLabel: i18n.t('settings.title'),
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <MaterialCommunityIcons name='cog' color={color} size={size} />
      ),
    }),
    [forceUpdate]
  );

  const getGameOptions = React.useCallback(
    () => ({
      tabBarLabel: i18n.t('game.title'),
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <MaterialCommunityIcons
          name='gamepad-variant'
          color={color}
          size={size}
        />
      ),
    }),
    [forceUpdate]
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.primary700,
        tabBarInactiveTintColor: colors.neutral500,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.hairline,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
      screenListeners={{
        state: e => {
          logger.debug('[TabNavigator] Estado alterado:', e.data);
        },
      }}
    >
      <Tab.Screen
        name='Friends'
        component={Friends}
        options={getFriendsOptions}
      />
      <Tab.Screen name='Game' component={Game} options={getGameOptions} />
      <Tab.Screen
        name='Profile'
        component={Profile}
        options={getProfileOptions}
      />
      <Tab.Screen
        name='Settings'
        component={Settings}
        options={getSettingsOptions}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { user, loading, hasProfile } = useAuth();
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { done: onboardingDone, setDone: setOnboardingDone } =
    useOnboardingStore();
  const { done: discoveryDone, setDone: setDiscoveryDone } =
    useDiscoveryStore();

  logger.debug('[Navigation] Estado atual:', {
    isLoading: loading,
    isAuthenticated: !!user,
    userId: user?.uid || 'não autenticado',
    hasProfile:
      hasProfile === null ? 'verificando...' : hasProfile ? 'sim' : 'não',
    language,
    timestamp: new Date().toISOString(),
  });

  // Verificação independente de auth — ocorre ao abrir o app
  useEffect(() => {
    hasSeenOnboarding().then(seen => setOnboardingDone(seen));
  }, []);

  // Discovery verificado apenas quando o usuário tem perfil completo
  useEffect(() => {
    if (hasProfile === true) {
      hasCompletedDiscovery().then(done => setDiscoveryDone(done));
    }
  }, [hasProfile]);

  // Aguarda verificação do onboarding antes de qualquer outra tela
  if (onboardingDone === null) {
    return <Loading />;
  }

  // Aguarda verificação do discovery quando o usuário tem perfil
  if (hasProfile === true && discoveryDone === null) {
    return <Loading />;
  }

  if (loading) {
    logger.debug('[Navigation] Exibindo tela de carregamento inicial');
    return <Loading />;
  }

  // Tratamento para quando o usuário está autenticado mas ainda não verificamos o perfil
  if (user && hasProfile === null) {
    logger.debug(
      '[Navigation] Usuário autenticado, mas ainda verificando existência de perfil'
    );
    return <Loading />;
  }

  // Log antes de renderizar o navegador
  const initialRoute = !user
    ? 'Login'
    : hasProfile === false
      ? 'ProfileSetup'
      : discoveryDone === false
        ? 'DiscoverContacts'
        : 'MainApp';
  logger.debug(
    `[Navigation] Renderizando Stack.Navigator com rota inicial: ${initialRoute}`
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // iOS lida com status bar via UIViewControllerBasedStatusBarAppearance
        // no Info.plist; no Android controlamos via react-native-screens,
        // acompanhando o tema (ícones escuros no claro, claros no escuro).
        ...(Platform.OS === 'android' && {
          statusBarStyle: resolvedTheme === 'dark' ? 'light' : 'dark',
        }),
      }}
    >
      {/* Onboarding antes da autenticação — exibido apenas no primeiro acesso */}
      {onboardingDone === false && (
        <Stack.Screen
          name='Onboarding'
          component={Onboarding}
          options={{ headerShown: false }}
        />
      )}

      {!user ? (
        <Stack.Screen
          name='Login'
          component={Login}
          listeners={{
            focus: () => logger.debug('[Navigation] Tela Login recebeu foco'),
          }}
        />
      ) : hasProfile === false ? (
        <Stack.Screen
          name='ProfileSetup'
          component={ProfileSetup}
          listeners={{
            focus: () =>
              logger.debug('[Navigation] Tela ProfileSetup recebeu foco'),
          }}
        />
      ) : discoveryDone === false ? (
        <Stack.Screen
          name='DiscoverContacts'
          component={DiscoverContacts}
          options={{ headerShown: false }}
          listeners={{
            focus: () =>
              logger.debug('[Navigation] Tela DiscoverContacts recebeu foco'),
          }}
        />
      ) : (
        <>
          <Stack.Screen
            name='MainApp'
            component={MainAppTabs}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela MainApp recebeu foco'),
            }}
          />
          <Stack.Screen
            name='Chat'
            component={Chat}
            listeners={{
              focus: () => logger.debug('[Navigation] Tela Chat recebeu foco'),
            }}
          />
          <Stack.Screen
            name='AddContact'
            component={AddContact}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela AddContact recebeu foco'),
            }}
          />
          <Stack.Screen
            name='DeviceContacts'
            component={DeviceContacts}
            options={{ headerShown: false }}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela DeviceContacts recebeu foco'),
            }}
          />
          <Stack.Screen
            name='BlockedContacts'
            component={BlockedContacts}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela BlockedContacts recebeu foco'),
            }}
          />
          <Stack.Screen
            name='ConnectedAgents'
            component={ConnectedAgents}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela ConnectedAgents recebeu foco'),
            }}
          />
          <Stack.Screen
            name='ManageAgentPermissions'
            component={ManageAgentPermissions}
            listeners={{
              focus: () =>
                logger.debug(
                  '[Navigation] Tela ManageAgentPermissions recebeu foco'
                ),
            }}
          />
          <Stack.Screen
            name='AuthorizeAgent'
            component={AuthorizeAgent}
            listeners={{
              focus: () =>
                logger.debug('[Navigation] Tela AuthorizeAgent recebeu foco'),
            }}
          />
          <Stack.Screen
            name='CreateGroup'
            component={CreateGroup}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='GroupChat'
            component={GroupChat}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='GroupDetails'
            component={GroupDetails}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='AddGroupMembers'
            component={AddGroupMembers}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='GamePlay'
            component={GamePlay}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='GameResult'
            component={GameResult}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name='GameRanking'
            component={GameRanking}
            options={{ headerShown: false }}
          />
          {__DEV__ && (
            <>
              <Stack.Screen
                name='Debug'
                component={Debug}
                options={{ headerShown: false }}
              />
              {/* Rotas de preview — mesmo componente das telas condicionais
                  abaixo, só que sempre presentes na pilha, pra dar pra
                  validar layout sem depender do estado real do app. */}
              <Stack.Screen name='DebugLoginPreview' component={Login} />
              {/* Esses 3 componentes têm seu próprio Props pinado ao nome de
                  rota real (ex: NativeStackScreenProps<RootStackParamList,
                  'ProfileSetup'>) — o cast é só pra registrar o mesmo
                  componente sob um nome de rota diferente, puramente pra
                  preview; nenhum deles lê route.params. */}
              <Stack.Screen
                name='DebugProfileSetupPreview'
                component={ProfileSetup as unknown as React.ComponentType<any>}
              />
              <Stack.Screen
                name='DebugDiscoverContactsPreview'
                component={
                  DiscoverContacts as unknown as React.ComponentType<any>
                }
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name='DebugOnboardingPreview'
                component={Onboarding as unknown as React.ComponentType<any>}
                options={{ headerShown: false }}
              />
            </>
          )}
        </>
      )}
      <Stack.Screen
        name='TermsOfUse'
        component={TermsOfUse}
        listeners={{
          focus: () =>
            logger.debug('[Navigation] Tela TermsOfUse recebeu foco'),
        }}
      />
      <Stack.Screen
        name='PrivacyPolicy'
        component={PrivacyPolicy}
        listeners={{
          focus: () =>
            logger.debug('[Navigation] Tela PrivacyPolicy recebeu foco'),
        }}
      />
    </Stack.Navigator>
  );
}

export default NavigationRoot;
