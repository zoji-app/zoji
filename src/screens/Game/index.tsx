import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { i18n } from '../../i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { AppButton, PressableButton } from '../../components/ui';
import { getStyles } from './styles';

type Props = { navigation: any };

export const Game: React.FC<Props> = ({ navigation }) => {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t('game.title')}</Text>
          <Text style={styles.headerSubtitle}>{i18n.t('game.subtitle')}</Text>
        </View>

        <View style={styles.hubContent}>
          <Text style={styles.hubEmoji}>🎮</Text>
          <AppButton
            mode='contained'
            onPress={() => navigation.navigate('GamePlay', { lang: language })}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.primaryButton}
          >
            {i18n.t('game.play')}
          </AppButton>
          <PressableButton
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('GameRanking')}
          >
            <Text style={styles.secondaryButtonText}>
              {i18n.t('game.results')}
            </Text>
          </PressableButton>
        </View>
      </View>
    </SafeAreaView>
  );
};
