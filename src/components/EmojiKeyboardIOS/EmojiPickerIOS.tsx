import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EmojisByCategory, EmojiType } from 'rn-emoji-keyboard';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { EmojiKeyboardIOS } from './index';

interface Props {
  open: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: EmojiType) => void;
  emojisByCategory: EmojisByCategory[];
  emojiSize?: number;
  heightRatio?: number;
  sheetHeight?: number;
}

export const EmojiPickerIOS: React.FC<Props> = ({
  open,
  onClose,
  onEmojiSelected,
  emojisByCategory,
  emojiSize = 35,
  heightRatio = 0.62,
  sheetHeight: sheetHeightProp,
}) => {
  const { height } = useWindowDimensions();
  const sheetHeight = sheetHeightProp ?? Math.round(height * heightRatio);
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleEmojiSelected = useCallback(
    (emoji: EmojiType) => {
      onEmojiSelected(emoji);
    },
    [onEmojiSelected]
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType='none'
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay tap to dismiss */}
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Header: handle bar centrada + botão fechar à direita */}
        <View style={styles.header}>
          <View style={styles.handleBar} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name='close'
              size={20}
              color={colors.neutral500}
            />
          </TouchableOpacity>
        </View>

        <EmojiKeyboardIOS
          onEmojiSelected={handleEmojiSelected}
          emojisByCategory={emojisByCategory}
          emojiSize={emojiSize}
        />
      </View>
    </Modal>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
    },
    header: {
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.hairline,
    },
    closeButton: {
      position: 'absolute',
      right: 12,
      top: 8,
      padding: 4,
    },
  });
