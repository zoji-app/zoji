import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    contactItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
    },
    contactItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    avatarEmoji: {
      fontSize: 42,
    },
    contactInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    contactName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 3,
      color: colors.textPrimary,
    },
    timeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    pendingSentLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    pendingActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 2,
    },
    acceptButton: {
      backgroundColor: colors.primary700,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: colors.neutral0,
      fontSize: 13,
      fontWeight: '600',
    },
    rejectButton: {
      backgroundColor: colors.neutral300,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
    },
    rejectButtonText: {
      color: colors.neutral900,
      fontSize: 13,
      fontWeight: '600',
    },
    pendingRow: {
      backgroundColor: '#fafafa',
    },

    // ── Bubble ────────────────────────────────────────────────────────────────
    bubbleSentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
    },
    bubbleReceivedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
    },
    bubble: {
      flexDirection: 'row',
      overflow: 'hidden',
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
      minWidth: 52,
      maxWidth: 180,
    },
    bubbleSent: {
      backgroundColor: colors.messageOut,
    },
    bubbleReceived: {
      backgroundColor: '#F2F2F7',
    },
    bubblePending: {
      opacity: 0.6,
    },
    bubbleEmojiWrapper: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    bubbleEmoji: {
      fontSize: 28,
    },

    // ── Tail com emoji na ponta ───────────────────────────────────────────────
    // Triângulo apontando para a esquerda (mensagem enviada).
    // marginRight: -1 fecha o gap de 1px no Android.
    tailLeft: {
      width: 0,
      height: 0,
      borderTopWidth: 8,
      borderBottomWidth: 8,
      borderRightWidth: 10,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: colors.messageOut,
      marginRight: -1,
    },
    // Triângulo apontando para a direita (mensagem recebida).
    // marginLeft: -1 fecha o gap de 1px no Android.
    tailRight: {
      width: 0,
      height: 0,
      borderTopWidth: 8,
      borderBottomWidth: 8,
      borderLeftWidth: 10,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: '#F2F2F7',
      marginLeft: -1,
    },
    // Emoji inline na extremidade esquerda (enviado — fica antes do triângulo)
    tailEmojiLeft: {
      fontSize: 16,
      marginRight: 4,
    },
    // Emoji inline na extremidade direita (recebido — fica depois do triângulo)
    tailEmojiRight: {
      fontSize: 16,
      marginLeft: 4,
    },
  });
