import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { AppButton, PlainInput, ScreenHeader } from '../../components/ui';
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
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

const DEFAULT_GROUP_EMOJI = '👥';
const STEP_INFO = 0;
const STEP_MEMBERS = 1;

export const CreateGroup: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const filteredEmojis = useFilteredEmojis('profile');

  const [step, setStep] = useState(STEP_INFO);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState(DEFAULT_GROUP_EMOJI);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Carrega contatos aceitos do storage
  const loadContacts = useCallback(async () => {
    if (!user?.uid || contactsLoaded) return;
    const stored = await loadContactsFromStorage(user.uid);
    const accepted = stored.filter(
      c =>
        (c as any).relationshipStatus === 'accepted' ||
        !(c as any).relationshipStatus
    );
    setContacts(accepted);
    setContactsLoaded(true);
  }, [user?.uid, contactsLoaded]);

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

  const handleNext = () => {
    if (!groupName.trim()) {
      addToast('error', i18n.t('groups.groupNameRequired'));
      return;
    }
    setStep(STEP_MEMBERS);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      addToast('error', i18n.t('groups.groupNameRequired'));
      return;
    }
    setLoading(true);
    try {
      const memberIds = Array.from(selected).map(Number);
      const group = await groupsApi.create({
        name: groupName.trim(),
        emoji: groupEmoji,
        member_ids: memberIds,
      });
      addToast('success', i18n.t('groups.groupCreated'));
      navigation.replace('GroupChat', {
        groupId: group.id,
        groupName: group.name,
        groupEmoji: group.emoji,
      });
    } catch {
      addToast('error', i18n.t('groups.groupCreateError'));
    } finally {
      setLoading(false);
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title={
            step === STEP_INFO
              ? i18n.t('groups.createGroupTitle')
              : i18n.t('groups.selectMembers')
          }
          onBack={() => {
            if (step === STEP_MEMBERS) setStep(STEP_INFO);
            else navigation.goBack();
          }}
        />

        {step === STEP_INFO ? (
          <View style={styles.infoContainer}>
            {/* Emoji do grupo */}
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => setEmojiPickerOpen(true)}
            >
              <Text style={styles.groupEmojiPreview}>{groupEmoji}</Text>
              <Text style={styles.emojiHint}>
                {i18n.t('groups.chooseEmoji')}
              </Text>
            </TouchableOpacity>

            {/* Nome do grupo */}
            <PlainInput
              style={styles.nameInput}
              placeholder={i18n.t('groups.groupNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              autoFocus
              returnKeyType='done'
              onSubmitEditing={handleNext}
            />

            <AppButton
              mode='contained'
              onPress={handleNext}
              disabled={!groupName.trim()}
              buttonColor={colors.primary700}
              borderRadius={radii.lg}
              style={styles.nextButton}
            >
              {i18n.t('common.next')}
            </AppButton>
          </View>
        ) : (
          <>
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
                    {i18n.t('friends.noContacts')}
                  </Text>
                )
              }
            />
            <View style={styles.footer}>
              <AppButton
                mode='contained'
                onPress={handleCreate}
                loading={loading}
                disabled={loading}
                buttonColor={colors.primary700}
                borderRadius={radii.lg}
                style={styles.nextButton}
              >
                {i18n.t('groups.create')}
                {selectedCount > 0 ? ` (${selectedCount})` : ''}
              </AppButton>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <EmojiPickerIOS
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelected={(emojiObj: any) => {
          setGroupEmoji(emojiObj.emoji);
          setEmojiPickerOpen(false);
        }}
        emojisByCategory={filteredEmojis}
      />
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.cardBackground },
    container: { flex: 1, backgroundColor: colors.pageBackground },
    list: { flexGrow: 1, paddingBottom: 8 },
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
    },
    footer: {
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    nextButton: {},
    infoContainer: {
      flex: 1,
      padding: 24,
      gap: 20,
    },
    emojiButton: { alignItems: 'center', paddingVertical: 8 },
    groupEmojiPreview: { fontSize: 64, marginBottom: 4 },
    emojiHint: { fontSize: 13, color: colors.primary700 },
    nameInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 18,
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: colors.hairline,
    },
    membersLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
