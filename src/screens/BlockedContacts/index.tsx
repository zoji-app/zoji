import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { contactsApi, BlockedUser } from '../../services/contactsApi';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { checkAndResendPendingMessagesForContact } from '../../services/pendingMessages';
import { PressableButton, ScreenHeader } from '../../components/ui';

export const BlockedContacts: React.FC = () => {
  const navigation = useNavigation();
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const loadBlocked = useCallback(async () => {
    try {
      setLoading(true);
      const list = await contactsApi.blocked();
      setBlocked(list);
    } catch (error) {
      logger.error('[BlockedContacts] Erro ao carregar:', error as Error);
      addToast('error', i18n.t('chat.blockError'), i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, [loadBlocked])
  );

  const handleUnblock = useCallback(
    (user: BlockedUser) => {
      Alert.alert(
        i18n.t('chat.unblockContact'),
        i18n.t('chat.unblockContactMessage', {
          name: `${user.profile_emoji} ${user.nickname}`,
        }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('chat.unblockContact'),
            onPress: async () => {
              try {
                await contactsApi.unblock(String(user.id));
                setBlocked(prev => prev.filter(u => u.id !== user.id));
                addToast(
                  'success',
                  i18n.t('chat.contactUnblocked'),
                  i18n.t('common.success')
                );
                if (currentUser?.uid) {
                  checkAndResendPendingMessagesForContact(
                    currentUser.uid,
                    String(user.id)
                  ).catch(() => {});
                }
              } catch (error) {
                logger.error(
                  '[BlockedContacts] Erro ao desbloquear:',
                  error as Error
                );
                addToast(
                  'error',
                  i18n.t('chat.unblockError'),
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

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.item}>
      <Text style={styles.emoji}>{item.profile_emoji}</Text>
      <Text style={styles.nickname}>{item.nickname}</Text>
      <PressableButton
        style={styles.unblockButton}
        onPress={() => handleUnblock(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.unblockText}>{i18n.t('chat.unblockContact')}</Text>
      </PressableButton>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title={i18n.t('settings.blockedContacts')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={colors.primary700} />
          </View>
        ) : (
          <FlatList
            data={blocked}
            renderItem={renderItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={
              blocked.length === 0 ? styles.emptyContent : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialCommunityIcons
                  name='block-helper'
                  size={48}
                  color='#ccc'
                />
                <Text style={styles.emptyText}>
                  {i18n.t('chat.noBlockedContacts')}
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
    emoji: {
      fontSize: 28,
      marginRight: 12,
    },
    nickname: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    unblockButton: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary700,
    },
    unblockText: {
      fontSize: 13,
      color: colors.primary700,
      fontWeight: '600',
    },
  });
