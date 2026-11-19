import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import {
  useFocusEffect,
  useNavigation,
  NavigationProp,
} from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  oauthConnectionsApi,
  OAuthConnection,
} from '../../services/oauthConnectionsApi';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { WRITE_SCOPES, scopeLabel } from '../../utils/mcpScopes';
import { RootStackParamList } from '../../types/navigation';
import { PressableButton, ScreenHeader } from '../../components/ui';

export const ConnectedAgents: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<OAuthConnection[]>([]);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      const list = await oauthConnectionsApi.list();
      setConnections(list);
    } catch (error) {
      logger.error('[ConnectedAgents] Erro ao carregar:', error as Error);
      addToast(
        'error',
        i18n.t('connectedAgents.loadError'),
        i18n.t('common.error')
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [loadConnections])
  );

  const handleDisconnect = useCallback(
    (connection: OAuthConnection) => {
      Alert.alert(
        i18n.t('connectedAgents.disconnectTitle'),
        i18n.t('connectedAgents.disconnectMessage', {
          name: connection.client_name,
        }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('connectedAgents.disconnect'),
            style: 'destructive',
            onPress: async () => {
              try {
                await oauthConnectionsApi.revoke(connection.id);
                setConnections(prev =>
                  prev.filter(c => c.id !== connection.id)
                );
                addToast(
                  'success',
                  i18n.t('connectedAgents.disconnected'),
                  i18n.t('common.success')
                );
              } catch (error) {
                logger.error(
                  '[ConnectedAgents] Erro ao desconectar:',
                  error as Error
                );
                addToast(
                  'error',
                  i18n.t('connectedAgents.disconnectError'),
                  i18n.t('common.error')
                );
              }
            },
          },
        ]
      );
    },
    [addToast]
  );

  const renderItem = ({ item }: { item: OAuthConnection }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('ManageAgentPermissions', {
          connectionId: item.id,
          clientName: item.client_name,
          currentScopes: item.scope,
        })
      }
    >
      <View style={styles.itemInfo}>
        <Text style={styles.clientName}>{item.client_name}</Text>
        <Text style={styles.scopes}>
          {item.scope.map((scope, index) => (
            <Text
              key={scope}
              style={WRITE_SCOPES.has(scope) ? styles.sendScope : undefined}
            >
              {index > 0 ? ' · ' : ''}
              {scopeLabel(scope)}
            </Text>
          ))}
        </Text>
        <Text style={styles.since}>
          {i18n.t('connectedAgents.connectedSince', {
            date: new Date(item.created_at).toLocaleDateString(),
          })}
        </Text>
      </View>
      <MaterialCommunityIcons
        name='chevron-right'
        size={22}
        color={colors.textSecondary}
        style={styles.chevron}
      />
      <PressableButton
        style={styles.disconnectButton}
        onPress={() => handleDisconnect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.disconnectText}>
          {i18n.t('connectedAgents.disconnect')}
        </Text>
      </PressableButton>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title={i18n.t('connectedAgents.title')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <Text style={styles.description}>
          {i18n.t('connectedAgents.description')}
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={colors.primary700} />
          </View>
        ) : (
          <FlatList
            data={connections}
            renderItem={renderItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={
              connections.length === 0
                ? styles.emptyContent
                : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialCommunityIcons
                  name='robot-outline'
                  size={48}
                  color='#ccc'
                />
                <Text style={styles.emptyText}>
                  {i18n.t('connectedAgents.empty')}
                </Text>
              </View>
            }
          />
        )}
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 15,
      textAlign: 'center',
    },
    listContent: {
      paddingVertical: 8,
    },
    emptyContent: {
      flex: 1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    itemInfo: {
      flex: 1,
      marginRight: 12,
    },
    chevron: {
      marginRight: 8,
    },
    clientName: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    scopes: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sendScope: {
      color: colors.warning,
      fontWeight: '600',
    },
    since: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    disconnectButton: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.error,
    },
    disconnectText: {
      fontSize: 13,
      color: colors.error,
      fontWeight: '600',
    },
  });
