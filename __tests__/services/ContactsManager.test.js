/**
 * P7-2b — caracterização do ContactsManager.getAllContacts (ordenação) e da
 * remoção do "reparo" que lia mensagens no formato legado
 * @zoji:messages:{userId}:{chatId}, que nada grava desde abr/2026.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(k =>
    Promise.resolve(k === '@zoji:user' ? JSON.stringify({ uid: '10' }) : null)
  ),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../src/services/contacts', () => ({
  loadContactsFromStorage: jest.fn().mockResolvedValue([]),
  updateContactInStorage: jest.fn().mockResolvedValue(true),
  updateContactLastMessage: jest.fn().mockResolvedValue(true),
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

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { ContactsManagerClass } = require('../../src/services/ContactsManager');

function c(id, nickname, minutesAgo, extra = {}) {
  return {
    id,
    nickname,
    profileEmoji: '🐱',
    relationshipStatus: 'accepted',
    lastMessage:
      minutesAgo === null
        ? null
        : {
            emoji: '👍',
            senderId: id,
            createdAt: new Date(Date.now() - minutesAgo * 60_000).getTime(),
          },
    ...extra,
  };
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe('ContactsManager.getAllContacts', () => {
  let cm;
  beforeEach(() => {
    jest.clearAllMocks();
    cm = new ContactsManagerClass();
    cm.initialize([
      c('1', 'Bia', null),
      c('2', 'Ana', null),
      c('3', 'Caio', 30),
      c('4', 'Duda', 5),
    ]);
  });

  it('com mensagem primeiro (mais recente no topo), depois sem mensagem por nome', () => {
    expect(cm.getAllContacts().map(x => x.nickname)).toEqual([
      'Duda',
      'Caio',
      'Ana',
      'Bia',
    ]);
  });

  it('devolve createdAt como Date', () => {
    const first = cm.getAllContacts()[0];
    expect(first.lastMessage.createdAt).toBeInstanceOf(Date);
  });

  it('não lê chaves de mensagem do AsyncStorage para "reparar" contatos', async () => {
    cm.getAllContacts();
    await flush();
    await flush();
    const msgReads = AsyncStorage.getItem.mock.calls.filter(([k]) =>
      String(k).startsWith('@zoji:messages:')
    );
    expect(msgReads).toEqual([]);
  });
});
