import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { groupsApi } from '../../services/groupsApi';
import { loadContactsFromStorage } from '../../services/contacts';
import { AppButton, ScreenHeader } from '../../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGroupMembers'>;

export const AddGroupMembers: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, currentMemberIds } = route.params;
  const { user } = useAuth();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user?.uid || contactsLoaded) return;
    const stored = await loadContactsFromStorage(user.uid);
    const eligible = stored.filter(
      c =>
        ((c as any).relationshipStatus === 'accepted' ||
          !(c as any).relationshipStatus) &&
        !currentMemberIds.includes(Number((c as any).id))
    );
    setContacts(eligible);
    setContactsLoaded(true);
  }, [user?.uid, contactsLoaded, currentMemberIds]);

  React.useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = async () => {
    if (selected.size === 0) {
      addToast('error', i18n.t('groups.selectAtLeastOne'));
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        Array.from(selected).map(id => groupsApi.addMember(groupId, Number(id)))
      );
      addToast('success', i18n.t('groups.membersAdded'));
      navigation.goBack();
    } catch {
      addToast('error', i18n.t('groups.addMembersError'));
    } finally {
      setSaving(false);
    }
  };

  const renderContact = useCallback(
    ({ item }: { item: any }) => {
      const isSelected = selected.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.contactRow, isSelected && styles.contactRowSelected]}
          onPress={() => toggleSelect(item.id)}
        >
          <Text style={styles.contactEmoji}>{item.profileEmoji || '👤'}</Text>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.nickname}
          </Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [selected, toggleSelect, styles]
  );

  const selectedCount = selected.size;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={i18n.t('groups.addMembers')}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !contactsLoaded ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>
              {i18n.t('groups.allAlreadyMembers')}
            </Text>
          )
        }
      />

      <View style={styles.footer}>
        <AppButton
          mode='contained'
          onPress={handleAdd}
          loading={saving}
          disabled={selectedCount === 0 || saving}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
          style={styles.addButton}
        >
          {i18n.t('groups.addMembers')}
          {selectedCount > 0 ? ` (${selectedCount})` : ''}
        </AppButton>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.cardBackground },
    list: { paddingVertical: 8 },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    contactRowSelected: { backgroundColor: colors.primary700 + '15' },
    contactEmoji: { fontSize: 28, marginRight: 12 },
    contactName: { flex: 1, fontSize: 16, color: colors.textPrimary },
    checkmark: { fontSize: 18, color: colors.primary700, fontWeight: '700' },
    emptyText: {
      textAlign: 'center',
      marginTop: 40,
      color: colors.textSecondary,
      fontSize: 15,
      paddingHorizontal: 24,
    },
    footer: {
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    addButton: {},
  });
