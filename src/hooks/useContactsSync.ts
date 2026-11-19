/**
 * useContactsSync — sincroniza os contatos do dispositivo com o servidor.
 *
 * Montado uma única vez em AppNavigator (ao lado de useWsEvents).
 * Executa na inicialização, quando recebe evento WS `contact.added`,
 * e expõe `syncContacts` para refresh manual via `triggerDeviceContactsSync`.
 *
 * Fluxo:
 *   1. Lê contatos do dispositivo via expo-contacts
 *   2. Chama POST /contacts/sync com os números
 *   3. Converte resposta para o formato Contact (preservando lastMessage)
 *   4. Salva em AsyncStorage e notifica ContactsManager
 */

import { useCallback, useEffect, useRef } from 'react';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../contexts/AuthContext';
import {
  getDeviceContacts,
  checkZojiContacts,
} from '../services/deviceContacts';
import {
  loadContactsFromStorage,
  saveContactsToStorage,
} from '../services/contacts';
import ContactsManagerInstance from '../services/ContactsManager';
import { wsService } from '../services/wsService';
import { logger } from '../utils/logger';

// Ref global que permite disparar a sync de fora do hook (ex: Friends screen no foco)
let _syncTrigger: (() => void) | null = null;

export function triggerDeviceContactsSync(): void {
  _syncTrigger?.();
}

export function useContactsSync(): { syncContacts: () => Promise<void> } {
  const { user } = useAuth();
  const isSyncingRef = useRef(false);

  const syncContacts = useCallback(async () => {
    if (!user?.uid) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const userId = user.uid;

    try {
      // 1. Só sincroniza se o usuário já concedeu permissão anteriormente
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') return;

      // 2. Lê contatos do dispositivo
      const deviceContacts = await getDeviceContacts();
      if (deviceContacts.length === 0) return;

      // 3. Verifica quais têm o app (chamada ao servidor)
      const withStatus = await checkZojiContacts(deviceContacts);
      const appContacts = withStatus.filter(c => c.hasZoji && c.zojiUserId);

      if (appContacts.length === 0) return;

      // 4. Carrega contatos existentes do storage para preservar lastMessage
      const existing = await loadContactsFromStorage(userId);
      const existingMap = new Map(existing.map(c => [c.id, c]));

      // 5. Monta lista de contatos no formato do storage
      const updated = appContacts.map(dc => {
        const id = dc.zojiUserId!;
        const prev = existingMap.get(id);
        const nickname = dc.zojiProfile?.nickname || dc.name;
        return {
          id,
          nickname,
          deviceName: dc.name !== nickname ? dc.name : undefined,
          profileEmoji: dc.zojiProfile?.profileEmoji || '👤',
          phoneNumber: dc.phoneNumbers[0] || '',
          lastMessage: prev?.lastMessage ?? null,
          unreadCount: prev?.unreadCount ?? 0,
          isFavorite: false,
          isBlocked: false,
          lastInteractionAt: prev?.lastInteractionAt ?? new Date(),
          relationshipStatus: 'accepted',
        } as any;
      });

      // Mantém contatos com mensagens que não estão na sincronização (ex: bloqueados antes da sync)
      const syncedIds = new Set(updated.map((c: any) => c.id));
      const orphans = existing.filter(
        c =>
          !syncedIds.has(c.id) && c.lastMessage != null && !(c as any).isBlocked
      );

      const merged = [...updated, ...orphans];

      // 6. Persiste e notifica
      await saveContactsToStorage(userId, merged as any);
      ContactsManagerInstance.initialize(merged as any);
      ContactsManagerInstance.notifyContactsChanged(true);

      logger.debug(`[ContactsSync] ${updated.length} contatos sincronizados`);
    } catch (error) {
      logger.error('[ContactsSync] Erro ao sincronizar:', error as Error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user?.uid]);

  // Disponibiliza syncContacts via ref global para chamadas externas
  useEffect(() => {
    _syncTrigger = () => {
      syncContacts();
    };
    return () => {
      _syncTrigger = null;
    };
  }, [syncContacts]);

  // Executa na inicialização
  useEffect(() => {
    syncContacts();
  }, [syncContacts]);

  // Re-sincroniza quando o backend notifica que alguém nos adicionou como contato
  useEffect(() => {
    const unsub = wsService.on('contact.added', () => {
      logger.debug(
        '[ContactsSync] Evento contact.added recebido — re-sincronizando'
      );
      syncContacts();
    });
    return unsub;
  }, [syncContacts]);

  return { syncContacts };
}
