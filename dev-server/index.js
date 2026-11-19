#!/usr/bin/env node
/**
 * Servidor falso do Zoji para desenvolvimento.
 *
 * Imita a API real (HTTP na porta 8080 e WebSocket na 8082) com dados em
 * memória, para quem contribui com o app conseguir rodá-lo sem a API de
 * produção: nada de conta real, SMS ou push. Tudo é apagado quando o
 * processo para.
 *
 *   npm run dev-server
 *
 * Login: qualquer número no formato +55..., código 123456.
 * Os amigos falsos (Ana e Beto) respondem às mensagens com um emoji.
 *
 * Os formatos das respostas seguem a API real. Se o app passar a usar um
 * campo ou endpoint novo, atualize aqui também.
 */

/* global setTimeout, URL */
/* eslint-disable no-console */

'use strict';

const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const HTTP_PORT = Number(process.env.DEV_SERVER_PORT || 8080);
const WS_PORT = 8082; // o app deriva ws://host:8082 de http://host:porta
const OTP_CODE = '123456';
const BOT_REPLY_MS = 1500;

// ─── Dados em memória ──────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const sqlDate = (d = new Date()) =>
  d.toISOString().replace('T', ' ').slice(0, 19);
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(24).toString('hex');

const db = {
  seq: { user: 100, rel: 100, msg: 1000, group: 10, groupMsg: 5000 },
  users: new Map(), // id → user
  relationships: [], // { id, a, b, status, initiated_by, rejected_by, blocked_by, ... }
  messages: [], // conversas 1:1 (efêmeras: somem quando o destinatário lê)
  statuses: new Map(), // userId → { emoji, created_at, expires_at }
  blocks: [], // { blocker, blocked }
  groups: [], // { id, name, emoji, creator_id, created_at, members: [{ user_id, role, is_muted, joined_at }] }
  groupMessages: [],
  accessTokens: new Map(), // token → userId
  refreshTokens: new Map(), // token → userId
  shareTokens: new Map(), // token → { userId, expires_at, used }
};

function addUser({ id, phone, nickname, emoji, bot = false }) {
  const user = {
    id,
    phone_number: phone,
    phone_hash: sha256(phone),
    nickname,
    profile_emoji: emoji,
    profile_complete: Boolean(nickname && emoji),
    push_token: null,
    require_consent: false,
    created_at: sqlDate(),
    deleted_at: null,
    is_system_bot: false,
    fake_friend: bot,
  };
  db.users.set(id, user);
  return user;
}

// Amigos falsos: aceitam tudo e respondem às mensagens.
addUser({
  id: 2,
  phone: '+5511900000002',
  nickname: 'Ana',
  emoji: '🐱',
  bot: true,
});
addUser({
  id: 3,
  phone: '+5511900000003',
  nickname: 'Beto',
  emoji: '🐶',
  bot: true,
});
addUser({
  id: 4,
  phone: '+5511900000004',
  nickname: 'Caio',
  emoji: '🦊',
  bot: true,
});

const in1h = () => sqlDate(new Date(Date.now() + 3600_000));
db.statuses.set(2, { emoji: '☕', created_at: sqlDate(), expires_at: in1h() });
db.statuses.set(3, { emoji: '🎮', created_at: sqlDate(), expires_at: in1h() });

/** Cria o "mundo" de um usuário novo: dois amigos, um pedido e um grupo. */
function seedFor(userId) {
  addRelationship(userId, 2, 'accepted', 2);
  addRelationship(userId, 3, 'accepted', 3);
  addRelationship(userId, 4, 'pending', 4);
  sendDirect(2, userId, '👋');
  sendDirect(3, userId, '🎉');
  const group = createGroup(2, 'Turma', '🎈', [userId, 3]);
  sendGroup(group.id, 3, '🥳');
}

// ─── Regras de domínio ─────────────────────────────────────────────────────

function pair(x, y) {
  return [Math.min(x, y), Math.max(x, y)];
}

function findRelationship(x, y) {
  const [a, b] = pair(x, y);
  return db.relationships.find(r => r.a === a && r.b === b);
}

function addRelationship(x, y, status, initiatedBy) {
  const [a, b] = pair(x, y);
  const rel = {
    id: ++db.seq.rel,
    a,
    b,
    status,
    initiated_by: initiatedBy,
    rejected_by: null,
    blocked_by: null,
    last_interaction_at: sqlDate(),
    created_at: sqlDate(),
    updated_at: sqlDate(),
  };
  db.relationships.push(rel);
  return rel;
}

function formatRelationship(rel, me) {
  const other = db.users.get(rel.a === me ? rel.b : rel.a);
  return {
    id: rel.id,
    status: rel.status,
    initiated_by: rel.initiated_by,
    rejected_by: rel.rejected_by,
    blocked_by: rel.blocked_by,
    contact: {
      id: other.id,
      nickname: other.nickname,
      profile_emoji: other.profile_emoji,
      phone_hash: other.phone_hash,
      deleted: Boolean(other.deleted_at),
      is_system_bot: other.is_system_bot,
    },
    last_interaction_at: rel.last_interaction_at,
    created_at: rel.created_at,
    updated_at: rel.updated_at,
  };
}

function formatUser(u, full = false) {
  const base = {
    id: u.id,
    phone_number: u.phone_number,
    nickname: u.nickname,
    profile_emoji: u.profile_emoji,
    profile_complete: u.profile_complete,
  };
  if (!full) return base;
  return {
    ...base,
    push_token: u.push_token,
    require_consent: u.require_consent,
    created_at: u.created_at,
  };
}

function sendDirect(senderId, receiverId, emoji, senderEmoji) {
  const sender = db.users.get(senderId);
  const msg = {
    id: ++db.seq.msg,
    sender_id: senderId,
    receiver_id: receiverId,
    emoji,
    sender_emoji: senderEmoji || sender?.profile_emoji || null,
    read_at: null,
    created_at: now(),
  };
  db.messages.push(msg);
  const rel = findRelationship(senderId, receiverId);
  if (rel) rel.last_interaction_at = sqlDate();

  const payload = {
    id: msg.id,
    sender_id: senderId,
    receiver_id: receiverId,
    emoji,
    sender_emoji: msg.sender_emoji,
    created_at: msg.created_at,
  };
  notify(receiverId, 'message.new', payload);
  notify(senderId, 'message.new', { ...payload, contact_id: receiverId });

  const receiver = db.users.get(receiverId);
  if (receiver?.fake_friend) {
    setTimeout(
      () => sendDirect(receiverId, senderId, botReply(emoji)),
      BOT_REPLY_MS
    );
  }
  return msg;
}

const REPLIES = ['😂', '❤️', '👍', '😮', '🙌', '🤔', '😎', '🥰'];
function botReply(received) {
  return REPLIES[[...received].length % REPLIES.length];
}

function createGroup(creatorId, name, emoji, memberIds) {
  const joined = sqlDate();
  const ids = [creatorId, ...memberIds.filter(id => id !== creatorId)];
  const group = {
    id: ++db.seq.group,
    name,
    emoji,
    creator_id: creatorId,
    created_at: joined,
    members: ids.map(id => ({
      user_id: id,
      role: id === creatorId ? 'admin' : 'member',
      is_muted: false,
      joined_at: joined,
    })),
  };
  db.groups.push(group);
  for (const id of ids) {
    if (id !== creatorId) {
      notify(id, 'group.created', {
        group_id: group.id,
        group_name: name,
        group_emoji: emoji,
      });
    }
  }
  return group;
}

function memberOf(group, userId) {
  return group.members.find(m => m.user_id === userId);
}

function formatGroup(group, me, withMembers = false) {
  const mine = memberOf(group, me);
  const last = db.groupMessages.filter(m => m.group_id === group.id).at(-1);
  const out = {
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    creator_id: group.creator_id,
    created_at: group.created_at,
    member_count: group.members.length,
    role: mine?.role ?? 'member',
    is_muted: mine?.is_muted ?? false,
    last_emoji: last?.emoji ?? null,
    last_sender_id: last?.sender_id ?? null,
    last_sender_emoji: last?.sender_emoji ?? null,
    last_sender_nickname: last?.sender_nickname ?? null,
    last_message_at: last?.created_at ?? null,
  };
  if (withMembers) {
    out.members = group.members.map(m => {
      const u = db.users.get(m.user_id);
      return {
        ...m,
        nickname: u?.nickname ?? '',
        profile_emoji: u?.profile_emoji ?? '❓',
      };
    });
  }
  return out;
}

function sendGroup(groupId, senderId, emoji, senderEmoji) {
  const group = db.groups.find(g => g.id === groupId);
  const sender = db.users.get(senderId);
  const msg = {
    id: ++db.seq.groupMsg,
    group_id: groupId,
    sender_id: senderId,
    sender_nickname: sender?.nickname ?? '',
    sender_emoji: senderEmoji || sender?.profile_emoji || null,
    emoji,
    created_at: now(),
  };
  db.groupMessages.push(msg);
  for (const m of group.members) {
    if (m.user_id === senderId) continue;
    notify(m.user_id, 'group.message.new', {
      ...msg,
      group_name: group.name,
      group_emoji: group.emoji,
    });
  }
  return msg;
}

// ─── WebSocket ─────────────────────────────────────────────────────────────

const sockets = new Map(); // userId → Set<ws>

function notify(userId, type, payload) {
  for (const ws of sockets.get(userId) ?? []) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, payload }));
  }
}

function attach(ws, userId) {
  if (ws.userId) sockets.get(ws.userId)?.delete(ws);
  ws.userId = userId;
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(ws);
}

const wss = new WebSocketServer({ port: WS_PORT });
wss.on('connection', (ws, req) => {
  const send = (type, payload = {}) =>
    ws.send(JSON.stringify({ type, payload }));
  const token = new URL(req.url, 'http://x').searchParams.get('token');
  if (token) {
    const userId = db.accessTokens.get(token);
    if (!userId)
      return send('error', { message: 'Token inválido ou expirado' });
    attach(ws, userId);
    send('connected', { user_id: userId });
  }
  ws.on('message', raw => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (data.type === 'ping') return send('pong');
    console.log(`WS ${data.type}`);
    if (data.type === 'auth') {
      const userId = db.accessTokens.get(data.token);
      if (!userId) return send('error', { message: 'Token inválido' });
      attach(ws, userId);
      send('connected', { user_id: userId });
      send('auth_ok', { user_id: userId });
      return;
    }
    if (!ws.userId) return;
    // A lista de conversas pede a última mensagem de cada conversa ao abrir
    // e a cada reconexão (igual à API real).
    if (data.type === 'sync.last_messages') {
      const me = ws.userId;
      const latest = new Map();
      for (const m of db.messages) {
        if (m.sender_id !== me && m.receiver_id !== me) continue;
        const other = m.sender_id === me ? m.receiver_id : m.sender_id;
        latest.set(other, m);
      }
      for (const [contactId, m] of latest) {
        send('message.new', {
          id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          emoji: m.emoji,
          sender_emoji: m.sender_emoji,
          created_at: m.created_at,
          contact_id: contactId,
        });
      }
      return;
    }
    if (data.type === 'typing.start' || data.type === 'typing.stop') {
      notify(Number(data.payload?.to), data.type, { from: ws.userId });
    }
  });
  ws.on('close', () => ws.userId && sockets.get(ws.userId)?.delete(ws));
});

// ─── HTTP ──────────────────────────────────────────────────────────────────

const routes = [];
const route = (method, pattern, handler, auth = true) => {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$'
  );
  routes.push({ method, re, keys, handler, auth });
};

class HttpError extends Error {
  constructor(status, body) {
    super(body.error || String(status));
    this.status = status;
    this.body = body;
  }
}
const fail = (status, error, extra = {}) => {
  throw new HttpError(status, { error, ...extra });
};

function issueTokens(userId) {
  const access = `dev-access-${randomToken()}`;
  const refresh = `dev-refresh-${randomToken()}`;
  db.accessTokens.set(access, userId);
  db.refreshTokens.set(refresh, userId);
  return { access_token: access, refresh_token: refresh };
}

// Auth
route(
  'POST',
  '/auth/send-code',
  ({ body }) => {
    if (!body.phone_number) fail(422, 'Número de telefone obrigatório');
    if (!/^\+\d{10,15}$/.test(body.phone_number)) {
      fail(422, 'Número inválido. Use o formato internacional: +5511999999999');
    }
    console.log(`[dev-server] código para ${body.phone_number}: ${OTP_CODE}`);
    return [200, { message: 'Código enviado com sucesso', channel: 'sms' }];
  },
  false
);

route(
  'POST',
  '/auth/verify-code',
  ({ body }) => {
    if (!body.phone_number || !/^\d{6}$/.test(body.code || '')) {
      fail(422, 'Telefone e código de 6 dígitos são obrigatórios');
    }
    if (body.code !== OTP_CODE) fail(401, 'Código inválido ou expirado');
    let user = [...db.users.values()].find(
      u => u.phone_number === body.phone_number && !u.deleted_at
    );
    if (!user) {
      user = addUser({
        id: ++db.seq.user,
        phone: body.phone_number,
        nickname: null,
        emoji: null,
      });
      seedFor(user.id);
    }
    return [200, { ...issueTokens(user.id), user: formatUser(user) }];
  },
  false
);

route(
  'POST',
  '/auth/refresh',
  ({ body }) => {
    if (!body.refresh_token) fail(422, 'refresh_token obrigatório');
    const userId = db.refreshTokens.get(body.refresh_token);
    if (!userId) fail(401, 'Refresh token inválido ou expirado');
    db.refreshTokens.delete(body.refresh_token);
    return [
      200,
      { ...issueTokens(userId), user: formatUser(db.users.get(userId)) },
    ];
  },
  false
);

route(
  'POST',
  '/auth/logout',
  ({ body }) => {
    db.refreshTokens.delete(body.refresh_token);
    return [200, { message: 'Logout realizado com sucesso' }];
  },
  false
);
route('POST', '/auth/logout-all', () => [
  200,
  { message: 'Todas as sessões foram encerradas' },
]);

// App
route('GET', '/health', () => [200, { status: 'ok', dev: true }], false);
route(
  'GET',
  '/app/config',
  () => [
    200,
    {
      min_version: '0.0.0',
      latest_version: '0.0.0',
      store_urls: {
        ios: 'https://apps.apple.com/search?term=zoji',
        android:
          'https://play.google.com/store/apps/details?id=dev.de4araujo.zoji',
      },
      event_mode: false,
    },
  ],
  false
);
route('GET', '/app/public-stats', () => [200, { users: db.users.size }], false);
route('GET', '/app/banners', () => [200, []], false);
route(
  'GET',
  '/app/banner/preview/:id',
  () => fail(404, 'Banner não encontrado'),
  false
);

// Perfil
route('GET', '/user/profile', ({ me }) => [
  200,
  formatUser(db.users.get(me), true),
]);
route('PUT', '/user/profile', ({ me, body }) => {
  const user = db.users.get(me);
  const allowed = [
    'nickname',
    'profile_emoji',
    'profile_complete',
    'push_token',
    'widget_push_token',
    'require_consent',
    'app_version',
  ];
  const fields = allowed.filter(f => f in body);
  if (!fields.length) fail(422, 'Nenhum campo para atualizar');
  for (const f of fields) user[f] = body[f];
  user.profile_complete = Boolean(user.profile_complete);
  if ('nickname' in body || 'profile_emoji' in body) {
    for (const rel of db.relationships.filter(r => r.a === me || r.b === me)) {
      notify(rel.a === me ? rel.b : rel.a, 'profile.updated', {
        user_id: me,
        nickname: user.nickname,
        profile_emoji: user.profile_emoji,
      });
    }
  }
  return [200, formatUser(user, true)];
});
route('DELETE', '/user/account', ({ me }) => {
  const user = db.users.get(me);
  user.deleted_at = sqlDate();
  user.phone_number = `deleted-${me}`;
  return [200, { message: 'Conta excluída com sucesso' }];
});
route('GET', '/user/oauth-connections', () => [200, []]);
route('DELETE', '/user/oauth-connections/:id', () => [
  200,
  { message: 'Conexão revogada' },
]);

// Relacionamentos
route('GET', '/relationships', ({ me }) => [
  200,
  db.relationships
    .filter(r => r.a === me || r.b === me)
    .map(r => formatRelationship(r, me)),
]);
route('POST', '/relationships', ({ me, body }) => {
  if (!body.phone_number) fail(422, 'phone_number obrigatório');
  const target = [...db.users.values()].find(
    u => u.phone_number === body.phone_number
  );
  if (!target) return [202, { status: 'pending' }];
  if (target.id === me) fail(422, 'Não é possível adicionar a si mesmo');
  const existing = findRelationship(me, target.id);
  // Igual à API: um pedido recusado é reaberto como pedido novo.
  if (existing && existing.status !== 'rejected')
    fail(409, 'Relacionamento já existe', { relationship: existing });
  const status = target.fake_friend ? 'accepted' : 'pending';
  let rel = existing;
  if (rel) {
    Object.assign(rel, {
      status,
      initiated_by: me,
      rejected_by: null,
      blocked_by: null,
      last_interaction_at: sqlDate(),
      updated_at: sqlDate(),
    });
  } else {
    rel = addRelationship(me, target.id, status, me);
  }
  notify(target.id, 'relationship.updated', {
    relationship_id: rel.id,
    status: rel.status,
    updated_by: me,
  });
  return [202, { status: 'pending' }];
});
route('PUT', '/relationships/:id', ({ me, params, body }) => {
  const rel = db.relationships.find(
    r => r.id === Number(params.id) && (r.a === me || r.b === me)
  );
  if (!rel) fail(404, 'Relacionamento não encontrado');
  const actions = { accept: 'accepted', reject: 'rejected', block: 'blocked' };
  const status = actions[body.action];
  if (!status) fail(422, 'action inválida. Use: accept, reject ou block');
  if (body.action === 'accept' && rel.initiated_by === me) {
    fail(422, 'Não é possível aceitar o próprio pedido');
  }
  rel.status = status;
  if (status === 'rejected') rel.rejected_by = me;
  if (status === 'blocked') rel.blocked_by = me;
  rel.updated_at = sqlDate();
  notify(rel.a === me ? rel.b : rel.a, 'relationship.updated', {
    relationship_id: rel.id,
    status,
    updated_by: me,
  });
  return [200, rel];
});
route('DELETE', '/relationships/:id', ({ me, params }) => {
  const i = db.relationships.findIndex(
    r => r.id === Number(params.id) && (r.a === me || r.b === me)
  );
  if (i < 0) fail(404, 'Relacionamento não encontrado');
  db.relationships.splice(i, 1);
  return [200, { message: 'Relacionamento removido' }];
});

// Contatos
const byHashes = (me, hashes) => {
  if (!Array.isArray(hashes))
    fail(422, 'phone_hashes obrigatório e deve ser um array');
  return [...db.users.values()]
    .filter(u => u.id !== me && !u.deleted_at && hashes.includes(u.phone_hash))
    .map(u => ({
      id: u.id,
      nickname: u.nickname,
      profile_emoji: u.profile_emoji,
      phone_hash: u.phone_hash,
    }));
};
route('POST', '/contacts/sync', ({ me, body }) => [
  200,
  byHashes(me, body.phone_hashes),
]);
route('POST', '/contacts/discover', ({ me, body }) => [
  200,
  byHashes(me, body.phone_hashes ?? []),
]);
route('POST', '/contacts/deleted-hashes', () => [200, { deleted_hashes: [] }]);
route('GET', '/contacts/blocked', ({ me }) => [
  200,
  db.blocks
    .filter(b => b.blocker === me)
    .map(b => {
      const u = db.users.get(b.blocked);
      return { id: u.id, nickname: u.nickname, profile_emoji: u.profile_emoji };
    }),
]);
route('GET', '/contacts/:id/profile', ({ params }) => {
  const u = db.users.get(Number(params.id));
  if (!u) fail(404, 'Contato não encontrado');
  return [
    200,
    {
      id: u.id,
      nickname: u.nickname,
      profile_emoji: u.profile_emoji,
      deleted: Boolean(u.deleted_at),
      is_system_bot: u.is_system_bot,
    },
  ];
});
route('GET', '/contacts/:id/block-status', ({ me, params }) => {
  const other = Number(params.id);
  return [
    200,
    {
      blocked_by_me: db.blocks.some(
        b => b.blocker === me && b.blocked === other
      ),
      blocked_by_them: db.blocks.some(
        b => b.blocker === other && b.blocked === me
      ),
    },
  ];
});
route('POST', '/contacts/:id/block', ({ me, params }) => {
  const other = Number(params.id);
  if (other === me) fail(422, 'Não é possível bloquear a si mesmo');
  if (!db.blocks.some(b => b.blocker === me && b.blocked === other)) {
    db.blocks.push({ blocker: me, blocked: other });
  }
  return [200, { message: 'Usuário bloqueado' }];
});
route('DELETE', '/contacts/:id/block', ({ me, params }) => {
  db.blocks = db.blocks.filter(
    b => !(b.blocker === me && b.blocked === Number(params.id))
  );
  return [200, { message: 'Usuário desbloqueado' }];
});

// Emojis
route(
  'GET',
  '/emoji-keywords',
  () => [
    200,
    {
      keywords: {
        '😂': { pt: ['rir', 'risada'], es: ['reír'], en: ['laugh'] },
        '❤️': { pt: ['amor', 'coração'], es: ['amor'], en: ['love', 'heart'] },
        '👍': { pt: ['ok', 'joia'], es: ['bien'], en: ['ok', 'thumbs up'] },
      },
    },
  ],
  false
);
route('GET', '/emoji-blocklist', () => [200, { emojis: [] }], false);

// Denúncias e QR
route('POST', '/reports', ({ me, body }) => {
  const reported = Number(body.reported_id || 0);
  if (reported <= 0) fail(422, 'ID do usuário denunciado é obrigatório');
  if (reported === me) fail(422, 'Você não pode se denunciar');
  console.log('[dev-server] denúncia recebida:', body);
  return [201, { message: 'Denúncia registrada' }];
});
route('POST', '/share-token', ({ me }) => {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = sqlDate(new Date(Date.now() + 10 * 60_000));
  db.shareTokens.set(token, { userId: me, expires_at: expiresAt, used: false });
  return [200, { token, expiresAt }];
});
route('GET', '/share-token/:token', ({ params }) => {
  const t = db.shareTokens.get(params.token);
  if (!t) fail(404, 'Token inválido');
  if (t.used) fail(410, 'Token já utilizado');
  t.used = true;
  const u = db.users.get(t.userId);
  return [
    200,
    {
      phoneNumber: u.phone_number,
      userId: u.id,
      nickname: u.nickname,
      profileEmoji: u.profile_emoji,
    },
  ];
});

// Status
route('GET', '/status/friends', ({ me }) => {
  const own = db.statuses.get(me);
  const friendIds = db.relationships
    .filter(r => r.status === 'accepted' && (r.a === me || r.b === me))
    .map(r => (r.a === me ? r.b : r.a));
  const friends = friendIds
    .filter(id => db.statuses.has(id))
    .map(id => {
      const u = db.users.get(id);
      const s = db.statuses.get(id);
      return {
        userId: id,
        nickname: u.nickname,
        profileEmoji: u.profile_emoji,
        statusEmoji: s.emoji,
        statusCreatedAt: s.created_at,
        statusExpiresAt: s.expires_at,
      };
    });
  return [
    200,
    {
      own: own ? { emoji: own.emoji, expiresAt: own.expires_at } : null,
      friends,
    },
  ];
});
route('POST', '/status', ({ me, body }) => {
  if (!body.emoji) fail(422, 'emoji é obrigatório');
  db.statuses.set(me, {
    emoji: body.emoji,
    created_at: sqlDate(),
    expires_at: in1h(),
  });
  return [200, { ok: true }];
});
route('DELETE', '/status', ({ me }) => {
  db.statuses.delete(me);
  return [200, { ok: true }];
});

// Mensagens 1:1
route('POST', '/messages', ({ me, body }) => {
  const receiverId = Number(body.receiver_id || 0);
  const emoji = String(body.emoji || '').trim();
  if (!receiverId || !emoji) fail(422, 'receiver_id e emoji são obrigatórios');
  if (db.users.get(receiverId)?.deleted_at) fail(403, 'account_deleted');
  const msg = sendDirect(
    me,
    receiverId,
    emoji,
    String(body.sender_emoji || '').trim()
  );
  return [201, msg];
});
route('PUT', '/messages/read', ({ me, body }) => {
  const senderId = Number(body.sender_id || 0);
  if (!senderId) fail(422, 'sender_id obrigatório');
  db.messages = db.messages.filter(
    m => !(m.sender_id === senderId && m.receiver_id === me)
  );
  return [200, { message: 'Mensagens marcadas como lidas' }];
});
route('DELETE', '/messages/:id/recall', ({ me, params }) => {
  const id = Number(params.id);
  const msg = db.messages.find(m => m.id === id && m.sender_id === me);
  if (!msg) fail(404, 'Mensagem não encontrada ou fora do prazo de exclusão');
  db.messages = db.messages.filter(m => m.id !== id);
  notify(msg.receiver_id, 'message.deleted', { message_id: id, sender_id: me });
  return [200, { message: 'Mensagem excluída' }];
});
route('GET', '/messages/:id', ({ me, params, query }) => {
  const other = Number(params.id);
  const limit = Math.min(Number(query.get('limit') || 50), 100);
  const before = query.get('before');
  const list = db.messages
    .filter(
      m =>
        (m.sender_id === me && m.receiver_id === other) ||
        (m.sender_id === other && m.receiver_id === me)
    )
    .filter(m => !before || m.created_at < before)
    .slice(-limit);
  return [200, list];
});
route('DELETE', '/messages/:id', ({ me, params }) => {
  const other = Number(params.id);
  db.messages = db.messages.filter(
    m =>
      !(
        (m.sender_id === me && m.receiver_id === other) ||
        (m.sender_id === other && m.receiver_id === me)
      )
  );
  return [200, { message: 'Conversa apagada' }];
});

// Grupos
const groupFor = (me, id) => {
  const g = db.groups.find(x => x.id === Number(id));
  if (!g || !memberOf(g, me)) fail(404, 'Grupo não encontrado');
  return g;
};
const requireAdmin = (g, me) => {
  if (memberOf(g, me)?.role !== 'admin') fail(403, 'Apenas administradores');
};
route('GET', '/groups', ({ me }) => [
  200,
  db.groups.filter(g => memberOf(g, me)).map(g => formatGroup(g, me)),
]);
route('POST', '/groups', ({ me, body }) => {
  if (!body.name || !body.emoji) fail(422, 'name e emoji são obrigatórios');
  const g = createGroup(
    me,
    body.name,
    body.emoji,
    (body.member_ids || []).map(Number)
  );
  return [201, formatGroup(g, me, true)];
});
route('GET', '/groups/:id', ({ me, params }) => [
  200,
  formatGroup(groupFor(me, params.id), me, true),
]);
route('PUT', '/groups/:id', ({ me, params, body }) => {
  const g = groupFor(me, params.id);
  requireAdmin(g, me);
  if (body.name) g.name = body.name;
  if (body.emoji) g.emoji = body.emoji;
  return [200, formatGroup(g, me, true)];
});
route('DELETE', '/groups/:id', ({ me, params }) => {
  const g = groupFor(me, params.id);
  requireAdmin(g, me);
  db.groups = db.groups.filter(x => x.id !== g.id);
  return [200, { message: 'Grupo apagado' }];
});
route('POST', '/groups/:id/leave', ({ me, params }) => {
  const g = groupFor(me, params.id);
  g.members = g.members.filter(m => m.user_id !== me);
  return [200, { message: 'Você saiu do grupo' }];
});
route('POST', '/groups/:id/members', ({ me, params, body }) => {
  const g = groupFor(me, params.id);
  requireAdmin(g, me);
  const uid = Number(body.user_id);
  if (!memberOf(g, uid)) {
    g.members.push({
      user_id: uid,
      role: 'member',
      is_muted: false,
      joined_at: sqlDate(),
    });
    notify(uid, 'group.created', {
      group_id: g.id,
      group_name: g.name,
      group_emoji: g.emoji,
    });
  }
  return [200, { message: 'Membro adicionado' }];
});
route('DELETE', '/groups/:gid/members/:uid', ({ me, params }) => {
  const g = groupFor(me, params.gid);
  requireAdmin(g, me);
  const uid = Number(params.uid);
  g.members = g.members.filter(m => m.user_id !== uid);
  notify(uid, 'group.member_removed', { group_id: g.id });
  return [200, { message: 'Membro removido' }];
});
const setMember =
  (field, value, message) =>
  ({ me, params }) => {
    const g = groupFor(me, params.gid);
    requireAdmin(g, me);
    const m = memberOf(g, Number(params.uid));
    if (!m) fail(404, 'Membro não encontrado');
    m[field] = value;
    return [200, { message }];
  };
route(
  'POST',
  '/groups/:gid/members/:uid/promote',
  setMember('role', 'admin', 'Administrador promovido com sucesso')
);
route(
  'POST',
  '/groups/:gid/members/:uid/mute',
  setMember('is_muted', true, 'Membro silenciado')
);
route(
  'POST',
  '/groups/:gid/members/:uid/unmute',
  setMember('is_muted', false, 'Silêncio removido')
);
route('GET', '/groups/:id/messages', ({ me, params, query }) => {
  const g = groupFor(me, params.id);
  const limit = Math.min(Number(query.get('limit') || 50), 100);
  const before = query.get('before');
  return [
    200,
    db.groupMessages
      .filter(m => m.group_id === g.id && (!before || m.created_at < before))
      .slice(-limit),
  ];
});
route('POST', '/groups/:id/messages', ({ me, params, body }) => {
  const g = groupFor(me, params.id);
  if (memberOf(g, me).is_muted) fail(403, 'Você está silenciado neste grupo');
  const emoji = String(body.emoji || '').trim();
  if (!emoji) fail(422, 'emoji é obrigatório');
  return [
    201,
    sendGroup(g.id, me, emoji, String(body.sender_emoji || '').trim()),
  ];
});
route('DELETE', '/groups/messages/:id/recall', ({ me, params }) => {
  const id = Number(params.id);
  const msg = db.groupMessages.find(m => m.id === id && m.sender_id === me);
  if (!msg) fail(404, 'Mensagem não encontrada');
  db.groupMessages = db.groupMessages.filter(m => m.id !== id);
  const g = db.groups.find(x => x.id === msg.group_id);
  for (const m of g?.members ?? []) {
    notify(m.user_id, 'group.message.deleted', {
      message_id: id,
      group_id: msg.group_id,
    });
  }
  return [200, { message: 'Mensagem excluída' }];
});

// Jogo
const QUESTIONS = [
  { emoji: '🍕', answer: 'pizza', options: ['pizza', 'bolo', 'pão', 'queijo'] },
  {
    emoji: '⚽',
    answer: 'futebol',
    options: ['tênis', 'futebol', 'vôlei', 'golfe'],
  },
  { emoji: '🌧️', answer: 'chuva', options: ['sol', 'neve', 'chuva', 'vento'] },
];
const scores = new Map(); // userId → { score, correct, total }
route('GET', '/game/question', () => [
  200,
  QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)],
]);
route('POST', '/game/score', ({ me, body }) => {
  const prev = scores.get(me) ?? { score: 0, correct: 0, total: 0 };
  scores.set(me, {
    score: prev.score + Number(body.score || 0),
    correct: prev.correct + Number(body.correct || 0),
    total: prev.total + Number(body.total || 0),
  });
  return [200, { ok: true }];
});
route('GET', '/game/ranking', ({ me }) => {
  const ranking = [...scores.entries()]
    .map(([id, s]) => {
      const u = db.users.get(id);
      return {
        user_id: id,
        nickname: u.nickname,
        profile_emoji: u.profile_emoji,
        ...s,
        is_friend: false,
      };
    })
    .sort((x, y) => y.score - x.score);
  const myIndex = ranking.findIndex(r => r.user_id === me);
  const section = {
    ranking,
    my_rank: myIndex >= 0 ? myIndex + 1 : null,
    my_entry: myIndex >= 0 ? ranking[myIndex] : null,
  };
  const today = sqlDate().slice(0, 10);
  return [
    200,
    {
      date: today,
      since: today,
      my_user_id: me,
      today: section,
      alltime: section,
    },
  ];
});
route('GET', '/game/stats', ({ me }) => [
  200,
  scores.get(me) ?? { score: 0, correct: 0, total: 0 },
]);

// ─── Servidor ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const reply = (status, body) => {
    if (req.method !== 'OPTIONS') {
      console.log(`${req.method} ${url.pathname} → ${status}`);
    }
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return reply(204, {});

  const match = routes
    .map(r => ({ r, m: r.method === req.method && url.pathname.match(r.re) }))
    .find(x => x.m);
  if (!match) {
    console.warn(
      `[dev-server] rota não implementada: ${req.method} ${url.pathname}`
    );
    return reply(404, {
      error: 'Rota não implementada no servidor de desenvolvimento',
    });
  }

  try {
    let me = null;
    if (match.r.auth) {
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      me = db.accessTokens.get(token) ?? null;
      if (!me) fail(401, 'Token inválido ou expirado');
    }
    const params = Object.fromEntries(
      match.r.keys.map((k, i) => [k, match.m[i + 1]])
    );
    const body = ['POST', 'PUT', 'DELETE'].includes(req.method)
      ? await readBody(req)
      : {};
    const [status, payload] = match.r.handler({
      me,
      params,
      body,
      query: url.searchParams,
    });
    reply(status, payload);
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, e.body);
    console.error('[dev-server] erro:', e);
    reply(500, { error: 'Erro interno do servidor de desenvolvimento' });
  }
});

server.listen(HTTP_PORT, () => {
  console.log(`[dev-server] API falsa em http://localhost:${HTTP_PORT}`);
  console.log(`[dev-server] WebSocket em ws://localhost:${WS_PORT}`);
  console.log(`[dev-server] login: qualquer número +55..., código ${OTP_CODE}`);
});
