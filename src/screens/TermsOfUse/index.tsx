import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui';
import { colors as staticColors } from '../../theme/colors';
import { useThemeColors } from '../../contexts/ThemeContext';
import { i18n } from '../../i18n';

const Section: React.FC<{ title: string; children: string }> = ({
  title,
  children,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
};

export const TermsOfUse: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={i18n.t('legal.termsOfUse')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>
          {i18n.t('legal.lastUpdated')}: 30/09/2026
        </Text>

        <Section title={i18n.t('legal.sections.acceptance')}>
          {i18n.t('legal.terms.acceptance')}
        </Section>

        <Section title={i18n.t('legal.sections.description')}>
          {i18n.t('legal.terms.description')}
        </Section>

        <Section title={i18n.t('legal.sections.onboardingBot')}>
          {i18n.t('legal.terms.onboardingBot')}
        </Section>

        <Section title={i18n.t('legal.sections.eligibility')}>
          {i18n.t('legal.terms.eligibility')}
        </Section>

        <Section title={i18n.t('legal.sections.account')}>
          {i18n.t('legal.terms.account')}
        </Section>

        <Section title={i18n.t('legal.sections.conduct')}>
          {i18n.t('legal.terms.conduct')}
        </Section>

        <Section title={i18n.t('legal.sections.content')}>
          {i18n.t('legal.terms.content')}
        </Section>

        <Section title={i18n.t('legal.sections.termination')}>
          {i18n.t('legal.terms.termination')}
        </Section>

        <Section title={i18n.t('legal.sections.liability')}>
          {i18n.t('legal.terms.liability')}
        </Section>

        <Section title={i18n.t('legal.sections.changes')}>
          {i18n.t('legal.terms.changes')}
        </Section>

        <Section title={i18n.t('legal.sections.contact')}>
          {i18n.t('legal.terms.contact')}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    updated: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    body: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 22,
    },
  });
