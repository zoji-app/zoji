import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppBanner as AppBannerType } from '../../services/bannerApi';
import { colors } from '../../theme/colors';
import { i18n } from '../../i18n';
import { PressableButton } from '../ui';

interface Props {
  banner: AppBannerType | null;
  onDismiss: () => void;
}

const BG: Record<string, string> = {
  info: colors.primary700,
  warning: colors.warning,
  success: colors.success,
};

// Emoji de texto puro em vez de MaterialCommunityIcons: evita depender do
// carregamento da fonte de ícones vetoriais pra um elemento tão simples —
// achado real (16/09/2026): 'alert-outline' renderizava como um glifo de
// fallback errado em iOS, provavelmente cache/timing de carregamento da
// fonte, enquanto emoji de texto (ex: o 🔒 na mensagem) sempre renderiza
// certo por depender só da fonte do sistema.
const ICON: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
};

function getMessage(banner: AppBannerType): string {
  const lang = i18n.locale;
  return banner.messages[lang] ?? banner.messages['pt-BR'] ?? '';
}

function getCta(banner: AppBannerType): string | undefined {
  if (!banner.cta) return undefined;
  const lang = i18n.locale;
  return banner.cta[lang] ?? banner.cta['pt-BR'];
}

function handleCtaAction(banner: AppBannerType) {
  if (banner.cta_action === 'open_notifications_settings') {
    Linking.openSettings();
  } else if (banner.cta_action === 'open_url') {
    const url =
      Platform.OS === 'ios'
        ? (banner.cta_url_ios ?? banner.cta_url)
        : (banner.cta_url_android ?? banner.cta_url);
    if (url) Linking.openURL(url);
  } else if (banner.cta_action === 'share_invite') {
    Share.share({
      message:
        'Olá! Estou usando o Zoji para trocar mensagens em emojis. É muito divertido! Baixe agora: https://zoji.app',
    }).catch(() => {});
  }
}

export function AppBanner({ banner, onDismiss }: Props) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = banner !== null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: visible ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [visible]);

  if (!banner) return null;

  const bg = BG[banner.type] ?? colors.primary700;
  const icon = ICON[banner.type] ?? ICON.info;
  const message = getMessage(banner);
  const ctaLabel = getCta(banner);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          maxHeight: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 120],
          }),
          opacity: opacityAnim,
          backgroundColor: bg,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.typeIcon}>{icon}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        {banner.dismissible && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name='close'
              size={18}
              color={colors.neutral0}
            />
          </TouchableOpacity>
        )}
      </View>
      {ctaLabel && (
        <PressableButton
          style={styles.ctaButton}
          onPress={() => handleCtaAction(banner)}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </PressableButton>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: colors.neutral0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  ctaButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  ctaText: {
    color: colors.neutral0,
    fontSize: 12,
    fontWeight: '700',
  },
});
