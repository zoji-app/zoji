import logger from './logger';
/**
 * Polyfill para crypto.getRandomValues no React Native
 * Isso é necessário para a biblioteca uuid funcionar corretamente
 */

// Verificar se já existe uma implementação global
if (typeof global.crypto === 'undefined') {
  // Implementar uma versão simplificada do crypto para ambientes sem suporte
  global.crypto = {
    getRandomValues(arr) {
      if (!(arr instanceof Uint8Array)) {
        throw new Error('getRandomValues precisa de um Uint8Array');
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
  logger.debug(
    '[CryptoPolyfill] Polyfill para crypto.getRandomValues instalado'
  );
} else if (typeof global.crypto.getRandomValues === 'undefined') {
  // Se crypto existe mas getRandomValues não, adicionar apenas o método
  global.crypto.getRandomValues = function (arr) {
    if (!(arr instanceof Uint8Array)) {
      throw new Error('getRandomValues precisa de um Uint8Array');
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
  logger.debug(
    '[CryptoPolyfill] Método getRandomValues adicionado ao objeto crypto existente'
  );
}

export default {
  ensureCrypto: () => {
    // Função auxiliar para outros arquivos verificarem se o polyfill está ativo
    return (
      typeof global.crypto !== 'undefined' &&
      typeof global.crypto.getRandomValues === 'function'
    );
  },
};
