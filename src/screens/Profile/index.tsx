import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, List } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { AppButton, PaperFormField, ScreenHeader } from '../../components/ui';
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';
import { radii } from '../../theme/radii';
import { i18n } from '../../i18n';
import { logger } from '../../utils/logger';
import { stripEmoji, hasEmoji } from '../../utils/nickname';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';

type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
};

const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
  if (!phoneNumber) return '';
  return phoneNumber.replace('+55', '');
};

export const Profile: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, updateProfile } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const filteredEmojis = useFilteredEmojis('profile');

  const [nickname, setNickname] = useState('');
  const [profileEmoji, setProfileEmoji] = useState('😊');
  const [originalNickname, setOriginalNickname] = useState('');
  const [originalEmoji, setOriginalEmoji] = useState('😊');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agendaName, setAgendaName] = useState<string | null>(null);

  const hasChanges =
    nickname !== originalNickname || profileEmoji !== originalEmoji;

  useEffect(() => {
    if (user) {
      const n = user.nickname ?? '';
      const e = user.profile_emoji ?? '😊';
      setNickname(n);
      setProfileEmoji(e);
      setOriginalNickname(n);
      setOriginalEmoji(e);
    }
  }, [user]);

  // Tenta encontrar o próprio número na agenda para exibir o nome salvo
  useEffect(() => {
    if (!user?.phoneNumber) return;
    (async () => {
      try {
        const { status } = await Contacts.getPermissionsAsync();
        if (status !== 'granted') return;

        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });

        const ownDigits = user.phoneNumber.replace(/\D/g, '');
        for (const contact of data) {
          for (const phone of contact.phoneNumbers ?? []) {
            const digits = (phone.number ?? '').replace(/\D/g, '');
            if (digits.endsWith(ownDigits.slice(-9))) {
              setAgendaName(contact.name ?? null);
              return;
            }
          }
        }
      } catch (err) {
        logger.error('[Profile] Erro ao buscar nome na agenda:', err as Error);
      }
    })();
  }, [user?.phoneNumber]);

  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      addToast(
        'error',
        i18n.t('profile.chooseNickname'),
        i18n.t('common.error')
      );
      return;
    }
    if (hasEmoji(nickname)) {
      addToast(
        'error',
        i18n.t('profile.noEmojiInNickname'),
        i18n.t('common.error')
      );
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ nickname, profile_emoji: profileEmoji });
      setOriginalNickname(nickname);
      setOriginalEmoji(profileEmoji);
      addToast(
        'success',
        i18n.t('profile.saveSuccess'),
        i18n.t('common.success')
      );
    } catch (error: any) {
      setNickname(originalNickname);
      setProfileEmoji(originalEmoji);
      logger.error('Erro ao atualizar perfil:', error as Error);
      const serverError = error?.response?.data?.error;
      const blockedEmoji = error?.response?.data?.emoji;
      if (serverError === 'blocked_emoji') {
        addToast(
          'error',
          i18n.t('chat.emojiBlocked', { emoji: blockedEmoji ?? '' }),
          i18n.t('common.error')
        );
      } else {
        addToast('error', i18n.t('profile.saveError'), i18n.t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title={i18n.t('profile.title')}
        right={
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode='contain'
          />
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.container}>
          <List.Section style={styles.section}>
            <View style={styles.profileContainer}>
              <TouchableOpacity
                onPress={() => setIsEmojiPickerVisible(true)}
                style={styles.avatarButton}
              >
                <Text style={styles.profileEmoji}>{profileEmoji}</Text>
              </TouchableOpacity>
              <Text style={styles.editHint}>
                {i18n.t('profile.tapToChange')}
              </Text>
            </View>

            <PaperFormField
              style={styles.input}
              label={i18n.t('profile.nickname')}
              value={nickname}
              onChangeText={text => setNickname(stripEmoji(text))}
              disabled={loading}
              backgroundColor={colors.cardBackground}
              underlineColor={colors.hairline}
              activeColor={colors.primary700}
            />

            <AppButton
              mode='contained'
              onPress={handleUpdateProfile}
              loading={loading}
              style={styles.button}
              buttonColor={colors.primary700}
              borderRadius={radii.lg}
              disabled={!hasChanges || loading}
            >
              {i18n.t('profile.saveProfile')}
            </AppButton>
          </List.Section>

          <List.Section style={styles.infoSection}>
            <List.Subheader>{i18n.t('profile.info')}</List.Subheader>
            <List.Item
              title={i18n.t('auth.phoneNumber')}
              description={formatPhoneNumber(user?.phoneNumber)}
              left={props => <List.Icon {...props} icon='phone' />}
            />
            {agendaName ? (
              <>
                <View style={styles.infoDivider} />
                <List.Item
                  title={i18n.t('profile.agendaName')}
                  description={agendaName}
                  left={props => <List.Icon {...props} icon='contacts' />}
                />
              </>
            ) : null}
          </List.Section>

          <EmojiPickerIOS
            open={isEmojiPickerVisible}
            onClose={() => setIsEmojiPickerVisible(false)}
            onEmojiSelected={emoji => {
              setProfileEmoji(emoji.emoji);
              setIsEmojiPickerVisible(false);
            }}
            emojisByCategory={filteredEmojis}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
