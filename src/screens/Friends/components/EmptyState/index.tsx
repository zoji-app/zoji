import React, { useMemo } from 'react';
import { View, ActivityIndicator, Share } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../../components/ui';
import { getStyles } from './styles';
import { i18n } from '../../../../i18n';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { radii } from '../../../../theme/radii';

interface EmptyStateProps {
  loading: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ loading }) => {
  useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size='large' color={colors.primary700} />
        <Text style={styles.emptyText}>
          {i18n.t('friends.loadingContacts')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name='chatbubbles-outline'
        size={56}
        color={colors.primary700}
        style={styles.icon}
      />
      <Text style={styles.title}>{i18n.t('friends.noContactsFound')}</Text>
      <Text style={styles.subtitle}>{i18n.t('friends.addContactPrompt')}</Text>
      <AppButton
        mode='contained'
        icon='share-variant-outline'
        buttonColor={colors.primary700}
        borderRadius={radii.lg}
        style={styles.inviteButton}
        onPress={() =>
          Share.share({
            message: i18n.t('deviceContacts.inviteMessage') ?? '',
          }).catch(() => {})
        }
      >
        {i18n.t('settings.inviteFriends')}
      </AppButton>
    </View>
  );
};

export default EmptyState;
