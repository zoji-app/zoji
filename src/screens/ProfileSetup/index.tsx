import React, { useState, useMemo } from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import {
  AppButton,
  EmojiAvatar,
  PaperFormField,
  PressableButton,
  ScreenHeader,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { radii } from '../../theme/radii';
import { getStyles } from './styles';
import { useThemeColors } from '../../contexts/ThemeContext';
import { i18n } from '../../i18n';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useToast } from '../../contexts/ToastContext';
import { logger } from '../../utils/logger';
import { stripEmoji, hasEmoji } from '../../utils/nickname';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export const ProfileSetup: React.FC<Props> = () => {
  const { updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [profileEmoji, setProfileEmoji] = useState('😊');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const filteredEmojis = useFilteredEmojis('profile');
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleSaveProfile = async () => {
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
      logger.debug('[ProfileSetup] Salvando perfil...');

      await updateProfile({
        nickname: nickname.trim(),
        profile_emoji: profileEmoji,
        profile_complete: true,
      });

      logger.debug(
        '[ProfileSetup] Perfil salvo. AuthContext vai redirecionar automaticamente.'
      );
      // Navegação acontece automaticamente: AuthContext atualiza user.profile_complete = true
      // → routes/index.tsx detecta hasProfile === true → renderiza MainApp
    } catch (error) {
      logger.error('[ProfileSetup] Erro ao salvar perfil:', error as Error);
      addToast('error', i18n.t('profile.saveError'), i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
      testID='profile-setup-screen'
    >
      <ScreenHeader
        title={i18n.t('profile.setup')}
        right={
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode='contain'
          />
        }
      />

      <View style={styles.content}>
        <PaperFormField
          style={styles.input}
          label={i18n.t('profile.nickname')}
          value={nickname}
          onChangeText={text => setNickname(stripEmoji(text))}
          disabled={loading}
          testID='nickname-input'
          backgroundColor={colors.cardBackground}
          underlineColor={colors.hairline}
          activeColor={colors.primary700}
        />

        <View style={styles.emojiContainer}>
          <Text style={styles.emojiLabel}>
            {i18n.t('profile.profileEmoji')}
          </Text>
          <PressableButton
            onPress={() => setIsEmojiPickerVisible(true)}
            style={styles.emojiButton}
            accessibilityLabel={i18n.t('profile.profileEmoji')}
            accessibilityRole='button'
            testID='emoji-button'
          >
            <EmojiAvatar
              emoji={profileEmoji}
              fontSize={48}
              textStyle={styles.emojiText}
            />
          </PressableButton>
        </View>

        <AppButton
          mode='contained'
          onPress={handleSaveProfile}
          loading={loading}
          style={styles.button}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
          testID='save-profile-button'
        >
          {i18n.t('profile.saveProfile')}
        </AppButton>
      </View>

      <EmojiPickerIOS
        open={isEmojiPickerVisible}
        onClose={() => setIsEmojiPickerVisible(false)}
        onEmojiSelected={emoji => {
          setProfileEmoji(emoji.emoji);
          setIsEmojiPickerVisible(false);
        }}
        emojisByCategory={filteredEmojis}
      />
    </SafeAreaView>
  );
};
