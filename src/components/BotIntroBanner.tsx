import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors } from '../theme/colors';
import { i18n } from '../i18n';

/**
 * Aviso fixo "isso é um bot", só na conversa com a conta de onboarding (ver
 * OnboardingBotService no backend). Não pode ser fechado — precisa continuar
 * visível sempre que o usuário estiver conversando com o bot.
 */
export function BotIntroBanner() {
  return (
    <View style={styles.banner} testID='bot-intro-banner'>
      <AppText style={styles.text} numberOfLines={2}>
        {i18n.t('chat.botBannerText')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    // primary700, não primary500/primary — o token 500 é anotado como "não
    // usar com texto em cima (falha AA)" em theme/colors.ts.
    backgroundColor: colors.primary700,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
