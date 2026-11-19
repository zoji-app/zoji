// Mock para Firebase Auth e getReactNativePersistence
const mockUser = {
  uid: 'test-user-id',
  phoneNumber: '+5511999999999',
  displayName: 'Test User',
  refreshToken: 'test-refresh-token',
};

const mockAuth = {
  currentUser: mockUser,
  signOut: jest.fn(() => Promise.resolve()),
};

const mockOnAuthStateChanged = jest.fn((auth, callback) => {
  callback(mockUser);
  return () => {};
});

const mockFirebaseAuth = {
  getAuth: jest.fn(() => mockAuth),
  signOut: jest.fn(() => Promise.resolve()),
  deleteUser: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(() => Promise.resolve({ user: mockUser })),
  PhoneAuthProvider: {
    credential: jest.fn((verificationId, code) => ({
      verificationId,
      code,
    })),
  },
  onAuthStateChanged: mockOnAuthStateChanged,
  initializeAuth: jest.fn(() => mockAuth),
  getReactNativePersistence: jest.fn(() => ({
    type: 'asyncStorage',
    storage: {},
  })),
};

// Mock para documentos do Firestore
const createMockDoc = (id, data) => ({
  id,
  data: () => data,
  exists: () => !!data,
  ref: { id, path: `collection/${id}` },
});

// Mock para snapshots do Firestore
const createMockSnapshot = docs => ({
  docs: docs.map(doc => createMockDoc(doc.id, doc.data)),
  docChanges: () =>
    docs.map(doc => ({
      type: 'added',
      doc: createMockDoc(doc.id, doc.data),
    })),
  forEach: callback =>
    docs.forEach(doc => callback(createMockDoc(doc.id, doc.data))),
  size: docs.length,
  empty: docs.length === 0,
});

// Mock para Firebase Firestore
const mockFirestore = {
  collection: jest.fn(path => ({
    id: path,
    path,
    doc: jest.fn(docId => ({
      id: docId,
      path: `${path}/${docId}`,
      collection: jest.fn(subPath =>
        mockFirestore.collection(`${path}/${docId}/${subPath}`)
      ),
      get: jest.fn(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ id: docId, name: 'Test Document' }),
          id: docId,
        })
      ),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    })),
  })),
  doc: jest.fn(path => ({
    id: path.split('/').pop(),
    path,
    get: jest.fn(() =>
      Promise.resolve({
        exists: true,
        data: () => ({ id: path.split('/').pop(), name: 'Test Document' }),
        id: path.split('/').pop(),
      })
    ),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  })),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ nickname: 'Test User', profileEmoji: '👨‍💻' }),
      id: 'test-doc-id',
    })
  ),
  getDocs: jest.fn(() =>
    Promise.resolve({
      docs: [
        createMockDoc('doc1', { name: 'Test Document 1' }),
        createMockDoc('doc2', { name: 'Test Document 2' }),
      ],
      forEach: callback => {
        callback(createMockDoc('doc1', { name: 'Test Document 1' }));
        callback(createMockDoc('doc2', { name: 'Test Document 2' }));
      },
      size: 2,
      empty: false,
    })
  ),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => 'mocked-query'),
  where: jest.fn(() => 'mocked-where'),
  orderBy: jest.fn(() => 'mocked-orderBy'),
  limit: jest.fn(() => 'mocked-limit'),
  startAfter: jest.fn(() => 'mocked-startAfter'),
  endBefore: jest.fn(() => 'mocked-endBefore'),
  onSnapshot: jest.fn((query, callback) => {
    // Simular um snapshot com dados
    const mockDocs = [
      {
        id: 'msg1',
        data: {
          text: 'Test message 1',
          senderId: 'user1',
          createdAt: { seconds: 1234567880 },
        },
      },
      {
        id: 'msg2',
        data: {
          text: 'Test message 2',
          senderId: 'user2',
          createdAt: { seconds: 1234567890 },
        },
      },
    ];
    callback(createMockSnapshot(mockDocs));
    return jest.fn(); // Retorna função de unsubscribe
  }),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    fromDate: jest.fn(date => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
    fromMillis: jest.fn(millis => ({
      seconds: Math.floor(millis / 1000),
      nanoseconds: (millis % 1000) * 1000000,
      toDate: () => new Date(millis),
      toMillis: () => millis,
    })),
  },
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    increment: jest.fn(value => ({ __increment: value })),
    arrayUnion: jest.fn((...elements) => ({ __arrayUnion: elements })),
    arrayRemove: jest.fn((...elements) => ({ __arrayRemove: elements })),
    delete: jest.fn(() => ({ __delete: true })),
  },
  FieldPath: {
    documentId: jest.fn(() => 'documentId'),
  },
  WriteBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
  Transaction: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
  runTransaction: jest.fn(callback =>
    Promise.resolve(
      callback({
        get: jest.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({ name: 'Test Document' }),
            id: 'test-doc-id',
          })
        ),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
    )
  ),
  getFirestore: jest.fn(() => ({})),
};

module.exports = {
  mockFirebaseAuth,
  mockFirestore,
  createMockDoc,
  createMockSnapshot,
};
