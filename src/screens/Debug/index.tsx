import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Text, List } from 'react-native-paper';
import { PlainInput, PressableButton, ScreenHeader } from '../../components/ui';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { resetOnboarding } from '../../services/onboardingService';
import { resetDiscovery } from '../../services/discoveryService';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { useDebugPreviewStore } from '../../stores/debugPreviewStore';
import { navigationRef } from '../../navigation/navigationRef';
import { clearDismissedBanners } from '../../hooks/useAppBanner';
import { fetchBannerPreview, AppBanner } from '../../services/bannerApi';
import { AppBanner as AppBannerComponent } from '../../components/AppBanner';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';

// Token de preview configurado no .env da API (BANNER_PREVIEW_TOKEN)
const PREVIEW_TOKEN = 'zoji-preview-dev';

type Props = NativeStackScreenProps<RootStackParamList, 'Debug'>;

export const Debug: React.FC<Props> = ({ navigation }) => {
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [previewId, setPreviewId] = useState('');
  const [previewBanner, setPreviewBanner] = useState<AppBanner | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { setDone: setDiscoveryDone } = useDiscoveryStore();
  const setPreviewActive = useDebugPreviewStore(state => state.setActive);
  const setSavedState = useDebugPreviewStore(state => state.setSavedState);

  // Sempre que a tela de Debug ganha foco de novo (botão flutuante, botão
  // de voltar da própria tela de destino, ou gesto de voltar), desliga o
  // preview — cobre todo caminho de volta, não só o botão flutuante.
  useFocusEffect(
    useCallback(() => {
      setPreviewActive(false);
    }, [setPreviewActive])
  );

  // Liga o preview antes de navegar pra uma tela de destino — é o que faz
  // o DebugPreviewBackButton aparecer, já que o atalho de Debug é só pra
  // validar layout, sem interagir com o fluxo/dados reais da tela. Guarda
  // o estado da pilha de ANTES de sair (ex: Settings -> Debug) pro botão
  // flutuante restaurar exatamente ele — não dá pra só resetar pra
  // [{name: 'Debug'}], porque aí o próprio botão de voltar do Debug para
  // de funcionar (Debug vira a raiz da pilha, sem nada atrás).
  const goTo = useCallback(
    (navigate: () => void) => {
      if (navigationRef.isReady()) {
        setSavedState(navigationRef.getRootState());
      }
      setPreviewActive(true);
      navigate();
    },
    [setPreviewActive, setSavedState]
  );

  const handleResetOnboarding = async () => {
    await resetOnboarding();
    addToast('success', i18n.t('debug.onboardingReset'));
  };

  const handleResetDiscovery = async () => {
    await resetDiscovery();
    setDiscoveryDone(false);
    addToast('success', i18n.t('debug.discoveryReset'));
  };

  const handleClearBanners = async () => {
    await clearDismissedBanners();
    addToast('success', 'Banners dispensados limpos — volte para Conversas');
  };

  const handlePreview = async () => {
    const id = previewId.trim();
    if (!id) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBanner(null);
    const banner = await fetchBannerPreview(id, PREVIEW_TOKEN);
    setPreviewLoading(false);
    if (banner) {
      setPreviewBanner(banner);
    } else {
      setPreviewError(`Banner "${id}" não encontrado ou token inválido`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={i18n.t('debug.title')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps='handled'>
        <List.Section>
          <List.Subheader>Onboarding</List.Subheader>
          <List.Item
            title={i18n.t('debug.resetOnboarding')}
            description={i18n.t('debug.resetOnboardingDesc')}
            left={props => <List.Icon {...props} icon='refresh' />}
            onPress={handleResetOnboarding}
          />
          <List.Item
            title={i18n.t('debug.resetDiscovery')}
            description={i18n.t('debug.resetDiscoveryDesc')}
            left={props => (
              <List.Icon {...props} icon='account-search-outline' />
            )}
            onPress={handleResetDiscovery}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Banner</List.Subheader>
          <List.Item
            title='Limpar banners dispensados'
            description='Faz o banner atual reaparecer na tela de conversas'
            left={props => <List.Icon {...props} icon='bell-ring-outline' />}
            onPress={handleClearBanners}
          />

          {/* Preview de rascunho */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Preview de rascunho</Text>
            <Text style={styles.previewDesc}>
              Digite o ID de um banner (incluindo rascunhos) para visualizá-lo
              aqui sem publicar.
            </Text>
            <View style={styles.previewRow}>
              <PlainInput
                style={styles.previewInput}
                value={previewId}
                onChangeText={setPreviewId}
                placeholder='ID do banner'
                placeholderTextColor={colors.textSecondary}
                autoCapitalize='none'
                autoCorrect={false}
                returnKeyType='search'
                onSubmitEditing={handlePreview}
              />
              <PressableButton
                style={[
                  styles.previewBtn,
                  (!previewId.trim() || previewLoading) &&
                    styles.previewBtnDisabled,
                ]}
                onPress={handlePreview}
                disabled={!previewId.trim() || previewLoading}
              >
                <Text style={styles.previewBtnText}>
                  {previewLoading ? '...' : 'Ver'}
                </Text>
              </PressableButton>
            </View>

            {previewError && (
              <Text style={styles.previewError}>{previewError}</Text>
            )}

            {previewBanner && (
              <View style={styles.previewResult}>
                <Text style={styles.previewResultLabel}>Resultado:</Text>
                <AppBannerComponent
                  banner={previewBanner}
                  onDismiss={() => setPreviewBanner(null)}
                />
              </View>
            )}
          </View>
        </List.Section>

        <List.Section>
          <List.Subheader>
            Ir direto para uma tela (validar layout)
          </List.Subheader>
          <List.Item
            title='Amigos'
            left={props => <List.Icon {...props} icon='account-multiple' />}
            onPress={() =>
              goTo(() => navigation.navigate('MainApp', { screen: 'Friends' }))
            }
          />
          <List.Item
            title='Jogo'
            left={props => <List.Icon {...props} icon='gamepad-variant' />}
            onPress={() =>
              goTo(() => navigation.navigate('MainApp', { screen: 'Game' }))
            }
          />
          <List.Item
            title='Perfil'
            left={props => (
              <List.Icon {...props} icon='account-circle-outline' />
            )}
            onPress={() =>
              goTo(() => navigation.navigate('MainApp', { screen: 'Profile' }))
            }
          />
          <List.Item
            title='Configurações'
            left={props => <List.Icon {...props} icon='cog' />}
            onPress={() =>
              goTo(() => navigation.navigate('MainApp', { screen: 'Settings' }))
            }
          />
          <List.Item
            title='Adicionar contato'
            onPress={() => goTo(() => navigation.navigate('AddContact'))}
          />
          <List.Item
            title='Contatos do dispositivo'
            onPress={() => goTo(() => navigation.navigate('DeviceContacts'))}
          />
          <List.Item
            title='Contatos bloqueados'
            onPress={() => goTo(() => navigation.navigate('BlockedContacts'))}
          />
          <List.Item
            title='Agentes conectados'
            onPress={() => goTo(() => navigation.navigate('ConnectedAgents'))}
          />
          <List.Item
            title='Termos de uso'
            onPress={() => goTo(() => navigation.navigate('TermsOfUse'))}
          />
          <List.Item
            title='Política de privacidade'
            onPress={() => goTo(() => navigation.navigate('PrivacyPolicy'))}
          />
          <List.Item
            title='Criar grupo'
            onPress={() => goTo(() => navigation.navigate('CreateGroup'))}
          />
          <List.Item
            title='Jogar (quiz)'
            onPress={() => goTo(() => navigation.navigate('GamePlay', {}))}
          />
          <List.Item
            title='Ranking do jogo'
            onPress={() => goTo(() => navigation.navigate('GameRanking'))}
          />
          <List.Item
            title='Chat (contato de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('Chat', {
                  contact: {
                    id: 'debug',
                    nickname: 'Contato de teste',
                    profileEmoji: '🦊',
                  },
                })
              )
            }
          />
          <List.Item
            title='Chat de grupo (dados de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('GroupChat', {
                  groupId: 0,
                  groupName: 'Grupo de teste',
                  groupEmoji: '🎉',
                })
              )
            }
          />
          <List.Item
            title='Detalhes do grupo (dados de teste)'
            onPress={() =>
              goTo(() => navigation.navigate('GroupDetails', { groupId: 0 }))
            }
          />
          <List.Item
            title='Adicionar membros ao grupo (dados de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('AddGroupMembers', {
                  groupId: 0,
                  currentMemberIds: [],
                })
              )
            }
          />
          <List.Item
            title='Resultado do jogo (dados de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('GameResult', {
                  score: 100,
                  correct: 8,
                  total: 10,
                  streakMax: 5,
                })
              )
            }
          />
          <List.Item
            title='Permissões de agente (dados de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('ManageAgentPermissions', {
                  connectionId: 0,
                  clientName: 'App de teste',
                  currentScopes: ['read_status'],
                })
              )
            }
          />
          <List.Item
            title='Autorizar agente (dados de teste)'
            onPress={() =>
              goTo(() =>
                navigation.navigate('AuthorizeAgent', {
                  client_id: 'debug-client',
                  redirect_uri: 'https://example.com',
                  code_challenge: 'debug',
                  code_challenge_method: 'S256',
                  scope: 'read_status',
                })
              )
            }
          />
        </List.Section>

        <List.Section>
          <List.Subheader>
            Telas condicionais (preview — não é o fluxo real)
          </List.Subheader>
          <List.Item
            title='Login'
            description='Preview do componente — não afeta a sessão real'
            onPress={() => goTo(() => navigation.navigate('DebugLoginPreview'))}
          />
          <List.Item
            title='Completar perfil'
            description='Preview do componente — não afeta o perfil real'
            onPress={() =>
              goTo(() => navigation.navigate('DebugProfileSetupPreview'))
            }
          />
          <List.Item
            title='Descobrir contatos'
            description='Preview do componente — não marca a descoberta como concluída'
            onPress={() =>
              goTo(() => navigation.navigate('DebugDiscoverContactsPreview'))
            }
          />
          <List.Item
            title='Onboarding'
            description='Preview do componente — completar o fluxo até o fim marca onboarding como visto de verdade'
            onPress={() =>
              goTo(() => navigation.navigate('DebugOnboardingPreview'))
            }
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.cardBackground },
    content: { flex: 1, backgroundColor: colors.pageBackground },
    previewSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    previewLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    previewDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    previewRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    previewInput: {
      flex: 1,
      height: 40,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.textPrimary,
      fontFamily: 'monospace',
    },
    previewBtn: {
      height: 40,
      paddingHorizontal: 16,
      backgroundColor: colors.primary700,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewBtnDisabled: { opacity: 0.4 },
    // Texto fixo sobre o botão primary700 — não é papel de página, não inverte.
    previewBtnText: { color: colors.neutral0, fontSize: 14, fontWeight: '600' },
    previewError: { fontSize: 12, color: colors.error, marginTop: 2 },
    previewResult: { marginTop: 8, gap: 4 },
    previewResultLabel: { fontSize: 12, color: colors.textSecondary },
  });
