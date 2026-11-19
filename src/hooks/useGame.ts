import { useState, useCallback, useRef, useEffect } from 'react';
import { gameApi } from '../services/gameApi';
import { GameQuestion, GameFinalResults } from '../types/game';

export type GamePhase = 'loading' | 'playing' | 'answered';

export function gameCalcPoints(
  correct: boolean,
  timeMs: number,
  streakCount: number,
  timerMs: number = 7000
): number {
  if (!correct) return 0;
  const speedBonus = Math.floor((Math.max(0, timerMs - timeMs) / timerMs) * 50);
  const streakMultiplier = 1.0 + streakCount * 0.1;
  return Math.floor(100 * streakMultiplier + speedBonus);
}

export function useGame(lang: string, timerMs: number = 7000) {
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const streakRef = useRef(0);
  const streakMaxRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const prefetchedRef = useRef<GameQuestion | null>(null);

  const applyQuestion = useCallback((q: GameQuestion) => {
    setSelectedOption(null);
    setQuestion(q);
    setPhase('playing');
    startTimeRef.current = Date.now();
  }, []);

  // Reage ao estado 'loading' APÓS a tela ter renderizado o spinner.
  // Garante que o loading sempre fica visível antes de avançar para 'playing'.
  useEffect(() => {
    if (phase !== 'loading') return;

    // Prefetch pronto: aplica imediatamente (loading já foi renderizado)
    const prefetched = prefetchedRef.current;
    if (prefetched) {
      prefetchedRef.current = null;
      applyQuestion(prefetched);
      return;
    }

    // Prefetch ainda em voo: busca nova pergunta com retry
    let cancelled = false;
    const retryTimers: ReturnType<typeof setTimeout>[] = [];

    const doFetch = () => {
      gameApi
        .fetchQuestion(lang)
        .then(q => {
          if (!cancelled && mountedRef.current) applyQuestion(q);
        })
        .catch(() => {
          if (!cancelled && mountedRef.current) {
            const t = setTimeout(doFetch, 1500);
            retryTimers.push(t);
          }
        });
    };

    doFetch();

    return () => {
      cancelled = true;
      retryTimers.forEach(clearTimeout);
    };
  }, [phase, lang, applyQuestion]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  const handleAnswer = useCallback(
    (option: string) => {
      if (phase !== 'playing' || !question) return;

      const elapsed = Date.now() - startTimeRef.current;
      const isCorrect = option === question.answer;
      const newStreak = isCorrect ? streakRef.current + 1 : 0;
      const points = gameCalcPoints(
        isCorrect,
        elapsed,
        streakRef.current,
        timerMs
      );

      scoreRef.current += points;
      totalRef.current += 1;
      if (isCorrect) correctRef.current += 1;
      streakRef.current = newStreak;
      streakMaxRef.current = Math.max(streakMaxRef.current, newStreak);

      setSelectedOption(option);
      setPhase('answered');
      setDisplayScore(scoreRef.current);
      setDisplayStreak(newStreak);
      setTotalAnswered(totalRef.current);

      // Prefetch durante os 900ms de feedback
      prefetchedRef.current = null;
      gameApi
        .fetchQuestion(lang)
        .then(q => {
          if (mountedRef.current) prefetchedRef.current = q;
        })
        .catch(() => {});

      // Após 900ms: entra em 'loading' — o useEffect acima assume o controle
      advanceRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setSelectedOption(null);
        setPhase('loading');
      }, 900);
    },
    [phase, question, timerMs, lang]
  );

  const stop = useCallback(() => {
    mountedRef.current = false;
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  const getResults = useCallback(
    (): GameFinalResults => ({
      score: scoreRef.current,
      correct: correctRef.current,
      total: totalRef.current,
      streakMax: streakMaxRef.current,
    }),
    []
  );

  return {
    question,
    phase,
    selectedOption,
    displayScore,
    displayStreak,
    totalAnswered,
    handleAnswer,
    stop,
    getResults,
  };
}
