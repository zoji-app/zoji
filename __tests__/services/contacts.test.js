/**
 * P7-2b — testes de caracterização de src/services/contacts.ts.
 * Escritos contra o comportamento existente ANTES da limpeza (remoção do
 * storage.ts morto, dos require() dinâmicos e da notificação dupla), e
 * mantidos depois para provar que o comportamento observável não mudou.
 */

const mockMem = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(k =>
    Promise.resolve(mockMem.has(k) ? mockMem.get(k) : null)
  ),
  setItem: jest.fn((k, v) => {
    mockMem.set(k, v);
    return Promise.resolve();
  }),
  removeItem: jest.fn(k => {
    mockMem.delete(k);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...mockMem.keys()])),
  multiGet: jest.fn(keys =>
    Promise.resolve(keys.map(k => [k, mockMem.has(k) ? mockMem.get(k) : null]))
  ),
  multiRemove: jest.fn(keys => {
    keys.forEach(k => mockMem.delete(k));
    return Promise.resolve();
  }),
}));

jest.mock('../../src/services/ContactsManager', () => {
  const m = {
    updateContact: jest.fn(),
    moveContactToTop: jest.fn(),
    initialize: jest.fn(),
    notifyContactsChanged: jest.fn(),
    getContact: jest.fn(),
  };
  return { __esModule: true, default: m, ContactsManager: m };
});

jest.mock('../../src/services/relationships', () => ({
  generateRelationshipId: (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`),
  RelationshipStatus: { ACCEPTED: 'accepted' },
  requestAddContact: jest.fn(),
  getUserRelationships: jest.fn().mockResolvedValue([]),
  getContactsFromRelationships: jest.fn().mockResolvedValue([]),
  getContactsFromRelationshipsWithoutRecursion: jest.fn().mockResolvedValue([]),
  removeRelationship: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/utils/logger', () => {
  const l = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { __esModule: true, logger: l, default: l };
});

const contacts = require('../../src/services/contacts');
const CM = require('../../src/services/ContactsManager').default;
const relationships = require('../../src/services/relationships');

const USER = '10';
const KEY = `@zoji:contacts:${USER}`;

function contact(id, extra = {}) {
  return {
    id,
    nickname: `c${id}`,
    profileEmoji: '🐱',
    phoneNumber: '',
    lastMessage: null,
    ...extra,
  };
}

function stored() {
  return JSON.parse(mockMem.get(KEY));
}

beforeEach(() => {
  mockMem.clear();
  jest.clearAllMocks();
});

describe('save/loadContactsFromStorage', () => {
  it('ida e volta converte createdAt para Date e grava como timestamp', async () => {
    const d = new Date('2026-11-16T10:00:00Z');
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: { emoji: '👍', senderId: '20', createdAt: d },
      }),
    ]);
    expect(stored()[0].lastMessage.createdAt).toBe(d.getTime());

    const [c] = await contacts.loadContactsFromStorage(USER, true);
    expect(c.lastMessage.createdAt).toBeInstanceOf(Date);
    expect(c.lastMessage.createdAt.getTime()).toBe(d.getTime());
  });

  it('sem nada salvo e com skip → [] sem consultar relacionamentos', async () => {
    expect(await contacts.loadContactsFromStorage(USER, true)).toEqual([]);
    expect(relationships.getUserRelationships).not.toHaveBeenCalled();
  });

  it('sem nada salvo e sem skip → monta dos relacionamentos e salva', async () => {
    relationships.getUserRelationships.mockResolvedValueOnce([{ id: 'r' }]);
    relationships.getContactsFromRelationshipsWithoutRecursion.mockResolvedValueOnce(
      [contact('30')]
    );
    const list = await contacts.loadContactsFromStorage(USER);
    expect(list.map(c => c.id)).toEqual(['30']);
    expect(stored().map(c => c.id)).toEqual(['30']);
  });

  it('JSON corrompido → []', async () => {
    mockMem.set(KEY, '{nao é json');
    expect(await contacts.loadContactsFromStorage(USER, true)).toEqual([]);
  });
});

describe('updateContactLastMessage', () => {
  const old = new Date('2026-11-16T10:00:00Z');
  const newer = new Date('2026-11-16T11:00:00Z');

  it('contato inexistente → false', async () => {
    await contacts.saveContactsToStorage(USER, [contact('20')]);
    expect(
      await contacts.updateContactLastMessage(USER, '99', {
        emoji: '👍',
        createdAt: newer,
      })
    ).toBe(false);
  });

  it('sem lastMessage → grava com id gerado e avisa o ContactsManager', async () => {
    await contacts.saveContactsToStorage(USER, [contact('20')]);
    const ok = await contacts.updateContactLastMessage(USER, '20', {
      emoji: '👍',
      senderId: '20',
      createdAt: newer,
    });
    expect(ok).toBe(true);
    const lm = stored()[0].lastMessage;
    expect(lm.emoji).toBe('👍');
    expect(typeof lm.id).toBe('string');
    expect(lm.id.length).toBeGreaterThan(0);
    expect(CM.updateContact).toHaveBeenCalledWith(
      '20',
      expect.objectContaining({ id: '20' })
    );
    expect(CM.moveContactToTop).toHaveBeenCalledWith('20', true, true);
  });

  it('mensagem mais antiga e atual não pendente → false, nada muda', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: { emoji: '🔥', senderId: '20', createdAt: newer },
      }),
    ]);
    expect(
      await contacts.updateContactLastMessage(USER, '20', {
        emoji: '👍',
        createdAt: old,
      })
    ).toBe(false);
    expect(stored()[0].lastMessage.emoji).toBe('🔥');
  });

  it('atual pendente → atualiza mesmo com data mais antiga', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: {
          emoji: '🔥',
          senderId: '10',
          createdAt: newer,
          pending: true,
        },
      }),
    ]);
    expect(
      await contacts.updateContactLastMessage(USER, '20', {
        emoji: '🔥',
        createdAt: old,
        pending: false,
      })
    ).toBe(true);
    expect(stored()[0].lastMessage.pending).toBe(false);
  });

  it('forceUpdate atualiza mesmo sendo mais antiga', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: { emoji: '🔥', senderId: '20', createdAt: newer },
      }),
    ]);
    expect(
      await contacts.updateContactLastMessage(
        USER,
        '20',
        { emoji: '👍', createdAt: old },
        true
      )
    ).toBe(true);
    expect(stored()[0].lastMessage.emoji).toBe('👍');
  });

  it('mesmo remetente sem senderEmoji reaproveita o anterior', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: {
          emoji: '🔥',
          senderId: '20',
          senderEmoji: '🦊',
          createdAt: old,
        },
      }),
    ]);
    await contacts.updateContactLastMessage(USER, '20', {
      emoji: '👍',
      senderId: '20',
      createdAt: newer,
    });
    expect(stored()[0].lastMessage.senderEmoji).toBe('🦊');
  });

  it('recebida de outro remetente sem senderEmoji usa o emoji de perfil do contato', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: {
          emoji: '🔥',
          senderId: '10',
          senderEmoji: '🦊',
          createdAt: old,
        },
      }),
    ]);
    await contacts.updateContactLastMessage(USER, '20', {
      emoji: '👍',
      senderId: '20',
      senderEmoji: undefined,
      createdAt: newer,
    });
    expect(stored()[0].lastMessage.senderEmoji).toBe('🐱');
  });
});

describe('applyLastMessageUpdatesBatch', () => {
  it('lista vazia → false sem tocar no storage', async () => {
    expect(await contacts.applyLastMessageUpdatesBatch(USER, [])).toBe(false);
    expect(mockMem.size).toBe(0);
  });

  it('aplica várias, salva uma vez e reinicializa o ContactsManager', async () => {
    await contacts.saveContactsToStorage(USER, [
      contact('20'),
      contact('30'),
      contact('40'),
    ]);
    const AS = require('@react-native-async-storage/async-storage');
    AS.setItem.mockClear();

    const ok = await contacts.applyLastMessageUpdatesBatch(USER, [
      {
        contactId: '20',
        lastMessage: { emoji: 'a', senderId: '20', createdAt: new Date() },
      },
      {
        contactId: '30',
        lastMessage: { emoji: '', senderId: '30', createdAt: new Date() },
      },
      { contactId: '99', lastMessage: { emoji: 'x', createdAt: new Date() } },
    ]);

    expect(ok).toBe(true);
    expect(AS.setItem).toHaveBeenCalledTimes(1);
    const byId = Object.fromEntries(stored().map(c => [c.id, c]));
    expect(byId['20'].lastMessage.emoji).toBe('a');
    expect(byId['30'].lastMessage.emoji).toBe('❓'); // emoji vazio vira ❓
    expect(byId['40'].lastMessage).toBeNull();
    expect(CM.initialize).toHaveBeenCalledTimes(1);
    expect(CM.notifyContactsChanged).toHaveBeenCalledWith(true);
  });

  it('nada a mudar → false', async () => {
    const d = new Date('2026-11-16T11:00:00Z');
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: { emoji: '🔥', senderId: '20', createdAt: d },
      }),
    ]);
    expect(
      await contacts.applyLastMessageUpdatesBatch(USER, [
        {
          contactId: '20',
          lastMessage: { emoji: 'a', createdAt: new Date(d.getTime() - 1000) },
        },
      ])
    ).toBe(false);
  });
});

describe('remoção, edição e limpeza', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('clearContactLastMessage zera só o contato alvo', async () => {
    const d = new Date();
    await contacts.saveContactsToStorage(USER, [
      contact('20', {
        lastMessage: { emoji: 'a', senderId: '20', createdAt: d },
      }),
      contact('30', {
        lastMessage: { emoji: 'b', senderId: '30', createdAt: d },
      }),
    ]);
    await contacts.clearContactLastMessage(USER, '20');
    const byId = Object.fromEntries(stored().map(c => [c.id, c]));
    expect(byId['20'].lastMessage).toBeNull();
    expect(byId['30'].lastMessage.emoji).toBe('b');
  });

  it('removeContact remove só localmente — nunca chama a API de relacionamento', async () => {
    await contacts.saveContactsToStorage(USER, [contact('20'), contact('30')]);
    expect(await contacts.removeContact(USER, '20')).toBe(true);
    expect(stored().map(c => c.id)).toEqual(['30']);
    // O id "10_20" viraria parseInt → 10 e apagaria o relacionamento ERRADO.
    expect(relationships.removeRelationship).not.toHaveBeenCalled();
  });

  it('removeContact com ids inválidos → false', async () => {
    expect(await contacts.removeContact('', '20')).toBe(false);
    expect(await contacts.removeContact(USER, '  ')).toBe(false);
  });

  it('updateContactData mescla apelido/emoji', async () => {
    await contacts.saveContactsToStorage(USER, [contact('20')]);
    await contacts.updateContactData(USER, '20', { nickname: 'Ana' });
    expect(stored()[0].nickname).toBe('Ana');
    expect(stored()[0].profileEmoji).toBe('🐱');
  });

  it('updateContactInStorage: inexistente → false; sem data na lastMessage → agora', async () => {
    await contacts.saveContactsToStorage(USER, [contact('20')]);
    expect(await contacts.updateContactInStorage(USER, contact('99'))).toBe(
      false
    );
    expect(
      await contacts.updateContactInStorage(
        USER,
        contact('20', { lastMessage: { emoji: 'a', senderId: '20' } })
      )
    ).toBe(true);
    expect(typeof stored()[0].lastMessage.createdAt).toBe('number');
  });
});

let mockHour = 0;
describe('notifyContactsChanged', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // isola do throttle/debounce deixado pelos testes anteriores
    jest.setSystemTime(Date.now() + 3_600_000 * ++mockHour);
    jest.advanceTimersByTime(5_000);
    CM.notifyContactsChanged.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('uma rajada de mudanças vira UM recarregamento no ContactsManager', () => {
    contacts.notifyContactsChanged();
    contacts.notifyContactsChanged(true);
    contacts.notifyContactsChanged();
    jest.advanceTimersByTime(2000);
    expect(CM.notifyContactsChanged).toHaveBeenCalledTimes(1);
    expect(CM.notifyContactsChanged).toHaveBeenCalledWith(true);
  });

  it('mudanças separadas no tempo geram um recarregamento cada', () => {
    contacts.notifyContactsChanged();
    jest.advanceTimersByTime(2000);
    contacts.notifyContactsChanged();
    jest.advanceTimersByTime(2000);
    expect(CM.notifyContactsChanged).toHaveBeenCalledTimes(2);
  });
});
