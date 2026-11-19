import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  AppState,
} from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, List, Portal, Dialog, RadioButton } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { getStyles } from './styles';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { i18n } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { logger } from '../../utils/logger';
import { AppButton, ScreenHeader } from '../../components/ui';

type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
  IndividualChat: { contact: any };
  AddContact: undefined;
  DeviceContacts: undefined;
  BlockedContacts: undefined;
  ConnectedAgents: undefined;
  Settings: { refresh?: number };
  ContactRequests: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  Debug: undefined;
};

export const Settings: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, signOut, deleteAccount, updateProfile } = useAuth();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [requireConsent, setRequireConsent] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const languages = [
    { code: 'pt-BR', name: i18n.t('languages.portuguese'), flag: '🇧🇷' },
    { code: 'en', name: i18n.t('languages.english'), flag: '🇺🇸' },
    { code: 'es', name: i18n.t('languages.spanish'), flag: '🇪🇸' },
  ];

  const themeModes: { code: ThemeMode; icon: string }[] = [
    { code: 'system', icon: '📱' },
    { code: 'light', icon: '☀️' },
    { code: 'dark', icon: '🌙' },
    { code: 'zoji', icon: '🌊' },
  ];
  const THEME_LABEL_KEY: Record<ThemeMode, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    zoji: 'Zoji',
  };
  const themeModeLabel = (mode: ThemeMode) =>
    i18n.t(`settings.theme${THEME_LABEL_KEY[mode]}`);

  const checkNotificationPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }, []);

  // Verifica permissão ao montar e ao voltar ao foreground
  useEffect(() => {
    checkNotificationPermission();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkNotificationPermission();
    });
    return () => sub.remove();
  }, [checkNotificationPermission]);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
      } else {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    if (user) {
      setRequireConsent(user.require_consent ?? false);
    }
  }, [user]);

  const handleSignOut = () => {
    Alert.alert(i18n.t('settings.logout'), i18n.t('auth.logoutConfirmation'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            logger.error('Erro ao fazer logout:', error as Error);
            addToast(
              'error',
              i18n.t('auth.logoutError'),
              i18n.t('common.error')
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.t('settings.deleteAccount'),
      i18n.t('settings.deleteConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              addToast(
                'success',
                i18n.t('settings.accountDeleted'),
                i18n.t('common.success')
              );
            } catch (error) {
              logger.error('Erro ao deletar conta:', error as Error);
              addToast(
                'error',
                i18n.t('settings.deleteError'),
                i18n.t('common.error')
              );
            }
          },
        },
      ]
    );
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await setLanguage(languageCode);
      setIsLanguageModalVisible(false);
      addToast(
        'success',
        i18n.t('settings.languageChanged'),
        i18n.t('common.success')
      );
    } catch (error) {
      logger.error('Erro ao mudar idioma:', error as Error);
      addToast(
        'error',
        i18n.t('settings.languageChangeError'),
        i18n.t('common.error')
      );
    }
  };

  const handleToggleConsent = async (value: boolean) => {
    setRequireConsent(value);
    try {
      await updateProfile({ require_consent: value });
    } catch {
      setRequireConsent(!value);
      addToast('error', i18n.t('profile.saveError'), i18n.t('common.error'));
    }
  };

  const LanguageDialog = () => (
    <Portal>
      <Dialog
        visible={isLanguageModalVisible}
        onDismiss={() => setIsLanguageModalVisible(false)}
        style={styles.languageDialog}
      >
        <Dialog.Title style={styles.dialogTitle}>
          {i18n.t('settings.language')}
        </Dialog.Title>
        <Dialog.Content style={styles.dialogContent}>
          <RadioButton.Group
            onValueChange={handleLanguageSelect}
            value={language}
          >
            {languages.map(lang => (
              <RadioButton.Item
                key={lang.code}
                label={`${lang.flag}  ${lang.name}`}
                value={lang.code}
                labelStyle={styles.radioLabel}
                color={colors.primary700}
                style={styles.radioItem}
              />
            ))}
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton
            mode='text'
            onPress={() => setIsLanguageModalVisible(false)}
            textColor={colors.neutral700}
          >
            {i18n.t('common.cancel')}
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const ThemeDialog = () => (
    <Portal>
      <Dialog
        visible={isThemeModalVisible}
        onDismiss={() => setIsThemeModalVisible(false)}
        style={styles.languageDialog}
      >
        <Dialog.Title style={styles.dialogTitle}>
          {i18n.t('settings.appearance')}
        </Dialog.Title>
        <Dialog.Content style={styles.dialogContent}>
          <RadioButton.Group
            onValueChange={value =>
              setThemeMode(value as ThemeMode).then(() =>
                setIsThemeModalVisible(false)
              )
            }
            value={themeMode}
          >
            {themeModes.map(t => (
              <RadioButton.Item
                key={t.code}
                label={`${t.icon}  ${themeModeLabel(t.code)}`}
                value={t.code}
                labelStyle={styles.radioLabel}
                color={colors.primary700}
                style={styles.radioItem}
              />
            ))}
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton
            mode='text'
            onPress={() => setIsThemeModalVisible(false)}
            textColor={colors.neutral700}
          >
            {i18n.t('common.cancel')}
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title={i18n.t('settings.title')}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('MainApp')}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode='contain'
            />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.container}>
          <List.Section style={styles.actionSection}>
            <List.Subheader>{i18n.t('settings.account')}</List.Subheader>
            <List.Item
              title={i18n.t('settings.language')}
              description={i18n.t(
                `languages.${
                  language === 'pt-BR'
                    ? 'portuguese'
                    : language === 'en'
                      ? 'english'
                      : 'spanish'
                }`
              )}
              left={props => <List.Icon {...props} icon='translate' />}
              onPress={() => setIsLanguageModalVisible(true)}
            />
            <List.Item
              title={i18n.t('settings.appearance')}
              description={themeModeLabel(themeMode)}
              left={props => <List.Icon {...props} icon='theme-light-dark' />}
              onPress={() => setIsThemeModalVisible(true)}
            />
            <List.Item
              title={i18n.t('settings.blockedContacts')}
              left={props => <List.Icon {...props} icon='block-helper' />}
              onPress={() => navigation.navigate('BlockedContacts')}
            />
            <List.Item
              title={i18n.t('settings.connectedAgents')}
              left={props => <List.Icon {...props} icon='robot-outline' />}
              onPress={() => navigation.navigate('ConnectedAgents')}
            />
            <List.Item
              title={i18n.t('settings.notifications')}
              description={i18n.t('settings.notificationsDesc')}
              left={props => <List.Icon {...props} icon='bell-outline' />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ true: colors.primary700 }}
                />
              )}
            />
            <List.Item
              title={i18n.t('settings.requireConsent')}
              description={i18n.t('settings.requireConsentDesc')}
              left={props => (
                <List.Icon {...props} icon='shield-account-outline' />
              )}
              right={() => (
                <Switch
                  value={requireConsent}
                  onValueChange={handleToggleConsent}
                  trackColor={{ true: colors.primary700 }}
                />
              )}
            />
            <List.Item
              title={i18n.t('legal.termsOfUse')}
              left={props => (
                <List.Icon {...props} icon='file-document-outline' />
              )}
              onPress={() => navigation.navigate('TermsOfUse')}
            />
            <List.Item
              title={i18n.t('legal.privacyPolicy')}
              left={props => (
                <List.Icon {...props} icon='shield-lock-outline' />
              )}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            {__DEV__ && (
              <List.Item
                title={i18n.t('debug.title')}
                description='Ferramentas de desenvolvimento'
                left={props => (
                  <List.Icon {...props} icon='bug-outline' color='#FF9500' />
                )}
                titleStyle={{ color: '#FF9500' }}
                onPress={() => navigation.navigate('Debug')}
              />
            )}
            <List.Item
              title={i18n.t('auth.logout')}
              left={props => <List.Icon {...props} icon='logout' />}
              onPress={handleSignOut}
            />
            <List.Item
              title={i18n.t('settings.deleteAccount')}
              left={props => (
                <List.Icon
                  {...props}
                  icon='account-remove'
                  color={colors.error}
                />
              )}
              onPress={handleDeleteAccount}
              titleStyle={{ color: colors.error }}
            />
          </List.Section>

          <LanguageDialog />
          <ThemeDialog />

          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: colors.neutral500, fontSize: 12 }}>
              Zoji v
              {Constants.expoConfig?.version ??
                Constants.nativeAppVersion ??
                '—'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
