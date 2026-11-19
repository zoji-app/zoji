// ─── Mocks ─────────────────────────────────────────────────────────────────

const memoryStore = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(key => Promise.resolve(memoryStore[key] ?? null)),
  setItem: jest.fn((key, value) => {
    memoryStore[key] = value;
    return Promise.resolve();
  }),
}));

const {
  getStreak,
  updateStreak,
  getStreakLevel,
  getStreakState,
  toLocalDateString,
} = require('../../src/services/streakService');

describe('streakService', () => {
  beforeEach(() => {
    for (const key of Object.keys(memoryStore)) delete memoryStore[key];
  });

  describe('toLocalDateString', () => {
    it('formats as YYYY-MM-DD', () => {
      const date = new Date(2026, 7, 14); // 14 ago 2026 (mês 0-indexado)
      expect(toLocalDateString(date)).toBe('2026-08-14');
    });

    it('pads single-digit month and day', () => {
      const date = new Date(2026, 0, 5); // 5 jan 2026
      expect(toLocalDateString(date)).toBe('2026-01-05');
    });
  });

  describe('updateStreak', () => {
    it('starts a new streak at 1 for the first message', async () => {
      const today = new Date(2026, 7, 14);
      const result = await updateStreak('user1', 'contact1', today);

      expect(result.count).toBe(1);
      expect(result.lastDate).toBe('2026-08-14');
      expect(result.longest).toBe(1);
    });

    it('does not increment when called twice on the same day (idempotent)', async () => {
      const today = new Date(2026, 7, 14);
      await updateStreak('user1', 'contact1', today);
      const second = await updateStreak('user1', 'contact1', today);

      expect(second.count).toBe(1);
    });

    it('increments on a consecutive day', async () => {
      const day1 = new Date(2026, 7, 14);
      const day2 = new Date(2026, 7, 15);

      await updateStreak('user1', 'contact1', day1);
      const result = await updateStreak('user1', 'contact1', day2);

      expect(result.count).toBe(2);
      expect(result.longest).toBe(2);
    });

    it('resets to 1 when there is a gap of more than one day', async () => {
      const day1 = new Date(2026, 7, 10);
      const day5 = new Date(2026, 7, 15); // gap de 5 dias

      await updateStreak('user1', 'contact1', day1);
      const result = await updateStreak('user1', 'contact1', day5);

      expect(result.count).toBe(1);
    });

    it('keeps separate streaks per contact', async () => {
      const today = new Date(2026, 7, 14);
      await updateStreak('user1', 'contactA', today);
      const resultB = await updateStreak('user1', 'contactB', today);

      expect(resultB.count).toBe(1);
      const streakA = await getStreak('user1', 'contactA');
      expect(streakA.count).toBe(1);
    });

    it('preserves longest across a broken streak', async () => {
      const day1 = new Date(2026, 7, 1);
      const day2 = new Date(2026, 7, 2);
      const day3 = new Date(2026, 7, 3);
      const dayFarAway = new Date(2026, 7, 20); // quebra a sequência

      await updateStreak('user1', 'contact1', day1);
      await updateStreak('user1', 'contact1', day2);
      const beforeBreak = await updateStreak('user1', 'contact1', day3);
      expect(beforeBreak.count).toBe(3);
      expect(beforeBreak.longest).toBe(3);

      const afterBreak = await updateStreak('user1', 'contact1', dayFarAway);
      expect(afterBreak.count).toBe(1);
      expect(afterBreak.longest).toBe(3);
    });
  });

  describe('getStreakLevel', () => {
    it.each([
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 2],
      [6, 2],
      [7, 3],
      [13, 3],
      [14, 4],
      [29, 4],
      [30, 5],
      [100, 5],
    ])('count=%i → level=%i', (count, level) => {
      expect(getStreakLevel(count)).toBe(level);
    });
  });

  describe('getStreakState', () => {
    it('returns "none" when there is no streak yet', () => {
      expect(
        getStreakState({
          count: 0,
          lastDate: '',
          longest: 0,
          milestoneShown: [],
        })
      ).toBe('none');
    });

    it('returns "safe" when the last message was today', () => {
      const today = toLocalDateString(new Date());
      expect(
        getStreakState({
          count: 3,
          lastDate: today,
          longest: 3,
          milestoneShown: [],
        })
      ).toBe('safe');
    });

    it('returns "broken" when more than a day has passed', () => {
      const longAgo = toLocalDateString(new Date(2000, 0, 1));
      expect(
        getStreakState({
          count: 3,
          lastDate: longAgo,
          longest: 3,
          milestoneShown: [],
        })
      ).toBe('broken');
    });
  });
});
