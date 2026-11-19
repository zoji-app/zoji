module.exports = {
  extends: ['expo', 'prettier'],
  rules: {
    // React/React Native
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Geral
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    'coverage/',
    // Arquivos legados Firebase (removidos do app, mantidos apenas como referência)
    'src/services/firebase.ts',
    'src/services/firestore.ts',
    'src/services/phoneAuth.ts',
    // Scripts utilitários
    'scripts/',
    'debug_scripts/',
    'e2e/',
  ],
  overrides: [
    // Arquivos de teste e mocks: habilitar ambiente Jest
    {
      files: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/__mocks__/**/*.[jt]s?(x)',
        '**/*.test.[jt]s?(x)',
        '**/*.spec.[jt]s?(x)',
        'jest.setup.js',
        'jest.config.js',
        'jest/**/*.js',
      ],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        'no-console': 'off',
        'prefer-const': 'warn',
        '@typescript-eslint/no-explicit-any': 'off',
        'import/no-unresolved': 'off',
        'import/namespace': 'off',
      },
    },
  ],
};
