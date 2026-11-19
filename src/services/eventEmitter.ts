import { EventEmitter as NodeEventEmitter } from 'events';
import { EventType } from '../types/eventType';
import { logger } from '../utils/logger';

/**
 * Instância global do EventEmitter para permitir comunicação entre
 * diferentes partes da aplicação
 */
class ApplicationEventEmitter {
  private emitter: NodeEventEmitter;

  constructor() {
    this.emitter = new NodeEventEmitter();
    // Aumentando o limite de listeners para evitar warnings
    this.emitter.setMaxListeners(30);
    logger.debug('[EventEmitter] Inicializado');
  }

  /**
   * Registra um listener para um evento específico
   * @param event Tipo de evento para escutar
   * @param listener Função a ser chamada quando o evento ocorrer
   * @returns Função para remover o listener
   */
  on(
    event: EventType | string,
    listener: (...args: any[]) => void
  ): () => void {
    logger.debug(`[EventEmitter] Registrado listener para evento ${event}`);
    this.emitter.on(event, listener);
    return () => {
      logger.debug(`[EventEmitter] Removido listener para evento ${event}`);
      this.emitter.off(event, listener);
    };
  }

  /**
   * Registra um listener que será executado apenas uma vez
   * @param event Tipo de evento para escutar
   * @param listener Função a ser chamada quando o evento ocorrer
   * @returns Função para remover o listener
   */
  once(
    event: EventType | string,
    listener: (...args: any[]) => void
  ): () => void {
    logger.debug(
      `[EventEmitter] Registrado listener one-time para evento ${event}`
    );
    this.emitter.once(event, listener);
    return () => {
      logger.debug(
        `[EventEmitter] Removido listener one-time para evento ${event}`
      );
      this.emitter.off(event, listener);
    };
  }

  /**
   * Remove um listener específico
   * @param event Tipo de evento
   * @param listener Função registrada anteriormente
   */
  off(event: EventType | string, listener: (...args: any[]) => void): void {
    logger.debug(`[EventEmitter] Removido listener para evento ${event}`);
    this.emitter.off(event, listener);
  }

  /**
   * Emite um evento com os dados fornecidos
   * @param event Tipo de evento a emitir
   * @param data Dados a serem passados para os listeners
   */
  emit(event: EventType | string, data?: any): void {
    logger.debug(
      `[EventEmitter] Emitindo evento ${event}`,
      data ? '' : '(sem dados)'
    );
    this.emitter.emit(event, data);
  }

  /**
   * Remove todos os listeners para um evento específico
   * @param event Tipo de evento
   */
  removeAllListeners(event?: EventType | string): void {
    if (event) {
      logger.debug(
        `[EventEmitter] Removidos todos os listeners para evento ${event}`
      );
      this.emitter.removeAllListeners(event);
    } else {
      logger.debug(
        '[EventEmitter] Removidos todos os listeners para todos os eventos'
      );
      this.emitter.removeAllListeners();
    }
  }
}

// Exportando uma instância única para toda a aplicação
export const EventEmitter = new ApplicationEventEmitter();
