import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD in device local timezone
  longest: number;
  milestoneShown: number[];
}

export type StreakState = 'safe' | 'at-risk' | 'broken' | 'none';

const MILESTONES = [7, 30, 100];
const KEY = (userId: string, contactId: string) =>
  `@zoji:streak:${userId}:${contactId}`;

const EMPTY: StreakData = {
  count: 0,
  lastDate: '',
  longest: 0,
  milestoneShown: [],
};

export const toLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse YYYY-MM-DD as local date (avoids UTC midnight off-by-one)
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const diffDays = (later: string, earlier: string): number => {
  const ms =
    parseLocalDate(later).getTime() - parseLocalDate(earlier).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export const getStreak = async (
  userId: string,
  contactId: string
): Promise<StreakData> => {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId, contactId));
    return raw ? (JSON.parse(raw) as StreakData) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
};

export const updateStreak = async (
  userId: string,
  contactId: string,
  messageDate: Date = new Date()
): Promise<StreakData> => {
  const today = toLocalDateString(messageDate);
  const current = await getStreak(userId, contactId);

  // Already counted today — no change
  if (current.lastDate === today) return current;

  const diff = current.lastDate ? diffDays(today, current.lastDate) : 1;
  const newCount = diff === 1 ? current.count + 1 : 1;
  const newLongest = Math.max(current.longest, newCount);

  const updated: StreakData = {
    count: newCount,
    lastDate: today,
    longest: newLongest,
    milestoneShown: current.milestoneShown,
  };

  try {
    await AsyncStorage.setItem(KEY(userId, contactId), JSON.stringify(updated));
  } catch {}

  return updated;
};

export const getStreakLevel = (count: number): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 6) return 2;
  if (count <= 13) return 3;
  if (count <= 29) return 4;
  return 5;
};

export const getStreakState = (data: StreakData): StreakState => {
  if (data.count === 0 || !data.lastDate) return 'none';
  const today = toLocalDateString();
  const diff = diffDays(today, data.lastDate);
  if (diff === 0) return 'safe';
  if (diff === 1) return 'at-risk';
  return 'broken';
};

export const checkNewMilestone = (data: StreakData): number | null => {
  for (const m of MILESTONES) {
    if (data.count >= m && !data.milestoneShown.includes(m)) return m;
  }
  return null;
};

export const markMilestoneShown = async (
  userId: string,
  contactId: string,
  milestone: number
): Promise<void> => {
  const current = await getStreak(userId, contactId);
  if (current.milestoneShown.includes(milestone)) return;
  await AsyncStorage.setItem(
    KEY(userId, contactId),
    JSON.stringify({
      ...current,
      milestoneShown: [...current.milestoneShown, milestone],
    })
  );
};
