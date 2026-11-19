import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { PlainInput, PressableButton, ScreenHeader } from '../../components/ui';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { groupsApi } from '../../services/groupsApi';
import { Group, GroupMember } from '../../types/groups';
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetails'>;

export const GroupDetails: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const filteredEmojis = useFilteredEmojis('profile');

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = group?.role === 'admin';
  const myId = Number(user?.uid ?? 0);

  const load = useCallback(async () => {
    try {
      const g = await groupsApi.get(groupId);
      setGroup(g);
      setNameInput(g.name);
    } catch {
      addToast('error', i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [groupId])
  );

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      const updated = await groupsApi.update(groupId, {
        name: nameInput.trim(),
      });
      setGroup(updated);
      setEditingName(false);
      addToast('success', i18n.t('groups.groupUpdated'));
    } catch {
      addToast('error', i18n.t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmoji = async (emoji: string) => {
    setSaving(true);
    try {
      const updated = await groupsApi.update(groupId, { emoji });
      setGroup(updated);
      setEmojiPickerOpen(false);
      addToast('success', i18n.t('groups.groupUpdated'));
    } catch {
      addToast('error', i18n.t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteToAdmin = (member: GroupMember) => {
    Alert.alert(
      i18n.t('groups.makeAdmin'),
      i18n.t('groups.makeAdminConfirm', { name: member.nickname }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.makeAdmin'),
          onPress: async () => {
            try {
              await groupsApi.promoteToAdmin(groupId, member.user_id);
              setGroup(prev =>
                prev
                  ? {
                      ...prev,
                      members: (prev.members ?? []).map(m =>
                        m.user_id === member.user_id
                          ? { ...m, role: 'admin' }
                          : m
                      ),
                    }
                  : prev
              );
              addToast(
                'success',
                i18n.t('groups.makeAdminSuccess', { name: member.nickname })
              );
            } catch {
              addToast('error', i18n.t('groups.makeAdminError'));
            }
          },
        },
      ]
    );
  };

  const handleMuteMember = (member: GroupMember) => {
    Alert.alert(
      i18n.t('groups.muteMember'),
      i18n.t('groups.muteConfirm', { name: member.nickname }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.muteMember'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.muteMember(groupId, member.user_id);
              setGroup(prev =>
                prev
                  ? {
                      ...prev,
                      members: (prev.members ?? []).map(m =>
                        m.user_id === member.user_id
                          ? { ...m, is_muted: true }
                          : m
                      ),
                    }
                  : prev
              );
            } catch {
              addToast('error', i18n.t('groups.muteError'));
            }
          },
        },
      ]
    );
  };

  const handleUnmuteMember = (member: GroupMember) => {
    Alert.alert(
      i18n.t('groups.unmuteMember'),
      i18n.t('groups.unmuteConfirm', { name: member.nickname }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.unmuteMember'),
          onPress: async () => {
            try {
              await groupsApi.unmuteMember(groupId, member.user_id);
              setGroup(prev =>
                prev
                  ? {
                      ...prev,
                      members: (prev.members ?? []).map(m =>
                        m.user_id === member.user_id
                          ? { ...m, is_muted: false }
                          : m
                      ),
                    }
                  : prev
              );
            } catch {
              addToast('error', i18n.t('groups.unmuteError'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: GroupMember) => {
    Alert.alert(
      i18n.t('groups.removeMember'),
      i18n.t('groups.removeMemberConfirm', { name: member.nickname }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.removeMember'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.removeMember(groupId, member.user_id);
              setGroup(prev =>
                prev
                  ? {
                      ...prev,
                      members: (prev.members ?? []).filter(
                        m => m.user_id !== member.user_id
                      ),
                    }
                  : prev
              );
            } catch {
              addToast('error', i18n.t('common.error'));
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      i18n.t('groups.leaveGroup'),
      i18n.t('groups.leaveGroupConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.leaveGroup'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.leave(groupId);
              navigation.pop(2); // fecha GroupDetails e GroupChat
            } catch (err: any) {
              const msg = err?.response?.data?.error;
              if (msg === 'Transfira a administração antes de sair') {
                addToast('error', i18n.t('groups.leaveTransferAdmin'));
              } else {
                addToast('error', i18n.t('groups.leaveError'));
              }
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      i18n.t('groups.deleteGroup'),
      i18n.t('groups.deleteGroupConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.deleteGroup'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.delete(groupId);
              navigation.pop(2);
            } catch {
              addToast('error', i18n.t('common.error'));
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: GroupMember }) => {
    const isMe = item.user_id === myId;
    const canAct = isAdmin && !isMe && item.role !== 'admin';

    return (
      <View style={styles.memberRow}>
        <Text style={styles.memberEmoji}>{item.profile_emoji || '👤'}</Text>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.nickname}
            {isMe ? ` (${i18n.t('groups.you')})` : ''}
          </Text>
          <View style={styles.badgeRow}>
            {item.role === 'admin' && (
              <Text style={styles.adminBadge}>{i18n.t('groups.admin')}</Text>
            )}
            {item.is_muted && (
              <Text style={styles.mutedBadge}>
                {i18n.t('groups.mutedBadge')}
              </Text>
            )}
          </View>
        </View>
        {canAct && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.promoteBtn}
              onPress={() => handlePromoteToAdmin(item)}
            >
              <Text style={styles.promoteBtnText}>👑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.muteBtn}
              onPress={() =>
                item.is_muted
                  ? handleUnmuteMember(item)
                  : handleMuteMember(item)
              }
            >
              <Text style={styles.muteBtnText}>
                {item.is_muted ? '🔊' : '🔇'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveMember(item)}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!group) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={i18n.t('groups.details')}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={group.members ?? []}
        renderItem={renderMember}
        keyExtractor={item => String(item.user_id)}
        ListHeaderComponent={
          <View>
            {/* Emoji do grupo */}
            <View style={styles.groupInfoSection}>
              <TouchableOpacity
                style={styles.emojiButton}
                onPress={() => isAdmin && setEmojiPickerOpen(true)}
                disabled={!isAdmin}
              >
                <Text style={styles.groupEmojiLarge}>{group.emoji}</Text>
                {isAdmin && (
                  <Text style={styles.emojiEditHint}>
                    {i18n.t('groups.editGroupEmoji')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Nome do grupo */}
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <PlainInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    maxLength={100}
                  />
                  <TouchableOpacity onPress={handleSaveName} disabled={saving}>
                    <Text style={styles.saveBtn}>{i18n.t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => isAdmin && setEditingName(true)}
                  disabled={!isAdmin}
                  style={styles.nameRow}
                >
                  <Text style={styles.groupNameText}>{group.name}</Text>
                  {isAdmin && <Text style={styles.editHint}>✎</Text>}
                </TouchableOpacity>
              )}

              <Text style={styles.membersCount}>
                {i18n.t('groups.membersCount', {
                  count: (group.members ?? []).length,
                })}
              </Text>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                {i18n.t('groups.members')}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addMemberBtn}
                  onPress={() =>
                    navigation.navigate('AddGroupMembers', {
                      groupId,
                      currentMemberIds: (group.members ?? []).map(
                        m => m.user_id
                      ),
                    })
                  }
                >
                  <Text style={styles.addMemberBtnText}>
                    + {i18n.t('groups.addMembers')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.actionsSection}>
            <PressableButton style={styles.leaveButton} onPress={handleLeave}>
              <Text style={styles.leaveButtonText}>
                {i18n.t('groups.leaveGroup')}
              </Text>
            </PressableButton>
            {isAdmin && (
              <PressableButton
                style={styles.deleteButton}
                onPress={handleDeleteGroup}
              >
                <Text style={styles.deleteButtonText}>
                  {i18n.t('groups.deleteGroup')}
                </Text>
              </PressableButton>
            )}
          </View>
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <EmojiPickerIOS
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelected={(emojiObj: any) => handleSaveEmoji(emojiObj.emoji)}
        emojisByCategory={filteredEmojis}
      />
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.cardBackground },
    list: { paddingBottom: 32 },
    groupInfoSection: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    emojiButton: { alignItems: 'center', marginBottom: 12 },
    groupEmojiLarge: { fontSize: 72 },
    emojiEditHint: { fontSize: 12, color: colors.primary700, marginTop: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    groupNameText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    editHint: { fontSize: 16, color: colors.primary700, marginLeft: 8 },
    nameEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primary700,
      paddingBottom: 4,
    },
    nameInput: {
      flex: 1,
      fontSize: 20,
      color: colors.textPrimary,
      padding: 0,
    },
    saveBtn: {
      color: colors.primary700,
      fontWeight: '700',
      fontSize: 15,
      marginLeft: 12,
    },
    membersCount: { fontSize: 13, color: colors.neutral700, marginTop: 4 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 12,
      backgroundColor: colors.pageBackground,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '700',
      color: colors.neutral700,
      textTransform: 'uppercase',
      backgroundColor: colors.pageBackground,
    },
    addMemberBtn: { paddingVertical: 6, paddingHorizontal: 4 },
    addMemberBtnText: {
      fontSize: 13,
      color: colors.primary700,
      fontWeight: '600',
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
    },
    memberEmoji: { fontSize: 28, marginRight: 12 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, color: colors.textPrimary },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
    adminBadge: {
      fontSize: 12,
      color: colors.primary700,
      fontWeight: '600',
    },
    mutedBadge: {
      fontSize: 12,
      color: colors.neutral700,
      fontWeight: '600',
    },
    memberActions: { flexDirection: 'row', alignItems: 'center' },
    promoteBtn: { padding: 8 },
    promoteBtnText: { fontSize: 16 },
    muteBtn: { padding: 8 },
    muteBtnText: { fontSize: 16 },
    removeBtn: { padding: 8 },
    removeBtnText: { fontSize: 16, color: colors.error },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
      marginLeft: 56,
    },
    actionsSection: { padding: 20, gap: 12 },
    leaveButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    leaveButtonText: { color: colors.error, fontSize: 16, fontWeight: '600' },
    deleteButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.error,
    },
    deleteButtonText: {
      // Texto branco fixo sobre o botão vermelho (error) — não é papel de
      // página, não inverte.
      color: colors.neutral0,
      fontSize: 16,
      fontWeight: '600',
    },
  });
