import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { shareTokenApi } from '../../services/shareTokenApi';
import { useThemeColors } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { AppButton, Card } from '../ui';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const QRShareModal: React.FC<Props> = ({ visible, onClose }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setToken(null);
    try {
      const result = await shareTokenApi.generate();
      setToken(result.token);
    } catch {
      setError('Não foi possível gerar o QR Code. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) generate();
  }, [visible, generate]);

  const qrValue = token ? `https://zoji.app/add-contact?token=${token}` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType='none'
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <Card style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Compartilhar contato</Text>
        <Text style={styles.subtitle}>
          Peça para seu amigo escanear com a câmera do celular
        </Text>

        <Card style={styles.qrBox}>
          {loading ? (
            <ActivityIndicator size='large' color={colors.primary700} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name='wifi-outline'
                size={40}
                color={colors.neutral500}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <QRCode
              value={qrValue}
              size={220}
              color='#000'
              backgroundColor='#fff'
            />
          )}
        </Card>

        {error && (
          <AppButton
            mode='contained'
            onPress={generate}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.regenerateBtn}
          >
            Gerar novo código
          </AppButton>
        )}

        <AppButton
          mode='text'
          onPress={onClose}
          textColor={colors.textSecondary}
        >
          Fechar
        </AppButton>
      </Card>
    </Modal>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 40,
      alignItems: 'center',
    },
    handle: {
      // Alça decorativa — não é papel de fundo/texto de página, fica fixa.
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.neutral300,
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 18,
    },
    // A caixa do QR (e tudo dentro dela: spinner, erro, o próprio QRCode)
    // fica fixa em claro nos dois temas de propósito — o QR precisa de fundo
    // claro pra câmera conseguir ler, então inverter quebraria a leitura.
    qrBox: {
      width: 260,
      height: 260,
      borderRadius: 16,
      backgroundColor: colors.neutral0,
      borderWidth: 1,
      borderColor: colors.neutral300,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    errorBox: {
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      // Dentro do qrBox fixo em claro — não usa textSecondary.
      fontSize: 13,
      color: colors.neutral500,
      textAlign: 'center',
      maxWidth: 200,
      lineHeight: 18,
    },
    regenerateBtn: {
      marginBottom: 12,
    },
  });
