import { useEffect, useState } from 'react';
import { watchNews, watchRoom } from '@/firebase/rooms';
import type { NewsItem, RoomState } from '@/types';

export function useRoom(code: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const unsub = watchRoom(code, (r) => {
        setRoom(r);
        setLoading(false);
        if (!r) setError('Room not found');
      });
      return unsub;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [code]);

  return { room, loading, error };
}

export function useNews(code: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    if (!code) return;
    try {
      const unsub = watchNews(code, setNews);
      return unsub;
    } catch (e) {
      console.error('news subscribe failed', e);
    }
  }, [code]);
  return news;
}
