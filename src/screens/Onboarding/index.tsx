import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { markOnboardingDone } from '../../services/onboardingService';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuth } from '../../contexts/AuthContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { AppButton } from '../../components/ui';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

interface Slide {
  key: string;
  emoji: string;
  title: string;
  desc: string;
}

const getSlides = (): Slide[] => [
  {
    key: '1',
    emoji: i18n.t('onboarding.slide1Emoji'),
    title: i18n.t('onboarding.slide1Title'),
    desc: i18n.t('onboarding.slide1Desc'),
  },
  {
    key: '2',
    emoji: i18n.t('onboarding.slide2Emoji'),
    title: i18n.t('onboarding.slide2Title'),
    desc: i18n.t('onboarding.slide2Desc'),
  },
  {
    key: '3',
    emoji: i18n.t('onboarding.slide3Emoji'),
    title: i18n.t('onboarding.slide3Title'),
    desc: i18n.t('onboarding.slide3Desc'),
  },
  {
    key: '4',
    emoji: i18n.t('onboarding.slide4Emoji'),
    title: i18n.t('onboarding.slide4Title'),
    desc: i18n.t('onboarding.slide4Desc'),
  },
  {
    key: '5',
    emoji: i18n.t('onboarding.slide5Emoji'),
    title: i18n.t('onboarding.slide5Title'),
    desc: i18n.t('onboarding.slide5Desc'),
  },
];

export const Onboarding: React.FC<Props> = ({ navigation }) => {
  const slides = getSlides();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = currentIndex === slides.length - 1;
  const { user } = useAuth();
  const { setDone } = useOnboardingStore();
  const { colors, resolvedTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const finish = useCallback(async () => {
    await markOnboardingDone();
    setDone(true);
    if (navigation.canGoBack()) {
      // Acessado via Debug (usuário já logado) — volta para onde veio
      navigation.goBack();
    } else if (user) {
      // Primeiro acesso com sessão ativa (borda rara em dev)
      navigation.replace('MainApp');
    } else {
      // Caso normal: primeiro acesso sem conta — vai para o Login
      navigation.replace('Login');
    }
  }, [navigation, user, setDone]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    const next = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  }, [currentIndex, isLast, finish]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <Text style={styles.slideEmoji}>{item.emoji}</Text>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.desc}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.pageBackground}
      />

      {/* Skip */}
      <View style={styles.topBar}>
        {!isLast ? (
          <AppButton mode='text' onPress={finish}>
            {i18n.t('onboarding.skip')}
          </AppButton>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEnabled
        style={styles.flatList}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <AppButton
          mode='contained'
          onPress={goNext}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
          style={styles.nextButton}
        >
          {isLast ? i18n.t('onboarding.start') : i18n.t('onboarding.next')}
        </AppButton>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    topBar: {
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingTop: 8,
      height: 44,
    },
    flatList: {
      flex: 1,
    },
    slide: {
      width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 20,
    },
    slideEmoji: {
      fontSize: 96,
      textAlign: 'center',
    },
    slideTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    slideDesc: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.hairline,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.primary700,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    nextButton: {},
  });
