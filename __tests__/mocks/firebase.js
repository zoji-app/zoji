/* eslint-env jest, node */

// Mock moderno do Firebase para a nova estrutura
const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    phoneNumber: '+5511999999999',
    displayName: 'Test User',
  },
};

const mockDb = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ nickname: 'Test User', profileEmoji: '😊' }),
        })
      ),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    })),
    add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
    where: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({
          docs: [],
          size: 0,
          empty: true,
        })
      ),
    })),
  })),
};

// Mock das funções principais do Firebase
export const mockFirebaseAuth = {
  ...mockAuth,
  signInWithCredential: jest.fn(() =>
    Promise.resolve({
      user: mockAuth.currentUser,
    })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(callback => {
    // Simula usuário logado
    setTimeout(() => callback(mockAuth.currentUser), 0);
    return jest.fn(); // Função de cleanup
  }),
};

export const mockFirebaseFirestore = {
  ...mockDb,
  doc: jest.fn(() => ({
    get: jest.fn(() =>
      Promise.resolve({
        exists: true,
        data: () => ({ test: 'data' }),
      })
    ),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  })),
  collection: mockDb.collection,
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(() =>
    Promise.resolve({
      docs: [],
      size: 0,
      empty: true,
    })
  ),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ test: 'data' }),
    })
  ),
};

export const mockFirebaseApp = {
  options: {
    projectId: 'test-project',
  },
};

// Mock do PhoneAuthProvider
export const mockPhoneAuthProvider = {
  credential: jest.fn(() => ({
    providerId: 'phone',
    signInMethod: 'phone',
  })),
  credentialFromResult: jest.fn(),
};

// Função helper para resetar todos os mocks
export const resetFirebaseMocks = () => {
  Object.values(mockFirebaseAuth).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) {
      fn.mockClear();
    }
  });

  Object.values(mockFirebaseFirestore).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) {
      fn.mockClear();
    }
  });
};

// Exportar configuração completa para jest.mock
export const firebaseMockConfig = {
  'firebase/app': {
    initializeApp: jest.fn(() => mockFirebaseApp),
    getApps: jest.fn(() => [mockFirebaseApp]),
  },
  'firebase/auth': {
    getAuth: jest.fn(() => mockFirebaseAuth),
    initializeAuth: jest.fn(() => mockFirebaseAuth),
    getReactNativePersistence: jest.fn(),
    signInWithCredential: mockFirebaseAuth.signInWithCredential,
    onAuthStateChanged: mockFirebaseAuth.onAuthStateChanged,
    PhoneAuthProvider: mockPhoneAuthProvider,
  },
  'firebase/firestore': {
    getFirestore: jest.fn(() => mockFirebaseFirestore),
    doc: mockFirebaseFirestore.doc,
    collection: mockFirebaseFirestore.collection,
    query: mockFirebaseFirestore.query,
    where: mockFirebaseFirestore.where,
    orderBy: mockFirebaseFirestore.orderBy,
    limit: mockFirebaseFirestore.limit,
    getDocs: mockFirebaseFirestore.getDocs,
    getDoc: mockFirebaseFirestore.getDoc,
    addDoc: mockFirebaseFirestore.addDoc,
    updateDoc: mockFirebaseFirestore.updateDoc,
    deleteDoc: mockFirebaseFirestore.deleteDoc,
    onSnapshot: jest.fn((query, callback) => {
      // Simula dados iniciais
      setTimeout(
        () =>
          callback({
            docs: [],
            docChanges: () => [],
          }),
        0
      );
      return jest.fn(); // Função de cleanup
    }),
    Timestamp: {
      fromDate: jest.fn(date => ({ toDate: () => date })),
      now: jest.fn(() => ({ toDate: () => new Date() })),
    },
  },
};
