import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

const KEYBOARD_HEIGHT = 420;

// getStyles(colors) — recebe a paleta resolvida pelo ThemeContext (clara ou
// escura) e monta o StyleSheet na hora. Só as cores de papel semântico
// (pageBackground/cardBackground/textPrimary/textSecondary/hairline) mudam
// entre os temas — o resto (messageIn/messageOut, neutral700...) é fixo nos
// dois, de propósito. floatingDateText usa colors.neutral0 de propósito
// literal (texto branco fixo sobre o selo preto semi-transparente da pílula
// de data) — não deve inverter com o tema.
export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    // Cobre topo E rodapé (sem `edges` restrito) — cardBackground porque
    // tanto o cabeçalho quanto a barra do composer usam essa cor; assim as
    // faixas de notch/status bar e home indicator ficam coladas nelas,
    // igual já vale pro resto do app.
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    messagesWrapper: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    messagesList: {
      padding: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingBottom: 10,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      paddingRight: 8,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      marginLeft: 8,
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: 'Fredoka_600SemiBold',
      fontSize: 32,
      color: colors.textPrimary,
      lineHeight: 36,
    },
    headerDeviceName: {
      fontSize: 12,
      color: colors.neutral700,
      marginTop: -2,
    },
    headerEmojiWrapper: {
      position: 'relative',
      width: 34,
      height: 34,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerEmoji: {
      fontSize: 24,
    },
    typingBadge: {
      position: 'absolute',
      top: -4,
      right: -8,
      fontSize: 13,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 8,
    },
    myMessage: {
      flexDirection: 'row-reverse',
      alignSelf: 'flex-end',
    },
    otherMessage: {
      alignSelf: 'flex-start',
    },
    messageWrapper: {
      maxWidth: '70%',
      flexDirection: 'column',
    },
    messageContent: {
      padding: 12,
      borderRadius: 20,
    },
    myMessageContent: {
      backgroundColor: colors.messageOut,
      borderBottomRightRadius: 4,
      marginRight: 8,
    },
    pendingMessageContent: {
      backgroundColor: colors.neutral100,
      borderBottomRightRadius: 4,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.neutral300,
    },
    otherMessageContent: {
      backgroundColor: colors.messageIn,
      borderBottomLeftRadius: 4,
      marginLeft: 8,
    },
    senderContainer: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    senderEmoji: {
      fontSize: 24,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: 4,
    },
    emojiWrapper: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    emoji: {
      fontSize: 32,
      textAlign: 'center',
    },
    timeText: {
      fontSize: 11,
      color: colors.neutral700,
      marginTop: 4,
    },
    timeLeft: {
      marginLeft: 12,
    },
    timeRight: {
      alignSelf: 'flex-end',
      marginRight: 12,
    },
    floatingDateContainer: {
      position: 'absolute',
      top: 8,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    floatingDatePill: {
      backgroundColor: 'rgba(0,0,0,0.32)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    floatingDateText: {
      // Literal de propósito — texto branco fixo sobre o selo preto
      // semi-transparente acima. Não é papel de "texto da tela", não inverte.
      color: colors.neutral0,
      fontSize: 12,
      fontWeight: '600',
    },
    dateSeparator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    dateLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.hairline,
    },
    dateText: {
      fontSize: 12,
      color: colors.neutral700,
      marginHorizontal: 8,
      fontWeight: '500',
    },
    footerContrastContainer: {
      backgroundColor: colors.cardBackground,
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: colors.hairline,
      paddingBottom: 5,
    },
    blockedBanner: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.hairline,
      alignItems: 'center',
    },
    blockedBannerText: {
      fontSize: 13,
      color: colors.neutral700,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      height: 60,
    },
    inputLeftContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emojiButton: {
      margin: 0,
      // Mesmo layout do botão de enviar: fundo neutro + borda, em vez de
      // messageIn/messageOut (fixos, ficavam destoantes no escuro).
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 20,
      width: 48,
      height: 48,
    },
    selectedEmojisWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 6,
      marginRight: 4,
      minHeight: 52,
    },
    selectedEmojisContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
    },
    emojiSlot: {
      flex: 1,
      marginHorizontal: 2,
      maxWidth: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiSlotEmpty: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.neutral700,
    },
    emojiSlotFilled: {
      backgroundColor: colors.messageIn,
    },
    selectedEmojiText: {
      fontSize: 26,
      textAlign: 'center',
    },
    sendButton: {
      margin: 0,
      // Era messageOut (verde claro da bolha enviada) — fixo nos dois temas
      // de propósito, então virava um botão esverdeado destoante no escuro
      // (achado em teste manual). cardBackground é neutro e sempre combina;
      // a borda garante que o círculo fique definido mesmo quando o fundo
      // do composer é bem próximo de cardBackground (preto puro no escuro).
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 20,
      width: 48,
      height: 48,
    },
    sendButtonLoading: {
      width: 48,
      height: 48,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.7,
    },
    userProfileEmoji: {
      fontSize: 28,
      marginLeft: 8,
      marginRight: 8,
    },
    emojiKeyboardContainer: {
      height: KEYBOARD_HEIGHT,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.hairline,
    },
    backButton: {
      margin: 0,
      marginRight: 8,
    },
    bubbleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    recallButton: {
      marginRight: 14,
      opacity: 0.6,
    },
    menuButton: {
      margin: 0,
    },
    menuContent: {
      backgroundColor: colors.cardBackground,
    },
    pendingEmoji: {
      color: colors.textPrimary,
      opacity: 0.7,
      textShadowColor: 'rgba(128, 128, 128, 0.3)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
      fontWeight: 'bold',
    },
    pendingTimeText: {
      color: colors.neutral700,
    },
    emptyChat: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyChatText: {
      color: colors.neutral700,
      fontSize: 14,
    },
    removedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    removedText: {
      color: colors.neutral700,
      fontSize: 16,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
