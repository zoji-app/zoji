import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Platform,
  KeyboardAvoidingView,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { Text } from 'react-native-paper';
import { AppButton, AppText, PaperFormField } from '../../components/ui';
import PhoneInput from 'react-native-phone-number-input';
import * as Localization from 'expo-localization';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { radii } from '../../theme/radii';
import { getStyles } from './styles';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { useLanguage } from '../../contexts/LanguageContext';
import { i18n } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { logger } from '../../utils/logger';
import { RetryBanner } from '../../components/RetryBanner';

/** Maps common language codes to most likely country when regionCode is absent */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  pt: 'BR',
  en: 'US',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  ar: 'SA',
  ru: 'RU',
  hi: 'IN',
  nl: 'NL',
  pl: 'PL',
  tr: 'TR',
  sv: 'SE',
  da: 'DK',
  fi: 'FI',
  nb: 'NO',
  cs: 'CZ',
  ro: 'RO',
  hu: 'HU',
  uk: 'UA',
  he: 'IL',
  id: 'ID',
  ms: 'MY',
  th: 'TH',
  vi: 'VN',
};

/** Detects country code from device locale, with multiple fallback layers */
function detectCountryCode(): string {
  try {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      // 1st: explicit regionCode (most reliable)
      if (locale.regionCode && locale.regionCode.length === 2) {
        return locale.regionCode.toUpperCase();
      }
      // 2nd: parse region from languageTag (e.g. "pt-BR" → "BR")
      const tag = locale.languageTag ?? '';
      const parts = tag.split('-');
      if (parts.length >= 2) {
        const region = parts[parts.length - 1];
        if (region.length === 2 && /^[A-Za-z]+$/.test(region)) {
          return region.toUpperCase();
        }
      }
      // 3rd: map language code to default country
      const lang = (locale.languageCode ?? parts[0] ?? '').toLowerCase();
      if (LANGUAGE_TO_COUNTRY[lang]) return LANGUAGE_TO_COUNTRY[lang];
    }
  } catch {}
  return 'BR';
}

/** Converts ISO 3166-1 alpha-2 code to flag emoji using Regional Indicator Letters */
function isoToFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

const RESEND_COOLDOWN = 60;

export const Login = () => {
  const { sendCode, signIn } = useAuth();
  const [formattedPhone, setFormattedPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const detectedCountry = useRef(detectCountryCode()).current;
  const [selectedCountry, setSelectedCountry] = useState(detectedCountry);
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const phoneInputRef = useRef<PhoneInput>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const phoneStyles = useMemo(() => getPhoneStyles(colors), [colors]);

  useEffect(() => {
    i18n.locale = language;
  }, [language]);

  const startResendTimer = (seconds = RESEND_COOLDOWN) => {
    setResendSeconds(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const TEST_PHONE_SUFFIX = '11900000001';

  const doSendCode = async (phone: string, preferSms = false) => {
    const result = await sendCode(phone, preferSms);
    if (result.success) {
      setCodeSent(true);
      setChannel(result.channel ?? 'sms');
      if (result.retryAfter) startResendTimer(result.retryAfter);
      else startResendTimer();
      setVerificationCode('');
    } else {
      addToast(
        'error',
        result.error ?? i18n.t('auth.sendCodeError'),
        i18n.t('common.error')
      );
    }
    return result.success;
  };

  const handleSendCode = async () => {
    const isValid = phoneInputRef.current?.isValidNumber(formattedPhone);
    const isTestPhone = formattedPhone
      .replace(/\D/g, '')
      .endsWith(TEST_PHONE_SUFFIX);
    if (!formattedPhone || (!isValid && !isTestPhone)) {
      addToast('error', i18n.t('auth.invalidPhoneNumber'));
      return;
    }

    setLoading(true);
    try {
      logger.debug('[Login] Enviando código para:', formattedPhone);
      await doSendCode(formattedPhone);
    } catch (err: any) {
      logger.error('[Login] Erro ao enviar código:', err);
      addToast('error', i18n.t('auth.sendCodeError'), i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (preferSms = false) => {
    setLoading(true);
    try {
      await doSendCode(formattedPhone, preferSms);
    } catch (err: any) {
      logger.error('[Login] Erro ao reenviar código:', err);
      addToast('error', i18n.t('auth.sendCodeError'), i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCodeSent(false);
    setVerificationCode('');
    setResendSeconds(0);
    setChannel(null);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      addToast('error', i18n.t('auth.invalidCode'), i18n.t('common.error'));
      return;
    }

    setLoading(true);
    try {
      logger.debug('[Login] Verificando código...');
      const { success, error } = await signIn(formattedPhone, verificationCode);
      if (!success) {
        addToast(
          'error',
          error ?? i18n.t('auth.incorrectCode'),
          i18n.t('common.error')
        );
      }
    } catch (err: any) {
      logger.error('[Login] Erro ao verificar código:', err);
      addToast('error', i18n.t('auth.verifyError'), i18n.t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold });
  if (!fontsLoaded) return null;

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      testID='keyboard-dismiss-area'
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        testID='keyboard-dismiss-area'
      >
        <RetryBanner />
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode='contain'
          />
          <AppText variant='loginTitle' style={styles.title}>
            Zoji
          </AppText>
          <AppText
            variant='loginSubtitle'
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {i18n.t('auth.enterPhoneNumber')}
          </AppText>
        </View>

        {!codeSent ? (
          <>
            <PhoneInput
              ref={phoneInputRef}
              defaultCode={detectedCountry as any}
              layout='first'
              onChangeFormattedText={setFormattedPhone}
              disabled={loading}
              disableArrowIcon
              onChangeCountry={c => setSelectedCountry(c.cca2 as string)}
              containerStyle={phoneStyles.container}
              textContainerStyle={phoneStyles.textContainer}
              textInputStyle={phoneStyles.textInput}
              codeTextStyle={phoneStyles.codeText}
              flagButtonStyle={phoneStyles.flagButton}
              countryPickerButtonStyle={phoneStyles.countryPickerButton}
              placeholder={i18n.t('auth.phoneNumberPlaceholder')}
              countryPickerProps={{
                renderFlagButton: () => (
                  <Text style={phoneStyles.flagEmoji}>
                    {isoToFlagEmoji(selectedCountry)}
                  </Text>
                ),
              }}
              textInputProps={{
                keyboardType: 'phone-pad',
                returnKeyType: 'done',
                onSubmitEditing: Keyboard.dismiss,
                testID: 'phone-input',
                // PhoneInput é biblioteca de terceiro — não herda tema do
                // Paper, o placeholder ficava sem contraste no escuro
                // (achado em teste manual; a correção no PaperFormField não
                // vale aqui, esse campo nem usa esse componente).
                placeholderTextColor: colors.textSecondary,
              }}
            />
            <Text style={styles.helper}>
              {i18n.t('auth.phoneNumberHelper')}
            </Text>
            <AppButton
              mode='contained'
              onPress={handleSendCode}
              loading={loading}
              style={styles.button}
              buttonColor={colors.primary700}
              borderRadius={radii.lg}
              disabled={loading}
              testID='send-code-button'
            >
              {i18n.t('auth.sendCode')}
            </AppButton>

            <View style={styles.languageContainer}>
              {(['pt-BR', 'en', 'es'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageButton,
                    language === lang && styles.selectedLanguage,
                  ]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      language === lang && styles.selectedLanguageText,
                    ]}
                  >
                    {i18n.t(
                      lang === 'pt-BR'
                        ? 'languages.portuguese'
                        : lang === 'en'
                          ? 'languages.english'
                          : 'languages.spanish'
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.legalContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('TermsOfUse')}
              >
                <Text style={styles.legalLink}>
                  {i18n.t('legal.termsOfUse')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}> · </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                <Text style={styles.legalLink}>
                  {i18n.t('legal.privacyPolicy')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Indicador de canal */}
            <View style={styles.channelBadge}>
              <Text
                style={
                  channel === 'whatsapp'
                    ? styles.channelBadgeWhatsapp
                    : styles.channelBadgeSms
                }
              >
                {channel === 'whatsapp'
                  ? i18n.t('auth.codeSentViaWhatsapp')
                  : i18n.t('auth.codeSentViaSms')}
              </Text>
            </View>

            <PaperFormField
              style={styles.input}
              label={i18n.t('auth.verificationCode')}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType='number-pad'
              disabled={loading}
              placeholder='000000'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit={true}
              maxLength={6}
              textContentType='oneTimeCode'
              autoComplete='sms-otp'
              testID='verification-input'
            />

            <Text style={styles.helper}>
              {channel === 'whatsapp'
                ? i18n.t('auth.whatsappCodeHelper')
                : i18n.t('auth.smsCodeHelper')}
            </Text>

            {/* Aviso de spam só para SMS */}
            {channel !== 'whatsapp' && (
              <Text style={styles.spamWarning}>
                {i18n.t('auth.spamWarning')}
              </Text>
            )}

            <AppButton
              mode='contained'
              onPress={handleVerifyCode}
              loading={loading}
              style={styles.button}
              buttonColor={colors.primary700}
              borderRadius={radii.lg}
              disabled={loading}
              testID='verify-code-button'
            >
              {i18n.t('auth.verifyCode')}
            </AppButton>

            <TouchableOpacity
              onPress={() => handleResendCode(true)}
              disabled={loading}
              style={styles.forceSmsButton}
            >
              <Text style={styles.forceSmsText}>{i18n.t('auth.forceSms')}</Text>
            </TouchableOpacity>

            {resendSeconds > 0 ? (
              <Text style={styles.resendTimer}>
                {i18n.t('auth.whatsappIn', { seconds: resendSeconds })}
              </Text>
            ) : (
              <AppButton
                mode='text'
                onPress={() => handleResendCode(false)}
                loading={loading}
                disabled={loading}
                style={styles.resendButton}
              >
                {i18n.t('auth.forceWhatsapp')}
              </AppButton>
            )}

            <TouchableOpacity
              onPress={handleBackToPhone}
              style={styles.backToPhoneButton}
            >
              <Text style={styles.backToPhoneText}>
                {i18n.t('auth.backToPhone')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const getPhoneStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      marginBottom: 10,
      height: 56,
    },
    textContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: radii.lg,
      paddingVertical: 0,
      paddingLeft: 4,
      paddingRight: 8,
    },
    textInput: {
      fontSize: 16,
      color: colors.textPrimary,
      height: 56,
      marginVertical: 0,
    },
    codeText: {
      fontSize: 16,
      color: colors.textPrimary,
      marginLeft: 4,
      marginRight: 4,
    },
    flagButton: {
      paddingLeft: 12,
      paddingRight: 0,
    },
    countryPickerButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    flagEmoji: {
      fontSize: 28,
      lineHeight: 34,
    },
  });
