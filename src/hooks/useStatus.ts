import { useState, useEffect, useCallback, useRef } from 'react';
import { statusApi, OwnStatus, FriendStatus } from '../services/statusApi';
import { syncWidgetStatus } from '../services/widgetService';

export function useStatus() {
  const [own, setOwn] = useState<OwnStatus | null>(null);
  const [friends, setFriends] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const friendsRef = useRef<FriendStatus[]>([]);

  const load = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const data = await statusApi.getFriends();
      setOwn(data.own);
      setFriends(data.friends);
      friendsRef.current = data.friends;
      hasLoadedRef.current = true;
      syncWidgetStatus(data.own, data.friends);
    } catch {
      // falha silenciosa
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const postStatus = useCallback(async (emoji: string) => {
    await statusApi.set(emoji);
    const newOwn = {
      emoji,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    setOwn(newOwn);
    syncWidgetStatus(newOwn, friendsRef.current);
  }, []);

  const removeStatus = useCallback(async () => {
    await statusApi.remove();
    setOwn(null);
    syncWidgetStatus(null, friendsRef.current);
  }, []);

  return { own, friends, loading, reload: load, postStatus, removeStatus };
}
