import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import type { EmojiType } from 'rn-emoji-keyboard';
import { useAuth } from '../../contexts/AuthContext';
import { wsService } from '../../services/wsService';
import { useToast } from '../../contexts/ToastContext';
import { useStatus } from '../../hooks/useStatus';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';
import { EmojiPickerIOS } from '../EmojiKeyboardIOS/EmojiPickerIOS';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui';
import type { FriendStatus } from '../../services/statusApi';

interface Props {
  navigation: any;
}

const CIRCLE = 76;

function firstName(name: string | null | undefined): string {
  if (!name) return '';
  return name.split(' ')[0];
}

export const StatusStrip: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { own, friends, loading, reload, postStatus, removeStatus } =
    useStatus();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Recarrega ao ganhar foco (segurança para eventos perdidos em background)
  useEffect(() => {
    if (isFocused) reload();
  }, [isFocused, reload]);

  // Atualização em tempo real via WebSocket
  useEffect(() => {
    const unsub = wsService.on('status.updated', () => reload());
    return unsub;
  }, [reload]);
  const emojisByCategory = useFilteredEmojis('profile');

  const { height: screenHeight } = useWindowDimensions();
  const stripRef = useRef<View>(null);
  const [pickerHeight, setPickerHeight] = useState<number | undefined>(
    undefined
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [ownModalOpen, setOwnModalOpen] = useState(false);
  const [loadingOwn, setLoadingOwn] = useState(false);

  const openPicker = useCallback(() => {
    stripRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      setPickerHeight(screenHeight - pageY - _h);
      setPickerOpen(true);
    });
  }, [screenHeight]);

  const handleOwnPress = useCallback(() => {
    if (own) {
      setOwnModalOpen(true);
    } else {
      openPicker();
    }
  }, [own, openPicker]);

  const handleEmojiSelected = useCallback(
    async (emojiType: EmojiType) => {
      setPickerOpen(false);
      setLoadingOwn(true);
      try {
        await postStatus(emojiType.emoji);
      } catch {
        addToast('error', 'Erro ao publicar status');
      } finally {
        setLoadingOwn(false);
      }
    },
    [postStatus, addToast]
  );

  const handleRemoveStatus = useCallback(async () => {
    setOwnModalOpen(false);
    setLoadingOwn(true);
    try {
      await removeStatus();
    } catch {
      addToast('error', 'Erro ao remover status');
    } finally {
      setLoadingOwn(false);
    }
  }, [removeStatus, addToast]);

  const handleChangeStatus = useCallback(() => {
    setOwnModalOpen(false);
    setTimeout(() => openPicker(), 320);
  }, [openPicker]);

  const handleOpenChat = useCallback(
    (friend: FriendStatus) => {
      navigation.navigate('Chat', {
        contact: {
          id: String(friend.userId),
          nickname: friend.nickname ?? '',
          profileEmoji: friend.profileEmoji ?? '',
        },
      });
    },
    [navigation]
  );

  return (
    <>
      <View ref={stripRef} style={styles.strip}>
        {loading ? (
          <ActivityIndicator
            size='small'
            color={colors.primary700}
            style={styles.loader}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Próprio status */}
            <TouchableOpacity
              style={styles.item}
              onPress={handleOwnPress}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.circle,
                  own ? styles.circleOwn : styles.circleEmpty,
                ]}
              >
                {loadingOwn ? (
                  <ActivityIndicator size='small' color={colors.primary700} />
                ) : own ? (
                  <Text style={styles.emoji}>{own.emoji}</Text>
                ) : (
                  <MaterialCommunityIcons
                    name='plus'
                    size={24}
                    color={colors.neutral500}
                  />
                )}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {firstName(user?.nickname) || 'Você'}
              </Text>
            </TouchableOpacity>

            {/* Status dos amigos */}
            {friends.map(f => (
              <TouchableOpacity
                key={f.userId}
                style={styles.item}
                onPress={() => handleOpenChat(f)}
                activeOpacity={0.75}
              >
                <View style={styles.circle}>
                  <Text style={styles.emoji}>{f.statusEmoji}</Text>
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {firstName(f.nickname) || '—'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Modal: próprio status */}
      <Modal
        visible={ownModalOpen}
        transparent
        animationType='none'
        onRequestClose={() => setOwnModalOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setOwnModalOpen(false)}
        />
        <Card style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetEmoji}>{own?.emoji}</Text>
          <Text style={styles.sheetTitle}>Seu status</Text>
          <TouchableOpacity style={styles.btn} onPress={handleChangeStatus}>
            <Text style={styles.btnText}>Alterar status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={handleRemoveStatus}
          >
            <Text style={[styles.btnText, styles.btnTextDanger]}>
              Remover status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => setOwnModalOpen(false)}
          >
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Card>
      </Modal>

      {/* Seletor de emoji para publicar status */}
      <EmojiPickerIOS
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        emojisByCategory={emojisByCategory}
        sheetHeight={pickerHeight}
      />
    </>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    strip: {
      backgroundColor: colors.pageBackground,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      minHeight: 96,
      justifyContent: 'center',
    },
    loader: {
      alignSelf: 'center',
    },
    scrollContent: {
      paddingHorizontal: 12,
      gap: 12,
      alignItems: 'flex-start',
    },
    item: {
      alignItems: 'center',
      width: 72,
    },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.primary700,
    },
    circleOwn: {
      borderColor: '#9B59B6', // roxo deliberado só pra diferenciar "seu" status dos amigos
    },
    circleEmpty: {
      borderWidth: 2,
      borderColor: colors.hairline,
      backgroundColor: colors.pageBackground,
    },
    emoji: {
      fontSize: 46,
      lineHeight: 54,
    },
    label: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 5,
      textAlign: 'center',
      maxWidth: 72,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 36,
      alignItems: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.hairline,
      marginBottom: 20,
    },
    sheetEmoji: {
      fontSize: 60,
      lineHeight: 72,
      marginBottom: 6,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    btn: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary700,
      alignItems: 'center',
      marginBottom: 10,
    },
    btnDanger: {
      backgroundColor: '#FFF0F0',
    },
    btnText: {
      // Texto fixo sobre o botão primary700 — não é papel de página, não inverte.
      fontSize: 15,
      fontWeight: '600',
      color: colors.neutral0,
    },
    btnTextDanger: {
      color: colors.error,
    },
    btnCancel: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnCancelText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
