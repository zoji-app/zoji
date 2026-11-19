import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { oauthAuthorizeApi } from '../../services/oauthAuthorizeApi';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { logger } from '../../utils/logger';
import { RootStackParamList } from '../../types/navigation';
import {
  WRITE_SCOPES,
  scopeLabel,
  scopeWriteNote,
} from '../../utils/mcpScopes';
import { AppButton } from '../../components/ui';

type Step = 'loading' | 'invalid' | 'consent' | 'approving' | 'success';

export const AuthorizeAgent: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AuthorizeAgent'>>();
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
    state,
    pairing_token: pairingToken,
  } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const scopes = scope.split(' ').filter(Boolean);
  const paramsValid = Boolean(
    clientId &&
    redirectUri &&
    codeChallenge &&
    codeChallengeMethod === 'S256' &&
    scopes.length > 0
  );

  const [step, setStep] = useState<Step>(paramsValid ? 'loading' : 'invalid');
  const [clientName, setClientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paramsValid) return;
    oauthAuthorizeApi
      .getClientInfo(clientId)
      .then(info => {
        if (!info.redirect_uris.includes(redirectUri)) {
          setStep('invalid');
          return;
        }
        setClientName(info.client_name);
        setStep('consent');
      })
      .catch(err => {
        logger.error(
          '[AuthorizeAgent] Erro ao buscar client info:',
          err as Error
        );
        setStep('invalid');
      });
  }, [paramsValid, clientId, redirectUri]);

  const handleApprove = useCallback(async () => {
    setError(null);
    setStep('approving');
    try {
      const { redirect_url } = await oauthAuthorizeApi.approve({
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        scope,
        state: state || undefined,
        pairing_token: pairingToken || undefined,
      });
      // Veio de um QR escaneado em outro device — quem precisa navegar pro
      // redirect_url é o navegador de origem (que está fazendo polling), não
      // este celular. redirect_uri costuma ser localhost quando o client MCP
      // é uma ferramenta de linha de comando, então abrir aqui não funcionaria.
      if (!pairingToken) {
        await Linking.openURL(redirect_url);
      }
      setStep('success');
    } catch (err) {
      logger.error('[AuthorizeAgent] Erro ao aprovar:', err as Error);
      setError(i18n.t('authorizeAgent.approveError'));
      setStep('consent');
    }
  }, [
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    state,
    pairingToken,
  ]);

  const handleDeny = useCallback(async () => {
    const separator = redirectUri.includes('?') ? '&' : '?';
    let url = `${redirectUri}${separator}error=access_denied`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      logger.error('[AuthorizeAgent] Erro ao negar:', err as Error);
    }
    navigation.goBack();
  }, [redirectUri, state, navigation]);

  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary700} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'invalid') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name='link-off' size={48} color='#ccc' />
          <Text style={styles.invalidTitle}>
            {i18n.t('authorizeAgent.invalidTitle')}
          </Text>
          <Text style={styles.invalidMessage}>
            {i18n.t('authorizeAgent.invalidMessage')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name='check-circle-outline'
            size={48}
            color={colors.success}
          />
          <Text style={styles.invalidTitle}>
            {i18n.t(
              pairingToken
                ? 'authorizeAgent.pairedTitle'
                : 'authorizeAgent.successTitle'
            )}
          </Text>
          <Text style={styles.invalidMessage}>
            {i18n.t(
              pairingToken
                ? 'authorizeAgent.pairedMessage'
                : 'authorizeAgent.successMessage'
            )}
          </Text>
          <AppButton
            mode='contained'
            onPress={() => navigation.goBack()}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.doneButton}
          >
            {i18n.t('authorizeAgent.done')}
          </AppButton>
        </View>
      </SafeAreaView>
    );
  }

  // consent | approving
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {i18n.t('authorizeAgent.title', {
            name: clientName ?? i18n.t('authorizeAgent.fallbackName'),
          })}
        </Text>
        <Text style={styles.subtitle}>{i18n.t('authorizeAgent.subtitle')}</Text>

        <View style={styles.scopeList}>
          {scopes.map(s => (
            <View key={s} style={styles.scopeItem}>
              <MaterialCommunityIcons
                name={
                  WRITE_SCOPES.has(s)
                    ? 'alert-circle-outline'
                    : 'check-circle-outline'
                }
                size={18}
                color={WRITE_SCOPES.has(s) ? colors.warning : colors.primary700}
                style={styles.scopeIcon}
              />
              <View style={styles.scopeTextWrap}>
                <Text style={styles.scopeLabel}>{scopeLabel(s)}</Text>
                {scopeWriteNote(s) && (
                  <Text style={styles.scopeWarning}>{scopeWriteNote(s)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <AppButton
          mode='contained'
          onPress={handleApprove}
          loading={step === 'approving'}
          disabled={step === 'approving'}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
          style={styles.allowButton}
        >
          {i18n.t('authorizeAgent.allow')}
        </AppButton>
        <AppButton
          mode='text'
          onPress={handleDeny}
          disabled={step === 'approving'}
          textColor={colors.neutral700}
          style={styles.denyButton}
        >
          {i18n.t('authorizeAgent.deny')}
        </AppButton>

        <Text style={styles.footnote}>{i18n.t('authorizeAgent.footnote')}</Text>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 32,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    scopeList: {
      gap: 14,
      marginBottom: 24,
    },
    scopeItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    scopeIcon: {
      marginTop: 1,
    },
    scopeTextWrap: {
      flex: 1,
    },
    scopeLabel: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    scopeWarning: {
      fontSize: 12,
      color: colors.warning,
      marginTop: 2,
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 8,
    },
    allowButton: {},
    denyButton: {},
    footnote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 17,
    },
    invalidTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    invalidMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    doneButton: {
      marginTop: 8,
    },
  });
