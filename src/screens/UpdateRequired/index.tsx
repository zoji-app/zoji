import React from 'react';
import { View, Text, Image, Linking, StyleSheet, Platform } from 'react-native';
import { AppButton } from '../../components/ui';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/radii';

interface Props {
  storeUrl: string;
}

/**
 * Tela bloqueante "Atualize o Zoji" (P3-5). Mostrada quando a versão instalada
 * é menor que min_version do GET /app/config. Sem navegação, sem "depois".
 */
export const UpdateRequired: React.FC<Props> = ({ storeUrl }) => {
  const open = () => {
    Linking.openURL(storeUrl).catch(() => {});
  };

  return (
    <View style={styles.container} testID='update-required'>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode='contain'
      />
      <Text style={styles.title}>Atualize o Zoji</Text>
      <Text style={styles.body}>
        Esta versão do app não é mais compatível. Atualize para a versão mais
        recente para continuar conversando com emojis.
      </Text>
      <AppButton
        mode='contained'
        onPress={open}
        buttonColor={colors.primary700}
        borderRadius={radii.lg}
        style={styles.button}
      >
        {Platform.OS === 'ios' ? 'Abrir a App Store' : 'Abrir a Play Store'}
      </AppButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: { width: 96, height: 96, marginBottom: 24 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral900,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral700,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: { alignSelf: 'stretch' },
});
