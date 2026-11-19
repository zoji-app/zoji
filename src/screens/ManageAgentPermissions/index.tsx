import React, { useCallback, useState, useMemo } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { oauthConnectionsApi } from '../../services/oauthConnectionsApi';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { logger } from '../../utils/logger';
import { RootStackParamList } from '../../types/navigation';
import { WRITE_SCOPES, scopeLabel } from '../../utils/mcpScopes';
import { AppButton, ScreenHeader } from '../../components/ui';

export const ManageAgentPermissions: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ManageAgentPermissions'>>();
  const { connectionId, clientName, currentScopes } = route.params;
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(currentScopes.map(s => [s, true]))
  );
  const [saving, setSaving] = useState(false);

  const selectedScopes = currentScopes.filter(s => enabled[s]);
  const hasChanges = selectedScopes.length !== currentScopes.length;
  const canSave = selectedScopes.length > 0 && hasChanges && !saving;

  const toggleScope = useCallback((scope: string) => {
    setEnabled(prev => ({ ...prev, [scope]: !prev[scope] }));
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedScopes.length === 0) {
      addToast(
        'error',
        i18n.t('manageAgentPermissions.atLeastOneRequired'),
        i18n.t('common.error')
      );
      return;
    }
    setSaving(true);
    try {
      await oauthConnectionsApi.updateScope(connectionId, selectedScopes);
      addToast(
        'success',
        i18n.t('manageAgentPermissions.saved'),
        i18n.t('common.success')
      );
      navigation.goBack();
    } catch (error) {
      logger.error(
        '[ManageAgentPermissions] Erro ao salvar escopo:',
        error as Error
      );
      addToast(
        'error',
        i18n.t('manageAgentPermissions.saveError'),
        i18n.t('common.error')
      );
    } finally {
      setSaving(false);
    }
  }, [connectionId, selectedScopes, addToast, navigation]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title={clientName} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.description}>
          {i18n.t('manageAgentPermissions.description')}
        </Text>

        <View style={styles.scopeList}>
          {currentScopes.map(scope => (
            <View key={scope} style={styles.scopeItem}>
              <View style={styles.scopeTextWrap}>
                <Text style={styles.scopeLabel}>{scopeLabel(scope)}</Text>
                {WRITE_SCOPES.has(scope) && (
                  <Text style={styles.scopeWriteTag}>
                    {i18n.t('manageAgentPermissions.writeTag')}
                  </Text>
                )}
              </View>
              <Switch
                value={enabled[scope]}
                onValueChange={() => toggleScope(scope)}
                trackColor={{ true: colors.primary700 }}
              />
            </View>
          ))}
        </View>

        <Text style={styles.propagationNote}>
          {i18n.t('manageAgentPermissions.propagationNote')}
        </Text>

        <AppButton
          mode='contained'
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={styles.saveButton}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
        >
          {i18n.t('manageAgentPermissions.save')}
        </AppButton>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    content: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      lineHeight: 18,
    },
    scopeList: {
      paddingHorizontal: 16,
      marginTop: 12,
    },
    scopeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      gap: 12,
    },
    scopeTextWrap: {
      flex: 1,
    },
    scopeLabel: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    scopeWriteTag: {
      fontSize: 12,
      color: colors.warning,
      marginTop: 2,
    },
    propagationNote: {
      fontSize: 12,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      marginTop: 16,
      lineHeight: 17,
    },
    saveButton: {
      marginHorizontal: 16,
      marginTop: 24,
    },
  });
