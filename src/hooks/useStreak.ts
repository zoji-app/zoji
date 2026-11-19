import { useState, useEffect, useCallback } from 'react';
import {
  StreakData,
  StreakState,
  getStreak,
  updateStreak,
  getStreakState,
  checkNewMilestone,
  markMilestoneShown,
} from '../services/streakService';

const EMPTY: StreakData = {
  count: 0,
  lastDate: '',
  longest: 0,
  milestoneShown: [],
};

export const useStreak = (userId: string | null, contactId: string) => {
  const [streakData, setStreakData] = useState<StreakData>(EMPTY);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getStreak(userId, contactId).then(data => {
      setStreakData(data);
      const m = checkNewMilestone(data);
      if (m) setPendingMilestone(m);
    });
  }, [userId, contactId]);

  const onNewMessage = useCallback(
    async (date?: Date) => {
      if (!userId) return;
      const updated = await updateStreak(userId, contactId, date);
      setStreakData(updated);
      const m = checkNewMilestone(updated);
      if (m) setPendingMilestone(m);
    },
    [userId, contactId]
  );

  const dismissMilestone = useCallback(async () => {
    if (!userId || pendingMilestone === null) return;
    await markMilestoneShown(userId, contactId, pendingMilestone);
    setPendingMilestone(null);
  }, [userId, contactId, pendingMilestone]);

  const streakState: StreakState = getStreakState(streakData);

  return {
    streakData,
    streakState,
    pendingMilestone,
    onNewMessage,
    dismissMilestone,
  };
};
