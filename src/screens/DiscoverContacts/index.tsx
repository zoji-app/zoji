import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { markDiscoveryDone } from '../../services/discoveryService';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { AppButton } from '../../components/ui';
import { contactsApi, AppContact } from '../../services/contactsApi';
import {
  getDeviceContacts,
  hashPhoneNumber,
} from '../../services/deviceContacts';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { radii } from '../../theme/radii';
import { i18n } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverContacts'>;

type ScreenState =
  | 'checking' // verificando permissão atual sem prompt
  | 'ask' // mostra UI pedindo acesso antes de chamar o sistema
  | 'searching' // permissão ok, buscando
  | 'found' // encontrou contatos
  | 'none' // nenhum contato encontrado
  | 'denied'; // permissão negada

export const DiscoverContacts: React.FC<Props> = () => {
  const { setDone } = useDiscoveryStore();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [state, setState] = useState<ScreenState>('checking');
  const [found, setFound] = useState<AppContact[]>([]);

  // Busca os contatos e atualiza estado
  const searchContacts = useCallback(async () => {
    setState('searching');
    try {
      const deviceContacts = await getDeviceContacts();
      const uniqueNumbers = [
        ...new Set(deviceContacts.flatMap(c => c.phoneNumbers)),
      ].filter(n => n.length > 0);
      const hashes = await Promise.all(
        uniqueNumbers.map(n => hashPhoneNumber(n))
      );
      const discovered = await contactsApi.discover(hashes);
      setFound(discovered);
      setState(discovered.length > 0 ? 'found' : 'none');
    } catch {
      setState('none');
    }
  }, []);

  // Na montagem, verifica se já tem permissão sem abrir o diálogo do sistema
  useEffect(() => {
    (async () => {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        searchContacts();
      } else {
        setState('ask');
      }
    })();
  }, [searchContacts]);

  // Chamado quando o usuário toca "Permitir acesso" — agora abre o diálogo do sistema
  const handleRequestPermission = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      searchContacts();
    } else {
      setState('denied');
    }
  }, [searchContacts]);

  const finish = useCallback(async () => {
    if (state === 'found') {
      try {
        const deviceContacts = await getDeviceContacts();
        const uniqueNumbers = [
          ...new Set(deviceContacts.flatMap(c => c.phoneNumbers)),
        ].filter(n => n.length > 0);
        const hashes = await Promise.all(
          uniqueNumbers.map(n => hashPhoneNumber(n))
        );
        await contactsApi.sync(hashes);
      } catch {
        /* segue em frente mesmo se falhar */
      }
    }
    await markDiscoveryDone();
    setDone(true);
  }, [state, setDone]);

  const renderContact = ({ item }: { item: AppContact }) => (
    <View style={styles.contactRow}>
      <Text style={styles.contactEmoji}>{item.profile_emoji}</Text>
      <Text style={styles.contactName}>{item.nickname}</Text>
    </View>
  );

  // ── checking / searching ────────────────────────────────────────────────────
  if (state === 'checking' || state === 'searching') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary700} />
          <Text style={styles.loadingText}>
            {i18n.t('discovery.searching')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── ask permission ──────────────────────────────────────────────────────────
  if (state === 'ask') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>📱</Text>
          <Text style={styles.title}>{i18n.t('discovery.askTitle')}</Text>
          <Text style={styles.subtitle}>{i18n.t('discovery.askSubtitle')}</Text>
        </View>
        <View style={styles.footer}>
          <AppButton
            mode='contained'
            onPress={handleRequestPermission}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.button}
          >
            {i18n.t('discovery.askAllow')}
          </AppButton>
          <AppButton mode='text' onPress={finish}>
            {i18n.t('discovery.askSkip')}
          </AppButton>
        </View>
      </SafeAreaView>
    );
  }

  // ── denied ──────────────────────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🔒</Text>
          <Text style={styles.title}>{i18n.t('discovery.deniedTitle')}</Text>
          <Text style={styles.subtitle}>
            {i18n.t('discovery.deniedSubtitle')}
          </Text>
        </View>
        <View style={styles.footer}>
          <AppButton
            mode='contained'
            onPress={finish}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.button}
          >
            {i18n.t('discovery.deniedContinue')}
          </AppButton>
        </View>
      </SafeAreaView>
    );
  }

  // ── found ───────────────────────────────────────────────────────────────────
  if (state === 'found') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={styles.title}>
            {found.length === 1
              ? i18n.t('discovery.foundTitleOne')
              : i18n.t('discovery.foundTitleMany', { count: found.length })}
          </Text>
          <Text style={styles.subtitle}>
            {i18n.t('discovery.foundSubtitle')}
          </Text>
        </View>
        <FlatList
          data={found}
          renderItem={renderContact}
          keyExtractor={item => String(item.id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        <View style={styles.footer}>
          <AppButton
            mode='contained'
            onPress={finish}
            buttonColor={colors.primary700}
            borderRadius={radii.lg}
            style={styles.button}
          >
            {i18n.t('discovery.connect')}
          </AppButton>
        </View>
      </SafeAreaView>
    );
  }

  // ── none ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <Text style={styles.bigEmoji}>👀</Text>
        <Text style={styles.title}>{i18n.t('discovery.noneTitle')}</Text>
        <Text style={styles.subtitle}>{i18n.t('discovery.noneSubtitle')}</Text>
      </View>
      <View style={styles.footer}>
        <AppButton
          mode='contained'
          onPress={finish}
          buttonColor={colors.primary700}
          borderRadius={radii.lg}
          style={styles.button}
        >
          {i18n.t('discovery.enter')}
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 16,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 40,
      paddingBottom: 24,
      gap: 12,
    },
    bigEmoji: {
      fontSize: 72,
      marginBottom: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 15,
      color: colors.textSecondary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    contactEmoji: {
      fontSize: 36,
    },
    contactName: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      paddingTop: 12,
      gap: 10,
    },
    button: {},
  });
