/**
 * Fila de processamento de mensagens.
 * Controla quais mensagens estão sendo processadas para evitar reprocessamento.
 *
 * Extraído de messages.ts para separar responsabilidades:
 * - messages.ts: envio, listeners e lógica de negócio
 * - messageProcessingQueue.ts: controle de estado de processamento (AsyncStorage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Chave para persistir mensagens em processamento
const PROCESSING_MESSAGES_KEY = '@zoji:processingMessages';

/**
 * Verifica se uma mensagem está sendo processada atualmente
 */
export const isMessageBeingProcessed = async (
  messageId: string
): Promise<boolean> => {
  try {
    const storedProcessingJson = await AsyncStorage.getItem(
      PROCESSING_MESSAGES_KEY
    );
    if (storedProcessingJson) {
      const storedProcessing = JSON.parse(storedProcessingJson);
      return storedProcessing.includes(messageId);
    }
    return false;
  } catch (error) {
    logger.error(
      '[MessageProcessingQueue] Erro ao verificar status de processamento:',
      error
    );
    return false;
  }
};

/**
 * Marca uma mensagem como "em processamento" para evitar reenvios simultâneos.
 * @returns true se a mensagem foi marcada, false se já estava em processamento
 */
export const markMessageAsProcessing = async (
  messageId: string
): Promise<boolean> => {
  try {
    const storedProcessingJson = await AsyncStorage.getItem(
      PROCESSING_MESSAGES_KEY
    );
    let storedProcessing: string[] = [];

    if (storedProcessingJson) {
      storedProcessing = JSON.parse(storedProcessingJson);
      if (storedProcessing.includes(messageId)) {
        return true;
      }
    }

    storedProcessing.push(messageId);
    await AsyncStorage.setItem(
      PROCESSING_MESSAGES_KEY,
      JSON.stringify(storedProcessing)
    );
    return true;
  } catch (error) {
    logger.error(
      '[MessageProcessingQueue] Erro ao marcar mensagem como em processamento:',
      error
    );
    return false;
  }
};

/**
 * Remove uma mensagem do conjunto de "em processamento"
 */
export const unmarkMessageAsProcessing = async (
  messageId: string
): Promise<boolean> => {
  try {
    const storedProcessingJson = await AsyncStorage.getItem(
      PROCESSING_MESSAGES_KEY
    );
    if (!storedProcessingJson) return true;

    const storedProcessing: string[] = JSON.parse(storedProcessingJson);
    if (!storedProcessing.includes(messageId)) return true;

    const updatedProcessing = storedProcessing.filter(id => id !== messageId);
    await AsyncStorage.setItem(
      PROCESSING_MESSAGES_KEY,
      JSON.stringify(updatedProcessing)
    );
    return true;
  } catch (error) {
    logger.error(
      '[MessageProcessingQueue] Erro ao desmarcar mensagem de processamento:',
      error
    );
    return false;
  }
};

/**
 * Carrega mensagens em processamento do AsyncStorage (usado na inicialização)
 */
export const loadProcessingMessagesFromStorage = async (): Promise<void> => {
  try {
    const storedProcessingJson = await AsyncStorage.getItem(
      PROCESSING_MESSAGES_KEY
    );
    if (storedProcessingJson) {
      JSON.parse(storedProcessingJson); // Valida o JSON
      logger.debug(
        '[MessageProcessingQueue] Mensagens em processamento carregadas'
      );
    } else {
      logger.debug(
        '[MessageProcessingQueue] Nenhuma mensagem em processamento encontrada'
      );
    }
  } catch (error) {
    logger.error(
      '[MessageProcessingQueue] Erro ao carregar mensagens em processamento:',
      error
    );
  }
};

/**
 * Verifica o status de processamento de uma mensagem (delegado para isMessageBeingProcessed)
 */
export const checkMessageProcessingStatus = async (
  messageId: string
): Promise<boolean> => {
  return isMessageBeingProcessed(messageId);
};
