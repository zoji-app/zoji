import { api } from './apiClient';
import { GameQuestion, GameScore, RankingResponse } from '../types/game';
import { isCircuitOpen, recordSuccess, recordFailure } from './circuitBreaker';

const CIRCUIT_KEY = 'game';

// P3-2, item 3: jogo é não essencial — depois de falhas seguidas, dá um
// tempo antes de tentar de novo. Quem chama já trata rejeição (useGame.ts
// tem .catch() em todo lugar que usa isto), então continuar lançando (em
// vez de devolver um fallback silencioso) mantém o mesmo contrato de erro.
function assertCircuitClosed(): void {
  if (isCircuitOpen(CIRCUIT_KEY)) {
    throw new Error(`circuit_open:${CIRCUIT_KEY}`);
  }
}

export const gameApi = {
  fetchQuestion: async (lang = 'pt'): Promise<GameQuestion> => {
    assertCircuitClosed();
    try {
      const { data } = await api.get<GameQuestion>(
        `/game/question?lang=${lang}`
      );
      recordSuccess(CIRCUIT_KEY);
      return data;
    } catch (e) {
      recordFailure(CIRCUIT_KEY);
      throw e;
    }
  },

  saveScore: async (score: GameScore): Promise<void> => {
    assertCircuitClosed();
    try {
      await api.post('/game/score', score);
      recordSuccess(CIRCUIT_KEY);
    } catch (e) {
      recordFailure(CIRCUIT_KEY);
      throw e;
    }
  },

  fetchRanking: async (): Promise<RankingResponse> => {
    assertCircuitClosed();
    try {
      const { data } = await api.get<RankingResponse>('/game/ranking');
      recordSuccess(CIRCUIT_KEY);
      return data;
    } catch (e) {
      recordFailure(CIRCUIT_KEY);
      throw e;
    }
  },
};
