/**
 * Data Sync Hooks
 * Local-first data fetching with background Supabase sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { getCache, setCache, isCacheValid, CacheKeys, clearCache } from './cache';
import type { Event, Round, Team, Score } from '../types';

interface UseCachedDataOptions {
  /** Skip initial cache and fetch fresh data */
  skipCache?: boolean;
  /** Cache expiry in milliseconds */
  cacheExpiry?: number;
  /** Enable real-time subscriptions */
  realtime?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isFromCache: boolean;
}

// ---- Generic cached fetch hook ----

function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
): UseCachedDataResult<T> {
  const { skipCache = false, cacheExpiry = 5 * 60 * 1000 } = options;

  const [data, setData] = useState<T | null>(() =>
    skipCache ? null : getCache<T>(cacheKey)
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(!!data);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const freshData = await fetcher();
      setData(freshData);
      setCache(cacheKey, freshData, cacheExpiry);
      setIsFromCache(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, cacheExpiry]);

  useEffect(() => {
    // If we have cached data, show it immediately
    if (!skipCache && !fetchedRef.current) {
      const cached = getCache<T>(cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setLoading(false);
      }
    }

    // Always fetch fresh data in background (stale-while-revalidate)
    if (!fetchedRef.current || !isCacheValid(cacheKey)) {
      fetchedRef.current = true;
      refresh();
    }
  }, [cacheKey, skipCache, refresh]);

  return { data, loading: loading && !data, error, refresh, isFromCache };
}

// ---- Specific data hooks ----

export function useCachedEvents(options?: UseCachedDataOptions): UseCachedDataResult<Event[]> {
  const fetcher = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Event[];
  }, []);

  return useCachedFetch(CacheKeys.events(), fetcher, options);
}

export function useCachedEvent(eventId: string | undefined, options?: UseCachedDataOptions): UseCachedDataResult<Event> {
  const fetcher = useCallback(async () => {
    if (!eventId) throw new Error('Event ID required');
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    return data as Event;
  }, [eventId]);

  return useCachedFetch(
    CacheKeys.event(eventId || ''),
    fetcher,
    { ...options, skipCache: !eventId }
  );
}

export function useCachedRounds(eventId: string | undefined, options?: UseCachedDataOptions): UseCachedDataResult<Round[]> {
  const fetcher = useCallback(async () => {
    if (!eventId) throw new Error('Event ID required');
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('event_id', eventId)
      .order('round_number');
    if (error) throw error;
    return data as Round[];
  }, [eventId]);

  return useCachedFetch(
    CacheKeys.rounds(eventId || ''),
    fetcher,
    { ...options, skipCache: !eventId }
  );
}

export function useCachedTeams(eventId: string | undefined, options?: UseCachedDataOptions): UseCachedDataResult<Team[]> {
  const fetcher = useCallback(async () => {
    if (!eventId) throw new Error('Event ID required');
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', eventId)
      .order('name');
    if (error) throw error;
    return data as Team[];
  }, [eventId]);

  return useCachedFetch(
    CacheKeys.teams(eventId || ''),
    fetcher,
    { ...options, skipCache: !eventId }
  );
}

export function useCachedScores(eventId: string | undefined, options?: UseCachedDataOptions): UseCachedDataResult<Score[]> {
  const fetcher = useCallback(async () => {
    if (!eventId) throw new Error('Event ID required');
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');
    if (error) throw error;
    return data as Score[];
  }, [eventId]);

  return useCachedFetch(
    CacheKeys.scores(eventId || ''),
    fetcher,
    { ...options, skipCache: !eventId }
  );
}

// ---- Combined event data hook ----

interface EventData {
  event: Event;
  rounds: Round[];
  teams: Team[];
  scores: Score[];
}

export function useCachedEventData(
  eventId: string | undefined,
  options?: UseCachedDataOptions
): UseCachedDataResult<EventData> {
  const fetcher = useCallback(async () => {
    if (!eventId) throw new Error('Event ID required');

    const [eventRes, roundsRes, teamsRes, scoresRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
      supabase.from('teams').select('*').eq('event_id', eventId).order('name'),
      supabase.from('scores').select('*').eq('event_id', eventId).order('created_at'),
    ]);

    if (eventRes.error) throw eventRes.error;
    if (roundsRes.error) throw roundsRes.error;
    if (teamsRes.error) throw teamsRes.error;
    if (scoresRes.error) throw scoresRes.error;

    const data: EventData = {
      event: eventRes.data as Event,
      rounds: roundsRes.data as Round[],
      teams: teamsRes.data as Team[],
      scores: scoresRes.data as Score[],
    };

    // Also cache individual items
    setCache(CacheKeys.event(eventId), data.event);
    setCache(CacheKeys.rounds(eventId), data.rounds);
    setCache(CacheKeys.teams(eventId), data.teams);
    setCache(CacheKeys.scores(eventId), data.scores);

    return data;
  }, [eventId]);

  return useCachedFetch(
    `event_data_${eventId || ''}`,
    fetcher,
    { ...options, skipCache: !eventId }
  );
}

// ---- Optimistic update helpers ----

export function updateEventCache(eventId: string, updates: Partial<Event>): void {
  const cached = getCache<Event>(CacheKeys.event(eventId));
  if (cached) {
    setCache(CacheKeys.event(eventId), { ...cached, ...updates });
  }
}

export function addScoreToCache(eventId: string, score: Score): void {
  const cached = getCache<Score[]>(CacheKeys.scores(eventId)) || [];
  setCache(CacheKeys.scores(eventId), [...cached, score]);
}

export function removeScoreFromCache(eventId: string, scoreId: string): void {
  const cached = getCache<Score[]>(CacheKeys.scores(eventId));
  if (cached) {
    setCache(CacheKeys.scores(eventId), cached.filter(s => s.id !== scoreId));
  }
}

export function invalidateEventCache(eventId: string): void {
  clearCache(CacheKeys.event(eventId));
  clearCache(CacheKeys.rounds(eventId));
  clearCache(CacheKeys.teams(eventId));
  clearCache(CacheKeys.scores(eventId));
  clearCache(`event_data_${eventId}`);
}
