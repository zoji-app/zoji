import { Platform, StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    flex: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },

    // ── Input manual ──────────────────────────────────────────────────────────
    manualSection: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 4,
      backgroundColor: colors.pageBackground,
    },
    manualLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
    },
    manualRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    manualInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        android: { paddingVertical: 0 },
      }),
    },
    manualButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary700,
      justifyContent: 'center',
      alignItems: 'center',
    },
    manualButtonDisabled: {
      opacity: 0.6,
    },
    manualHelper: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 6,
      marginBottom: 4,
    },

    // ── Botões de ação (convidar + novo grupo + QR) ───────────────────────────
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    inviteButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary700,
    },
    newGroupButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary700,
    },
    inviteButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary700,
      textAlign: 'center',
    },

    // ── Divisor de seção ──────────────────────────────────────────────────────
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 8,
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.hairline,
    },
    sectionLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      marginHorizontal: 10,
    },

    // ── Estados ───────────────────────────────────────────────────────────────
    loaderBox: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    permissionBox: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 12,
    },
    permissionText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    permissionButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.primary700,
    },
    permissionButtonText: {
      // Texto fixo sobre o botão primary700 — não é papel de página, não inverte.
      color: colors.neutral0,
      fontWeight: '600',
      fontSize: 14,
    },
    // Versão compacta: mostrada abaixo da lista quando já existem amigos —
    // o aviso de permissão não deve competir por espaço com conteúdo real.
    permissionBoxCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    permissionTextCompact: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    permissionButtonTextCompact: {
      color: colors.primary700,
      fontWeight: '600',
      fontSize: 12,
    },
    emptyBox: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // ── Lista de contatos ─────────────────────────────────────────────────────
    listContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    contactItem: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      backgroundColor: colors.pageBackground,
    },
    contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactEmoji: {
      fontSize: 36,
      marginRight: 12,
    },
    contactDetails: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 1,
    },
    contactSubName: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    contactPhone: {
      fontSize: 12,
      color: '#aaa',
      marginTop: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
      gap: 4,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    badgeText: {
      // Texto fixo sobre badges de cor dinâmica (ex: '#FF9800', '#9C27B0',
      // definidas inline no .tsx) — contraste com o badge, não papel de página.
      color: colors.background,
      fontSize: 11,
      fontWeight: '700',
    },
    actionIcon: {
      width: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    hidden: {
      display: 'none',
    },
    // Pedido recebido: mesmos botões da lista Amigos (ContactItem), um pouco
    // mais altos para facilitar o toque.
    requestActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 8,
    },
    requestButton: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    acceptButton: {
      backgroundColor: colors.primary700,
    },
    acceptButtonText: {
      color: colors.neutral0,
      fontSize: 14,
      fontWeight: '600',
    },
    rejectButton: {
      backgroundColor: colors.neutral300,
    },
    rejectButtonText: {
      color: colors.neutral900,
      fontSize: 14,
      fontWeight: '600',
    },
  });
