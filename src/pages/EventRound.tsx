import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ChevronDown,
  BarChart3,
  Keyboard,
  X,
  Award,
  Zap,
  Target,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  Filter,
  ChevronRight,
  ChevronLeft,
  Star,
  Crown,
  Hash,
  Users,
  Gift,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Event, Round, Team, Score, TeamWithScores, ActionType } from '../types';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 120, damping: 16 },
  }),
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
  exit: { opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.15 } },
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: { scale: [1, 1.15, 1], transition: { duration: 0.35 } },
};

// ---------------------------------------------------------------------------
// Sort / Filter types
// ---------------------------------------------------------------------------
type SortKey = 'name' | 'totalScore' | 'roundScore';
type FilterMode = 'all' | 'top5';

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-lg font-bold text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function EventRound() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // ---- Core data ----
  const [event, setEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  // ---- UI state ----
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundDropdownOpen, setRoundDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('totalScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [questionPanelOpen, setQuestionPanelOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'overall' | 'round'>('overall');
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusTeamId, setBonusTeamId] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [scoringFeedback, setScoringFeedback] = useState<string | null>(null);
  const [animatingTeamId, setAnimatingTeamId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundDropdownRef = useRef<HTMLDivElement>(null);

  // ---- Derived ----
  const currentRound = useMemo(
    () => rounds.find((r) => r.id === currentRoundId) ?? null,
    [rounds, currentRoundId]
  );

  const isLastRound = useMemo(() => {
    if (!currentRound || rounds.length === 0) return false;
    return currentRound.round_number === Math.max(...rounds.map((r) => r.round_number));
  }, [currentRound, rounds]);

  // ---- Score calculations ----
  const teamsWithScores: TeamWithScores[] = useMemo(() => {
    return teams.map((team) => {
      const totalScore = scores
        .filter((s) => s.team_id === team.id)
        .reduce((sum, s) => sum + s.points, 0);
      const roundScore = scores
        .filter((s) => s.team_id === team.id && s.round_id === currentRoundId)
        .reduce((sum, s) => sum + s.points, 0);
      return { ...team, totalScore, roundScore };
    });
  }, [teams, scores, currentRoundId]);

  const sortedTeams = useMemo(() => {
    let sorted = [...teamsWithScores];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'totalScore') cmp = a.totalScore - b.totalScore;
      else cmp = a.roundScore - b.roundScore;
      return sortAsc ? cmp : -cmp;
    });
    if (filterMode === 'top5') sorted = sorted.slice(0, 5);
    return sorted;
  }, [teamsWithScores, sortKey, sortAsc, filterMode]);

  const questionHistory = useMemo(() => {
    if (!currentRoundId) return [];
    const roundScores = scores.filter((s) => s.round_id === currentRoundId && s.winning_team_id);
    const map = new Map<number, { teamName: string; actionType: ActionType; points: number }>();
    roundScores.forEach((s) => {
      const team = teams.find((t) => t.id === s.winning_team_id);
      if (team && !map.has(s.question_number)) {
        map.set(s.question_number, {
          teamName: team.name,
          actionType: s.action_type,
          points: s.points,
        });
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([qNum, data]) => ({ questionNumber: qNum, ...data }));
  }, [scores, currentRoundId, teams]);

  const overallLeaderboard = useMemo(() => {
    return [...teamsWithScores].sort((a, b) => b.totalScore - a.totalScore);
  }, [teamsWithScores]);

  const roundLeaderboard = useMemo(() => {
    return [...teamsWithScores].sort((a, b) => b.roundScore - a.roundScore);
  }, [teamsWithScores]);

  // ---- Show feedback toast ----
  const showFeedback = useCallback((msg: string) => {
    setScoringFeedback(msg);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setScoringFeedback(null), 2500);
  }, []);

  // ---- Data fetching ----
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, roundsRes, teamsRes, scoresRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
        supabase.from('teams').select('*').eq('event_id', eventId),
        supabase.from('scores').select('*').eq('event_id', eventId),
      ]);

      if (eventRes.error) throw eventRes.error;
      if (roundsRes.error) throw roundsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (scoresRes.error) throw scoresRes.error;

      const ev = eventRes.data as Event;
      const rds = (roundsRes.data ?? []) as Round[];
      const tms = (teamsRes.data ?? []) as Team[];
      const scs = (scoresRes.data ?? []) as Score[];

      setEvent(ev);
      setRounds(rds);
      setTeams(tms);
      setScores(scs);

      if (ev.status === 'upcoming' && rds.length > 0) {
        const firstRound = rds[0];
        await supabase.from('events').update({ status: 'active', current_round_id: firstRound.id, current_question: 1 }).eq('id', eventId);
        await supabase.from('rounds').update({ status: 'active' }).eq('id', firstRound.id);
        setEvent((prev) => (prev ? { ...prev, status: 'active', current_round_id: firstRound.id, current_question: 1 } : prev));
        setCurrentRoundId(firstRound.id);
        setRounds((prev) => prev.map((r) => (r.id === firstRound.id ? { ...r, status: 'active' } : r)));
      } else {
        setCurrentRoundId(ev.current_round_id ?? (rds.length > 0 ? rds[0].id : null));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Realtime subscription ----
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`scores-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newScore = payload.new as Score;
            setScores((prev) => [...prev, newScore]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Score;
            setScores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string };
            setScores((prev) => prev.filter((s) => s.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // ---- Close dropdown on outside click ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roundDropdownRef.current && !roundDropdownRef.current.contains(e.target as Node)) {
        setRoundDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (bonusModalOpen || leaderboardOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLeaderboardOpen((v) => !v);
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQuestionPanelOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setLeaderboardOpen(false);
        setBonusModalOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bonusModalOpen, leaderboardOpen]);

  // ---- Scoring action ----
  const handleScore = useCallback(
    async (teamId: string, actionType: ActionType, customPoints?: number) => {
      if (!event || !currentRound || !eventId || submitting) return;
      setSubmitting(true);

      let points = 0;
      switch (actionType) {
        case 'bounce':
          points = currentRound.bounce_points;
          break;
        case 'pounce_plus':
          points = currentRound.pounce_plus;
          break;
        case 'pounce_minus':
          points = -Math.abs(currentRound.pounce_minus);
          break;
        case 'buzzer':
          points = currentRound.bounce_points;
          break;
        case 'buzzer_minus':
          points = -Math.abs(currentRound.bounce_points);
          break;
        case 'bonus':
          points = customPoints ?? 0;
          break;
      }

      const isPositive = ['bounce', 'pounce_plus', 'buzzer', 'bonus'].includes(actionType) && points > 0;

      try {
        const { error: insertError } = await supabase.from('scores').insert({
          event_id: eventId,
          round_id: currentRound.id,
          team_id: teamId,
          question_number: event.current_question,
          action_type: actionType,
          points,
          winning_team_id: isPositive ? teamId : null,
        });

        if (insertError) throw insertError;

        if (isPositive) {
          const nextQ = event.current_question + 1;
          await supabase.from('events').update({ current_question: nextQ }).eq('id', eventId);
          setEvent((prev) => (prev ? { ...prev, current_question: nextQ } : prev));
        }

        const team = teams.find((t) => t.id === teamId);
        const teamName = team?.name ?? 'Team';
        const sign = points >= 0 ? '+' : '';
        showFeedback(`${teamName}: ${sign}${points} pts (${actionType.replace('_', ' ')})`);

        setAnimatingTeamId(teamId);
        setTimeout(() => setAnimatingTeamId(null), 500);
      } catch (err: unknown) {
        showFeedback(`Error: ${err instanceof Error ? err.message : 'Scoring failed'}`);
      } finally {
        setSubmitting(false);
      }
    },
    [event, currentRound, eventId, teams, showFeedback, submitting]
  );

  // ---- Bonus submit ----
  const handleBonusSubmit = useCallback(() => {
    if (!bonusTeamId) return;
    const pts = parseInt(bonusPoints);
    if (isNaN(pts)) return;
    handleScore(bonusTeamId, 'bonus', pts);
    setBonusModalOpen(false);
    setBonusPoints('');
    setBonusTeamId(null);
  }, [bonusTeamId, bonusPoints, handleScore]);

  // ---- Round switching ----
  const switchRound = useCallback(
    (roundId: string) => {
      setCurrentRoundId(roundId);
      setRoundDropdownOpen(false);
    },
    []
  );

  // ---- Complete round & activate next ----
  const handleCompleteRound = useCallback(async () => {
    if (!currentRound || !eventId) return;
    setSubmitting(true);
    try {
      await supabase.from('rounds').update({ status: 'completed' }).eq('id', currentRound.id);

      const nextRound = rounds.find((r) => r.round_number === currentRound.round_number + 1);

      if (nextRound) {
        await supabase.from('rounds').update({ status: 'active' }).eq('id', nextRound.id);
        await supabase.from('events').update({ current_round_id: nextRound.id, current_question: 1 }).eq('id', eventId);

        setRounds((prev) =>
          prev.map((r) => {
            if (r.id === currentRound.id) return { ...r, status: 'completed' };
            if (r.id === nextRound.id) return { ...r, status: 'active' };
            return r;
          })
        );
        setCurrentRoundId(nextRound.id);
        setEvent((prev) => (prev ? { ...prev, current_round_id: nextRound.id, current_question: 1 } : prev));
        showFeedback(`Round completed! Now on ${nextRound.round_name}`);
      } else {
        await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
        setRounds((prev) =>
          prev.map((r) => (r.id === currentRound.id ? { ...r, status: 'completed' } : r))
        );
        setEvent((prev) => (prev ? { ...prev, status: 'completed' } : prev));
        showFeedback('Event completed!');
      }
    } catch (err: unknown) {
      showFeedback(`Error: ${err instanceof Error ? err.message : 'Failed to complete round'}`);
    } finally {
      setSubmitting(false);
    }
  }, [currentRound, eventId, rounds, showFeedback]);

  // ---- Navigate to stats ----
  const handleViewStats = useCallback(() => {
    if (!eventId || !currentRound) return;
    if (isLastRound) {
      navigate(`/events/${eventId}/final-stats`);
    } else {
      navigate(`/events/${eventId}/rounds/${currentRound.id}/stats`);
    }
  }, [eventId, currentRound, isLastRound, navigate]);

  // ---- Loading / Error states ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-slate-400">Loading event...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-red-300 text-lg font-medium">{error ?? 'Event not found'}</p>
          <button onClick={() => navigate('/events')} className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-screen text-white bg-slate-950">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      {/* ================================================================== */}
      {/*  HEADER                                                            */}
      {/* ================================================================== */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Left: Event name + round selector */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/events`)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">{event.name}</h1>
              <div className="relative" ref={roundDropdownRef}>
                <button
                  onClick={() => setRoundDropdownOpen((v) => !v)}
                  className="mt-0.5 flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <span>{currentRound?.round_name ?? 'Select Round'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roundDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {roundDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-white/[0.08] bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl"
                    >
                      {rounds.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => switchRound(r.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            r.id === currentRoundId
                              ? 'bg-violet-500/20 text-violet-300'
                              : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <span>{r.round_name}</span>
                          <span
                            className={`ml-3 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                              r.status === 'active'
                                ? 'bg-emerald-400/20 text-emerald-400'
                                : r.status === 'completed'
                                ? 'bg-slate-400/20 text-slate-400'
                                : 'bg-amber-400/10 text-amber-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Center: Current question badge */}
          <div className="flex items-center gap-2">
            <motion.div
              key={event.current_question}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2"
            >
              <Hash className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-slate-400">Question</span>
              <span className="text-xl font-bold text-violet-300">{event.current_question}</span>
              {currentRound && (
                <span className="text-xs text-slate-500">/ {currentRound.question_count}</span>
              )}
            </motion.div>
          </div>

          {/* Right: Shortcuts help + Question Panel toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuestionPanelOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={() => setShortcutsOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-bold text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors"
              title="Keyboard shortcuts"
            >
              ?
            </button>
          </div>
        </div>

        {/* Sort / Filter bar */}
        <div className="border-t border-white/[0.04] bg-white/[0.01]">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 sm:px-6">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-xs text-slate-500 font-medium">Sort:</span>
              {(['name', 'totalScore', 'roundScore'] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (sortKey === key) setSortAsc((v) => !v);
                    else {
                      setSortKey(key);
                      setSortAsc(key === 'name');
                    }
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortKey === key
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                  }`}
                >
                  {key === 'name' ? 'Name' : key === 'totalScore' ? 'Total' : 'Round'}
                  {sortKey === key && (sortAsc ? ' \u2191' : ' \u2193')}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:bg-white/[0.05]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('top5')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterMode === 'top5' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:bg-white/[0.05]'
                }`}
              >
                Top 5
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ================================================================== */}
      {/*  MAIN CONTENT                                                      */}
      {/* ================================================================== */}
      <div className="relative z-10 mx-auto flex max-w-7xl gap-0 px-4 py-6 sm:px-6">
        {/* ---- Question history sidebar (collapsible) ---- */}
        <AnimatePresence>
          {questionPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 26 }}
              className="mr-5 flex-shrink-0 overflow-hidden"
            >
              <div className="h-full w-[280px] rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question History</h3>
                  <button onClick={() => setQuestionPanelOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                  {questionHistory.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">No history yet</p>
                  )}
                  {questionHistory.map((q) => (
                    <motion.div
                      key={q.questionNumber}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                        {q.questionNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">{q.teamName}</p>
                        <p className="text-[10px] text-slate-500">
                          {q.actionType.replace('_', ' ')} &middot; {q.points > 0 ? '+' : ''}{q.points} pts
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ---- Team Cards Grid ---- */}
        <div className="flex-1 min-w-0">
          {sortedTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-16 w-16 text-slate-700 mb-4" />
              <p className="text-slate-500 text-sm">No teams found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedTeams.map((team, i) => {
                const rank = overallLeaderboard.findIndex((t) => t.id === team.id) + 1;
                const maxScore = overallLeaderboard[0]?.totalScore || 1;
                const barPercent = maxScore > 0 ? Math.max((team.totalScore / maxScore) * 100, 3) : 3;
                const isLeader = rank === 1 && team.totalScore > 0;
                const rankColors = rank === 1 ? 'from-yellow-500/20 via-yellow-600/5 to-transparent border-yellow-500/25'
                  : rank === 2 ? 'from-gray-300/10 via-gray-400/5 to-transparent border-gray-400/15'
                  : rank === 3 ? 'from-amber-600/10 via-amber-700/5 to-transparent border-amber-600/15'
                  : 'from-white/[0.03] via-white/[0.01] to-transparent border-white/[0.06]';
                const rankBadge = rank === 1 ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                  : rank === 2 ? 'bg-gray-300/20 text-gray-300 ring-1 ring-gray-400/30'
                  : rank === 3 ? 'bg-amber-700/20 text-amber-500 ring-1 ring-amber-600/30'
                  : 'bg-slate-700/30 text-slate-400';
                const barGradient = rank === 1 ? 'from-yellow-500 to-amber-500'
                  : rank === 2 ? 'from-gray-300 to-gray-400'
                  : rank === 3 ? 'from-amber-600 to-amber-700'
                  : 'from-violet-500/60 to-violet-600/40';

                return (
                <motion.div
                  key={team.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  layout
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition-all hover:scale-[1.01] ${rankColors} ${isLeader ? 'shadow-[0_0_30px_-5px_rgba(234,179,8,0.15)]' : ''}`}
                >
                  {/* Animated glow on score */}
                  <AnimatePresence>
                    {animatingTeamId === team.id && (
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 rounded-2xl bg-violet-500/25 z-0"
                      />
                    )}
                  </AnimatePresence>

                  {/* Card header */}
                  <div className="relative z-10 flex items-start gap-3 p-4 pb-2">
                    {/* Rank badge */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl text-sm font-black flex-shrink-0 ${rankBadge}`}>
                      #{rank}
                    </div>

                    {/* Team info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white truncate">{team.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{team.lead}</p>
                    </div>

                    {/* Scores */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <motion.div
                        key={`total-${team.totalScore}`}
                        variants={pulseVariants}
                        initial="initial"
                        animate={animatingTeamId === team.id ? 'pulse' : 'initial'}
                        className="flex items-center gap-1.5"
                      >
                        <span className={`text-2xl font-black tabular-nums ${isLeader ? 'text-yellow-400' : 'text-white'}`}>{team.totalScore}</span>
                      </motion.div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-violet-400/80 tabular-nums">{team.roundScore >= 0 ? '+' : ''}{team.roundScore}</span>
                        <span className="text-[10px] text-slate-600">this round</span>
                      </div>
                    </div>
                  </div>

                  {/* Score progress bar */}
                  <div className="relative z-10 mx-4 mb-3">
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                        initial={{ width: '0%' }}
                        animate={{ width: `${barPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Scoring Buttons */}
                  <div className="relative z-10 grid grid-cols-3 gap-1.5 px-4 pb-4">
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleScore(team.id, 'bounce')}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-2 text-emerald-300 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Bounce</span>
                      <span className="text-[9px] text-emerald-400/50">+{currentRound?.bounce_points ?? 0}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleScore(team.id, 'pounce_plus')}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-blue-500/10 border border-blue-500/20 px-2 py-2 text-blue-300 transition-all hover:bg-blue-500/20 hover:shadow-[0_0_12px_-3px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pounce+</span>
                      <span className="text-[9px] text-blue-400/50">+{currentRound?.pounce_plus ?? 0}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleScore(team.id, 'pounce_minus')}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-red-500/10 border border-red-500/20 px-2 py-2 text-red-300 transition-all hover:bg-red-500/20 hover:shadow-[0_0_12px_-3px_rgba(239,68,68,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pounce-</span>
                      <span className="text-[9px] text-red-400/50">{currentRound?.pounce_minus ?? 0}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleScore(team.id, 'buzzer')}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-2 text-amber-300 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_12px_-3px_rgba(245,158,11,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Award className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Buzzer</span>
                      <span className="text-[9px] text-amber-400/50">+{currentRound?.bounce_points ?? 0}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleScore(team.id, 'buzzer_minus')}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-orange-500/10 border border-orange-500/20 px-2 py-2 text-orange-300 transition-all hover:bg-orange-500/20 hover:shadow-[0_0_12px_-3px_rgba(249,115,22,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Buzz-</span>
                      <span className="text-[9px] text-orange-400/50">-{currentRound?.bounce_points ?? 0}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        setBonusTeamId(team.id);
                        setBonusPoints('');
                        setBonusModalOpen(true);
                      }}
                      disabled={submitting}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-violet-500/10 border border-violet-500/20 px-2 py-2 text-violet-300 transition-all hover:bg-violet-500/20 hover:shadow-[0_0_12px_-3px_rgba(139,92,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Gift className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Bonus</span>
                      <span className="text-[9px] text-violet-400/50">custom</span>
                    </motion.button>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}

          {/* ---- Bottom Actions ---- */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 pb-24">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleViewStats}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              <BarChart3 className="h-4 w-4" />
              {isLastRound ? 'Final Results' : 'Round Stats'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCompleteRound}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Round
              {!isLastRound && <ChevronRight className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  FLOATING LEADERBOARD BUTTON                                       */}
      {/* ================================================================== */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' as const, stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setLeaderboardOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/20 text-violet-300 shadow-lg shadow-violet-500/10 backdrop-blur-xl transition-colors hover:bg-violet-600/30"
        title="Rankings (L)"
      >
        <Crown className="h-6 w-6" />
      </motion.button>

      {/* ================================================================== */}
      {/*  SCORING FEEDBACK TOAST                                            */}
      {/* ================================================================== */}
      <AnimatePresence>
        {scoringFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-20 left-1/2 z-50 rounded-xl border border-white/[0.08] bg-slate-900/95 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl"
          >
            {scoringFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/*  LEADERBOARD MODAL                                                 */}
      {/* ================================================================== */}
      <AnimatePresence>
        {leaderboardOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setLeaderboardOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-slate-900/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-violet-400" />
                  <h2 className="text-lg font-bold">Rankings</h2>
                </div>
                <button
                  onClick={() => setLeaderboardOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex border-b border-white/[0.06]">
                <button
                  onClick={() => setLeaderboardTab('overall')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    leaderboardTab === 'overall'
                      ? 'border-b-2 border-violet-500 text-violet-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setLeaderboardTab('round')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    leaderboardTab === 'round'
                      ? 'border-b-2 border-violet-500 text-violet-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  This Round
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                {(leaderboardTab === 'overall' ? overallLeaderboard : roundLeaderboard).map(
                  (team, idx) => {
                    const score = leaderboardTab === 'overall' ? team.totalScore : team.roundScore;
                    const medal =
                      idx === 0
                        ? 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20'
                        : idx === 1
                        ? 'from-gray-300/10 to-gray-400/5 border-gray-400/15'
                        : idx === 2
                        ? 'from-amber-700/10 to-amber-800/5 border-amber-700/15'
                        : 'from-white/[0.03] to-white/[0.01] border-white/[0.06]';

                    return (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`flex items-center gap-4 rounded-xl border bg-gradient-to-r px-4 py-3 ${medal}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-sm font-black tabular-nums">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                          <p className="text-[11px] text-slate-500">{team.lead}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black tabular-nums text-white">{score}</p>
                          <p className="text-[10px] text-slate-500 uppercase">pts</p>
                        </div>
                      </motion.div>
                    );
                  }
                )}
                {teamsWithScores.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-8">No teams to display</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/*  BONUS POINTS MODAL                                                */}
      {/* ================================================================== */}
      <AnimatePresence>
        {bonusModalOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setBonusModalOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-bold">Bonus Points</h3>
                </div>
                <button
                  onClick={() => setBonusModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-1 text-xs text-slate-500">
                Team: <span className="text-white/70 font-medium">{teams.find((t) => t.id === bonusTeamId)?.name}</span>
              </p>

              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Points (positive or negative)</label>
                <input
                  type="number"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                  placeholder="e.g. 5 or -3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBonusSubmit();
                  }}
                  className={inputCls}
                />
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setBonusModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBonusSubmit}
                  disabled={!bonusPoints || isNaN(parseInt(bonusPoints))}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Award
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/*  KEYBOARD SHORTCUTS TOOLTIP                                        */}
      {/* ================================================================== */}
      <AnimatePresence>
        {shortcutsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 right-4 z-[70] w-64 rounded-2xl border border-white/[0.08] bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl sm:right-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-300">Shortcuts</h3>
              </div>
              <button onClick={() => setShortcutsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { key: '?', desc: 'Toggle shortcuts' },
                { key: 'L', desc: 'Toggle rankings' },
                { key: 'Q', desc: 'Toggle history' },
                { key: 'Esc', desc: 'Close modals' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between text-xs">
                  <kbd className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400">
                    {s.key}
                  </kbd>
                  <span className="text-slate-500">{s.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
