import * as Contacts from 'expo-contacts/legacy';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { contactsApi } from './contactsApi';
import { relationshipsApi } from './relationshipsApi';
import type { BlockedUser } from './contactsApi';

const CACHE_KEY = (userId: string) =>
  `@zoji:device_contacts_cache_v2:${userId}`;

export const loadDeviceContactsCache = async (
  userId: string
): Promise<DeviceContact[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    return raw ? (JSON.parse(raw) as DeviceContact[]) : null;
  } catch {
    return null;
  }
};

export const saveDeviceContactsCache = async (
  userId: string,
  contacts: DeviceContact[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(contacts));
  } catch (e) {
    logger.error('[deviceContacts] Erro ao salvar cache:', e as Error);
  }
};

export type DeviceContactRelationship =
  'friend' | 'pending_sent' | 'pending_received' | 'none';

// Tipo para contatos do dispositivo
export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  hasZoji: boolean;
  zojiUserId?: string;
  zojiProfile?: {
    nickname: string;
    profileEmoji: string;
  };
  relationshipStatus?: DeviceContactRelationship;
  relationshipId?: string;
  blockedByMe?: boolean;
}

/**
 * Solicita permissão para acessar os contatos do dispositivo
 */
export const requestContactsPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Erro ao solicitar permissão de contatos:', error as Error);
    return false;
  }
};

/**
 * Computa o SHA-256 de um número já no formato canônico (+55DDXXXXXXXXX).
 * Nunca enviar o número em texto puro ao servidor.
 */
export const hashPhoneNumber = async (canonical: string): Promise<string> => {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonical
  );
};

/**
 * Formata o número de telefone para o formato padrão usado no app
 * (Removendo símbolos, espaços e adicionando o código do país se necessário)
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Remove prefixo de discagem "0" do DDD brasileiro: (051) → 51
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = cleaned.slice(1);
  }

  if (!cleaned.startsWith('55')) {
    // Sem código de país: formato antigo (10 dígitos) → insere 9° dígito
    if (cleaned.length === 10) {
      cleaned = cleaned.slice(0, 2) + '9' + cleaned.slice(2);
    }
    // Adiciona código do país (11 dígitos: DDD + 9 dígitos)
    if (cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
  } else {
    // Já tem código +55
    let local = cleaned.slice(2);
    // Strip leading 0 from DDD: 55053... → 5553...
    if (local.startsWith('0')) {
      local = local.slice(1);
      cleaned = '55' + local;
    }
    // Insere 9° dígito se necessário: 12 dígitos → 13
    if (local.length === 10) {
      cleaned = '55' + local.slice(0, 2) + '9' + local.slice(2);
    }
  }

  if (cleaned.length >= 12 && !cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
};

/**
 * Obtém todos os contatos do dispositivo
 */
export const getDeviceContacts = async (): Promise<DeviceContact[]> => {
  try {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      logger.warn('Permissão de contatos não concedida');
      return [];
    }

    // Opções específicas para cada plataforma
    const options =
      Platform.OS === 'ios'
        ? { fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] }
        : undefined;

    const { data } = await Contacts.getContactsAsync(options);

    // Filtra contatos que têm id e pelo menos um número de telefone
    return data
      .filter(
        contact =>
          contact.id && contact.phoneNumbers && contact.phoneNumbers.length > 0
      )
      .map(contact => ({
        id: contact.id!, // Agora sabemos que id existe por causa do filtro acima
        name: contact.name || contact.firstName || 'Sem nome',
        phoneNumbers: contact.phoneNumbers
          ? contact.phoneNumbers
              .map(phone =>
                phone.number ? formatPhoneNumber(phone.number) : ''
              )
              .filter(phone => phone.length > 0)
          : [],
        hasZoji: false,
      }));
  } catch (error) {
    logger.error('Erro ao obter contatos do dispositivo:', error as Error);
    return [];
  }
};

/**
 * Envia hashes SHA-256 dos números ao servidor e marca quais têm o Zoji.
 * Números em texto puro nunca saem do dispositivo.
 */
type EnrichedResult = {
  contacts: DeviceContact[];
  numberToHash: Map<string, string>;
};

// Computa hashes em lotes de 50 para equilibrar velocidade e uso de memória
const enrichContactsInternal = async (
  deviceContacts: DeviceContact[]
): Promise<EnrichedResult> => {
  if (deviceContacts.length === 0)
    return { contacts: [], numberToHash: new Map() };

  try {
    const uniqueNumbers = [
      ...new Set(deviceContacts.flatMap(c => c.phoneNumbers)),
    ].filter(n => n.length > 0);

    if (uniqueNumbers.length === 0) {
      return { contacts: deviceContacts, numberToHash: new Map() };
    }

    const numberToHash = new Map<string, string>();
    const BATCH = 50;
    for (let i = 0; i < uniqueNumbers.length; i += BATCH) {
      const slice = uniqueNumbers.slice(i, i + BATCH);
      const pairs = await Promise.all(
        slice.map(n => hashPhoneNumber(n).then(h => [n, h] as const))
      );
      for (const [n, h] of pairs) numberToHash.set(n, h);
    }

    const hashToNumber = new Map<string, string>();
    for (const [n, h] of numberToHash) hashToNumber.set(h, n);
    const allHashes = [...hashToNumber.keys()];

    logger.debug(
      `[checkZojiContacts] Enviando ${allHashes.length} hashes ao servidor`
    );

    const [appUsers, deletedHashList] = await Promise.all([
      contactsApi.sync(allHashes),
      contactsApi.deletedHashes(allHashes),
    ]);

    logger.debug(
      `[checkZojiContacts] Servidor retornou ${appUsers.length} usuários`
    );

    const byHash = new Map(appUsers.map(u => [u.phone_hash, u]));
    const deletedHashSet = new Set(deletedHashList);

    const contacts = deviceContacts
      .filter(
        contact =>
          !contact.phoneNumbers.some(n =>
            deletedHashSet.has(numberToHash.get(n) ?? '')
          )
      )
      .map(contact => {
        const matched = contact.phoneNumbers
          .map(n => byHash.get(numberToHash.get(n) ?? ''))
          .find(u => u !== undefined);
        if (!matched) return contact;
        return {
          ...contact,
          hasZoji: true,
          zojiUserId: String(matched.id),
          zojiProfile: {
            nickname: matched.nickname || contact.name,
            profileEmoji: matched.profile_emoji || '👤',
          },
        };
      });

    return { contacts, numberToHash };
  } catch (error) {
    logger.error(
      '[deviceContacts] Erro ao verificar contatos no servidor:',
      error as Error
    );
    return { contacts: deviceContacts, numberToHash: new Map() };
  }
};

export const checkZojiContacts = async (
  deviceContacts: DeviceContact[]
): Promise<DeviceContact[]> => {
  const { contacts } = await enrichContactsInternal(deviceContacts);
  return contacts;
};

/**
 * Função principal: varre TODOS os contatos do dispositivo, identifica quem tem
 * Zoji e cruza com os relacionamentos do usuário para mostrar o status correto.
 * Sempre busca dados frescos — sem cache.
 */
export const getContactsWithZojiStatus = async (
  currentUserId: string
): Promise<DeviceContact[]> => {
  // Busca contatos do dispositivo e bloqueados em paralelo
  const [deviceContacts, blockedUsers] = await Promise.all([
    getDeviceContacts(),
    contactsApi.blocked().catch(() => [] as BlockedUser[]),
  ]);

  const blockedIds = new Set(blockedUsers.map(b => String(b.id)));

  logger.debug(
    `[DeviceContacts] Total de contatos no dispositivo: ${deviceContacts.length}`
  );
  if (deviceContacts.length > 0) {
    logger.debug(
      `[DeviceContacts] Exemplo de números formatados: ${deviceContacts
        .slice(0, 3)
        .map(c => `${c.name}=${c.phoneNumbers[0]}`)
        .join(', ')}`
    );
  }

  // O sync cria/atualiza relacionamentos no servidor — apiRels deve ser
  // buscado DEPOIS para refletir os upserts feitos pelo sync
  const { contacts: contactsWithZoji, numberToHash } =
    await enrichContactsInternal(deviceContacts);
  const apiRels = await relationshipsApi.list().catch(() => []);

  logger.debug(
    `[DeviceContacts] Total de relacionamentos na API: ${apiRels.length}`
  );

  // Mapa de zojiUserId → status do relacionamento
  const relByContact = new Map<
    string,
    { status: string; id: string; initiatedBy: string }
  >();
  for (const rel of apiRels) {
    relByContact.set(String(rel.contact.id), {
      status: rel.status,
      id: String(rel.id),
      initiatedBy: String(rel.initiated_by),
    });
  }

  // IDs já cobertos pela agenda do dispositivo
  const coveredIds = new Set<string>();

  const fromDevice = contactsWithZoji
    .filter(c => c.zojiUserId && c.zojiUserId !== currentUserId)
    .map(c => {
      coveredIds.add(c.zojiUserId!);
      const rel = relByContact.get(c.zojiUserId!);
      let relationshipStatus: DeviceContactRelationship = 'none';
      if (rel) {
        if (rel.status === 'accepted') relationshipStatus = 'friend';
        else if (rel.status === 'pending') {
          relationshipStatus =
            rel.initiatedBy === currentUserId
              ? 'pending_sent'
              : 'pending_received';
        }
      }
      return {
        ...c,
        relationshipStatus,
        relationshipId: rel?.id,
        blockedByMe: blockedIds.has(c.zojiUserId!),
      };
    });

  // Índice de hash → nome na agenda — reutiliza numberToHash já computado
  const deviceContactByHash = new Map<string, string>();
  for (const dc of deviceContacts) {
    for (const num of dc.phoneNumbers) {
      const h = numberToHash.get(num);
      if (h) deviceContactByHash.set(h, dc.name);
    }
  }

  // Deduplica por zojiUserId: o mesmo usuário pode estar salvo em múltiplos
  // registros da agenda (números diferentes ou entradas duplicadas), fazendo
  // com que o mesmo zojiUserId apareça mais de uma vez em fromDevice.
  const seenInDevice = new Set<string>();
  const fromDeviceUniq = fromDevice.filter(c => {
    if (seenInDevice.has(c.zojiUserId!)) return false;
    seenInDevice.add(c.zojiUserId!);
    return true;
  });

  // Amigos/pendentes que não estão na agenda — vêm direto da API de relacionamentos
  const fromApi: DeviceContact[] = apiRels
    .filter(rel => {
      const contactId = String(rel.contact.id);
      // Pedido que eu recusei some da lista: sem estar na agenda, não há nem
      // telefone para adicionar de novo por aqui.
      if (
        rel.status === 'rejected' &&
        String(rel.rejected_by) === currentUserId
      ) {
        return false;
      }
      return !coveredIds.has(contactId) && contactId !== currentUserId;
    })
    .map(rel => {
      const contactId = String(rel.contact.id);
      let relationshipStatus: DeviceContactRelationship = 'none';
      if (rel.status === 'accepted') relationshipStatus = 'friend';
      else if (rel.status === 'pending') {
        relationshipStatus =
          String(rel.initiated_by) === currentUserId
            ? 'pending_sent'
            : 'pending_received';
      }
      const phoneHash = rel.contact.phone_hash ?? '';
      const deviceName = phoneHash
        ? deviceContactByHash.get(phoneHash)
        : undefined;
      const apiPhone = rel.contact.phone_number
        ? [rel.contact.phone_number]
        : [];
      return {
        id: `api_${contactId}`,
        name: deviceName || rel.contact.nickname || 'Usuário Zoji',
        phoneNumbers: apiPhone,
        hasZoji: true,
        zojiUserId: contactId,
        zojiProfile: {
          nickname: rel.contact.nickname,
          profileEmoji: rel.contact.profile_emoji || '👤',
        },
        relationshipStatus,
        relationshipId: String(rel.id),
        blockedByMe: blockedIds.has(contactId),
      };
    });

  logger.debug(
    `[DeviceContacts] Da agenda: ${fromDevice.length}, da API: ${fromApi.length}`
  );

  const zojiContacts = [...fromDeviceUniq, ...fromApi].sort((a, b) => {
    const order: Record<DeviceContactRelationship, number> = {
      friend: 0,
      pending_sent: 1,
      pending_received: 2,
      none: 3,
    };
    const diff = order[a.relationshipStatus!] - order[b.relationshipStatus!];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  // Contatos sem Zoji aparecem no final, para o botão de convite
  const nonZojiContacts = contactsWithZoji
    .filter(c => !c.hasZoji)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...zojiContacts, ...nonZojiContacts];
};
