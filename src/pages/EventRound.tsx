import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Crown,
  Hash,
  Users,
  Gift,
  Minus,
  Plus,
  Loader2,
  RotateCcw,
  Pencil,
  SkipForward,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Event, Round, Team, Score, TeamWithScores, ActionType } from '../types';
import { AppLayout } from '../components/Layout';

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
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-lg font-bold text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20';

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
  const submittingRef = useRef(false);

  // ---- Restart Round state ----
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);

  // ---- Undo state ----
  const [lastAction, setLastAction] = useState<{
    scoreId: string;
    teamName: string;
    actionType: ActionType;
    points: number;
    wasPositive: boolean;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Edit score state ----
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<{
    scoreId: string;
    teamName: string;
    actionType: ActionType;
    currentPoints: number;
  } | null>(null);
  const [editPoints, setEditPoints] = useState('');

  // ---- Tiebreaker state ----
  const [tiebreakerMode, setTiebreakerMode] = useState(false);
  const [tiebreakerTeamIds, setTiebreakerTeamIds] = useState<Set<string>>(new Set());
  // Persistence for tiebreaker state per round
  const [roundTiebreakerStates, setRoundTiebreakerStates] = useState<Record<string, {mode: boolean; teams: Set<string>}>>({});

  // ---- History Edit state ----
  // When editingHistoryQuestion is set, the header badge and scoring are redirected
  // to targetQuestion. originalQuestion is where we return after saving.
  const [editingHistoryQuestion, setEditingHistoryQuestion] = useState<{ targetQuestion: number; originalQuestion: number } | null>(null);
  const [editBackupScores, setEditBackupScores] = useState<Score[]>([]);
  const [deletingQuestion, setDeletingQuestion] = useState<number | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Final Results Modal state ----
  const [incompleteRounds, setIncompleteRounds] = useState<Round[]>([]);

  // ---- Reopen Round confirmation ----
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);

  // ---- Skipped questions — tracked in state, NOT in DB (team_id is NOT NULL) ----
  // Shape: { [roundId]: Set<questionNumber> }
  const [skippedQuestions, setSkippedQuestions] = useState<Record<string, Set<number>>>({});

  // ---- Refs ----
  const autoCompleteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const canReopenRound = useMemo(() => {
    if (!currentRound || currentRound.status !== 'completed') return false;
    if (!event) return false;
    return true;
  }, [currentRound, event]);

  const canExecuteReopen = useMemo(() => {
    if (!currentRound || currentRound.status !== 'completed') return false;
    if (!event) return false;
    return true;
  }, [currentRound, event]);

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

  // ---- Question history: includes normal, tiebreaker, and skipped questions ----
  // Skipped questions come from local state (not DB) because team_id is NOT NULL in scores.
  const questionHistory = useMemo(() => {
    if (!currentRoundId || !currentRound) return [];

    const scoreMap = new Map<string, Score>();
    scores
      .filter((s) => s.round_id === currentRoundId)
      .forEach((s) => scoreMap.set(s.id, s));

    const roundScores = Array.from(scoreMap.values());

    const map = new Map<number, {
      questionNumber: number;
      isTiebreaker: boolean;
      isSkipped: boolean;
      actions: { scoreId: string; teamId: string | null; teamName: string; actionType: ActionType; points: number }[];
      winnerTeamName: string | null;
    }>();

    // First pass: build from actual score records
    roundScores.forEach((s) => {
      const team = teams.find((t) => t.id === s.team_id);
      const isTiebreaker = s.question_number > currentRound.question_count;

      if (!map.has(s.question_number)) {
        map.set(s.question_number, {
          questionNumber: s.question_number,
          isTiebreaker,
          isSkipped: false,
          actions: [],
          winnerTeamName: null,
        });
      }
      const entry = map.get(s.question_number)!;
      if (isTiebreaker) entry.isTiebreaker = true;

      entry.actions.push({
        scoreId: s.id,
        teamId: s.team_id,
        teamName: team?.name ?? 'Unknown',
        actionType: s.action_type as ActionType,
        points: s.points,
      });

      if (s.winning_team_id && !entry.winnerTeamName) {
        const winnerTeam = teams.find((t) => t.id === s.winning_team_id);
        entry.winnerTeamName = winnerTeam?.name ?? null;
      }
    });

    // Second pass: inject skipped questions from local state
    const roundSkips = skippedQuestions[currentRound.id] ?? new Set<number>();
    roundSkips.forEach((qNum) => {
      if (!map.has(qNum)) {
        map.set(qNum, {
          questionNumber: qNum,
          isTiebreaker: qNum > currentRound.question_count,
          isSkipped: true,
          actions: [],
          winnerTeamName: null,
        });
      } else {
        // If scores exist for this question, it was re-attended — don't mark as skipped
        // (skip was cleared when rebuilding via history edit)
      }
    });

    return Array.from(map.values()).sort((a, b) => a.questionNumber - b.questionNumber);
  }, [scores, currentRoundId, currentRound, teams, skippedQuestions]);

  // ---- Separate question counts for normal vs tiebreaker ----
  const questionCounts = useMemo(() => {
    if (!currentRoundId || !currentRound) return { normal: 0, tiebreaker: 0 };
    const roundScores = scores.filter((s) => s.round_id === currentRoundId);
    const normalQs = new Set(
      roundScores
        .filter((s) => s.question_number <= currentRound.question_count)
        .map((s) => s.question_number)
    );
    const tiebreakerQs = new Set(
      roundScores
        .filter((s) => s.question_number > currentRound.question_count)
        .map((s) => s.question_number)
    );
    return { normal: normalQs.size, tiebreaker: tiebreakerQs.size };
  }, [scores, currentRoundId, currentRound]);

  const overallLeaderboard = useMemo(() => {
    return [...teamsWithScores].sort((a, b) => b.totalScore - a.totalScore);
  }, [teamsWithScores]);

  const roundLeaderboard = useMemo(() => {
    return [...teamsWithScores].sort((a, b) => b.roundScore - a.roundScore);
  }, [teamsWithScores]);

  // Detect ties in overall scores (only top 3 positions)
  const tiedTeamsInfo = useMemo(() => {
    const sorted = [...teamsWithScores].sort((a, b) => b.totalScore - a.totalScore);
    let rank = 1;
    const ranked = sorted.map((t, i) => {
      if (i > 0 && t.totalScore < sorted[i - 1].totalScore) rank = i + 1;
      return { ...t, rank };
    });
    const top3 = ranked.filter(t => t.rank <= 3);
    const scoreGroups = new Map<number, string[]>();
    top3.forEach(t => {
      const existing = scoreGroups.get(t.totalScore) || [];
      existing.push(t.id);
      scoreGroups.set(t.totalScore, existing);
    });
    const tiedIds = new Set<string>();
    scoreGroups.forEach((ids) => { if (ids.length > 1) ids.forEach((id) => tiedIds.add(id)); });
    return { hasTies: tiedIds.size > 0, tiedTeamIds: tiedIds };
  }, [teamsWithScores]);

  const remainingQuestions = useMemo(() => {
    if (!currentRound || !event) return 0;
    const answered = event.current_question - 1;
    return Math.max(0, currentRound.question_count - answered);
  }, [currentRound, event]);

  // ---- Show feedback toast ----
  const showFeedback = useCallback((msg: string) => {
    setScoringFeedback(msg);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setScoringFeedback(null), 5000);
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
            setScores((prev) => {
              if (prev.some((s) => s.id === newScore.id)) return prev;
              return [...prev, newScore];
            });
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

  // ---- Undo last score ----
  const handleUndoScore = useCallback(async () => {
    if (!lastAction || !eventId || undoing) return;
    setUndoing(true);
    try {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', lastAction.scoreId);
      if (error) throw error;

      setScores((prev) => prev.filter((s) => s.id !== lastAction.scoreId));

      if (autoCompleteTimeout.current) clearTimeout(autoCompleteTimeout.current);

      if (lastAction.wasPositive && event) {
        const prevQ = event.current_question - 1;
        await supabase
          .from('events')
          .update({ current_question: prevQ })
          .eq('id', eventId);
        setEvent((prev) =>
          prev ? { ...prev, current_question: prevQ } : prev
        );
      }

      setLastAction(null);
      if (undoTimeout.current) clearTimeout(undoTimeout.current);
      showFeedback('Score undone successfully');
    } catch (err: unknown) {
      showFeedback(
        `Undo failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setUndoing(false);
    }
  }, [lastAction, eventId, event, undoing, showFeedback]);

  // ---- Calculate incomplete rounds ----
  useEffect(() => {
    const incomplete = rounds.filter((r) => r.status !== 'completed');
    setIncompleteRounds(incomplete);
  }, [rounds]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (bonusModalOpen || leaderboardOpen || editModalOpen || confirmRestartOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndoScore();
        return;
      }

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
        setEditModalOpen(false);
        setConfirmRestartOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bonusModalOpen, leaderboardOpen, editModalOpen, confirmRestartOpen, handleUndoScore]);

  // ---- Auto-complete round ----
  const autoCompleteRound = useCallback(async () => {
    if (!currentRound || !eventId || !event) return;
    setSubmitting(true);
    try {
      await supabase.from('rounds').update({ status: 'completed' }).eq('id', currentRound.id);

      const nextNonCompletedRound = rounds.find(
        (r) => r.round_number > currentRound.round_number && r.status !== 'completed'
      );

      if (nextNonCompletedRound) {
        await supabase.from('rounds').update({ status: 'active' }).eq('id', nextNonCompletedRound.id);
        await supabase.from('events').update({ current_round_id: nextNonCompletedRound.id, current_question: 1 }).eq('id', eventId);

        setRounds((prev) =>
          prev.map((r) => {
            if (r.id === currentRound.id) return { ...r, status: 'completed' };
            if (r.id === nextNonCompletedRound.id) return { ...r, status: 'active' };
            return r;
          })
        );
        setCurrentRoundId(nextNonCompletedRound.id);
        setEvent((prev) => (prev ? { ...prev, current_round_id: nextNonCompletedRound.id, current_question: 1 } : prev));
      } else {
        await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
        setRounds((prev) =>
          prev.map((r) => (r.id === currentRound.id ? { ...r, status: 'completed' } : r))
        );
        setEvent((prev) => (prev ? { ...prev, status: 'completed' } : prev));
      }

      navigate(`/events/${eventId}/rounds/${currentRound.id}/stats`);
    } catch (err: unknown) {
      showFeedback(`Error: ${err instanceof Error ? err.message : 'Failed to complete round'}`);
    } finally {
      setSubmitting(false);
    }
  }, [currentRound, eventId, event, rounds, showFeedback, navigate]);

  // ---- Restart Round ----
  // Clears ALL scores for the current round, resets question counter to 1,
  // resets tiebreaker state. Can be used at any point during an active round.
  const handleRestartRound = useCallback(async () => {
    if (!currentRound || !eventId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmRestartOpen(false);
    try {
      // 1. Delete all scores for this round
      const { error: deleteError } = await supabase
        .from('scores')
        .delete()
        .eq('round_id', currentRound.id);
      if (deleteError) throw deleteError;

      // 2. Reset event question counter to 1
      const { error: updateError } = await supabase
        .from('events')
        .update({ current_question: 1 })
        .eq('id', eventId);
      if (updateError) throw updateError;

      // 3. If round was completed, reopen it
      if (currentRound.status === 'completed') {
        await supabase
          .from('rounds')
          .update({ status: 'active' })
          .eq('id', currentRound.id);
        setRounds((prev) =>
          prev.map((r) => (r.id === currentRound.id ? { ...r, status: 'active' as const } : r))
        );
        // If event was completed too, revert it
        if (event?.status === 'completed') {
          await supabase.from('events').update({ status: 'active' }).eq('id', eventId);
          setEvent((prev) => (prev ? { ...prev, status: 'active' as const } : prev));
        }
      }

      // 4. Update local state
      setScores((prev) => prev.filter((s) => s.round_id !== currentRound.id));
      setEvent((prev) => (prev ? { ...prev, current_question: 1 } : prev));

      // 5. Clear tiebreaker state for this round
      if (currentRoundId) {
        setRoundTiebreakerStates((prev) => {
          const newStates = { ...prev };
          delete newStates[currentRoundId];
          return newStates;
        });
        // Clear skipped questions for this round
        setSkippedQuestions((prev) => {
          const newSkips = { ...prev };
          delete newSkips[currentRound.id];
          return newSkips;
        });
      }
      setTiebreakerMode(false);
      setTiebreakerTeamIds(new Set());

      // 6. Clear undo history and edit state
      setLastAction(null);
      setEditingHistoryQuestion(null);
      if (undoTimeout.current) clearTimeout(undoTimeout.current);
      if (autoCompleteTimeout.current) clearTimeout(autoCompleteTimeout.current);

      showFeedback(`${currentRound.round_name} restarted — all scores cleared`);
    } catch (err: unknown) {
      showFeedback(`Restart failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [currentRound, currentRoundId, eventId, event, showFeedback]);

  // ---- Scoring action ----
  const handleScore = useCallback(
    async (teamId: string, actionType: ActionType, customPoints?: number) => {
      if (!event || !currentRound || !eventId || submittingRef.current || currentRound.status === 'completed') {
        if (currentRound?.status === 'completed') {
          showFeedback('Scoring disabled on completed rounds');
        }
        return;
      }

      if (tiebreakerMode && !tiebreakerTeamIds.has(teamId)) {
        showFeedback('Only tiebreaker teams can score right now');
        return;
      }

      submittingRef.current = true;
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

      if (!tiebreakerMode && isPositive && event.current_question > currentRound.question_count) {
        showFeedback(`All ${currentRound.question_count} questions answered — complete the round`);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      const maxTiebreakerQ = currentRound.question_count + (currentRound.tiebreaker_questions ?? 3);
      if (tiebreakerMode && isPositive && event.current_question > maxTiebreakerQ) {
        showFeedback(`All ${currentRound.tiebreaker_questions ?? 3} tiebreaker questions used — end tiebreaker`);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // ---- Duplicate action guard ----
      const currentQuestionScores = scores.filter(
        (s) => s.round_id === currentRound.id && s.question_number === event.current_question
      );

      if (isPositive) {
        const existingWinner = currentQuestionScores.find((s) => s.winning_team_id !== null);
        if (existingWinner) {
          const winnerTeam = teams.find((t) => t.id === existingWinner.winning_team_id);
          showFeedback(`Q${event.current_question} already won by ${winnerTeam?.name ?? 'a team'}`);
          submittingRef.current = false;
          setSubmitting(false);
          return;
        }
      }

      const duplicateAction = currentQuestionScores.find(
        (s) => s.team_id === teamId && s.action_type === actionType
      );
      if (duplicateAction) {
        const team = teams.find((t) => t.id === teamId);
        showFeedback(`${team?.name ?? 'Team'} already has ${actionType.replace('_', ' ')} on Q${event.current_question}`);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      try {
        const { data: insertedScore, error: insertError } = await supabase.from('scores').insert({
          event_id: eventId,
          round_id: currentRound.id,
          team_id: teamId,
          question_number: event.current_question,
          action_type: actionType,
          points,
          winning_team_id: isPositive ? teamId : null,
        }).select().single();

        if (insertError) throw insertError;

        setScores((prev) => [...prev, insertedScore as Score]);

        let feedbackOverride: string | null = null;

        if (isPositive) {
          if (editingHistoryQuestion && event.current_question === editingHistoryQuestion.targetQuestion) {
            const { originalQuestion } = editingHistoryQuestion;
            await supabase.from('events').update({ current_question: originalQuestion }).eq('id', eventId);
            setEvent((prev) => (prev ? { ...prev, current_question: originalQuestion } : prev));
            setEditingHistoryQuestion(null);
            feedbackOverride = `Q${event.current_question} updated! Back to current.`;
          } else {
            const nextQ = event.current_question + 1;
            await supabase.from('events').update({ current_question: nextQ }).eq('id', eventId);
            setEvent((prev) => (prev ? { ...prev, current_question: nextQ } : prev));

            const updatedTotals = new Map<string, number>();
            teams.forEach(t => {
              const total = scores.filter(s => s.team_id === t.id).reduce((sum, s) => sum + s.points, 0);
              updatedTotals.set(t.id, total);
            });
            updatedTotals.set(teamId, (updatedTotals.get(teamId) || 0) + points);

            if (!tiebreakerMode && nextQ > currentRound.question_count) {
              const sortedTotals = Array.from(updatedTotals.entries())
                .sort(([, a], [, b]) => b - a);
              let tieRank = 1;
              const rankedForTie = sortedTotals.map(([id, score], i) => {
                if (i > 0 && score < sortedTotals[i - 1][1]) tieRank = i + 1;
                return { id, score, rank: tieRank };
              });
              const top3ForTie = rankedForTie.filter(t => t.rank <= 3);
              const tieGroups = new Map<number, string[]>();
              top3ForTie.forEach(t => {
                const existing = tieGroups.get(t.score) || [];
                existing.push(t.id);
                tieGroups.set(t.score, existing);
              });
              let hasTiesNow = false;
              tieGroups.forEach((ids) => { if (ids.length > 1) hasTiesNow = true; });

              if (hasTiesNow) {
                feedbackOverride = 'All questions done — teams are tied! Start a tiebreaker.';
              } else {
                if (autoCompleteTimeout.current) clearTimeout(autoCompleteTimeout.current);
                autoCompleteTimeout.current = setTimeout(() => autoCompleteRound(), 800);
              }
            } else if (tiebreakerMode) {
              const tiebreakerScores = Array.from(tiebreakerTeamIds).map(id => updatedTotals.get(id) || 0);
              const allUnique = new Set(tiebreakerScores).size === tiebreakerScores.length;
              if (allUnique) {
                feedbackOverride = 'Tie broken! Ready to complete round.';
              }
            }
          }
        }

        const team = teams.find((t) => t.id === teamId);
        const teamName = team?.name ?? 'Team';
        const sign = points >= 0 ? '+' : '';
        showFeedback(feedbackOverride ?? `${teamName}: ${sign}${points} pts (${actionType.replace('_', ' ')})`);

        if (undoTimeout.current) clearTimeout(undoTimeout.current);
        setLastAction({
          scoreId: insertedScore.id,
          teamName,
          actionType,
          points,
          wasPositive: isPositive,
        });
        undoTimeout.current = setTimeout(() => setLastAction(null), 30000);

        setAnimatingTeamId(teamId);
        setTimeout(() => setAnimatingTeamId(null), 500);
      } catch (err: unknown) {
        showFeedback(`Error: ${err instanceof Error ? err.message : 'Scoring failed'}`);
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [event, currentRound, eventId, teams, scores, showFeedback, tiebreakerMode, tiebreakerTeamIds, autoCompleteRound, editingHistoryQuestion]
  );

  // ---- Skip question ----
  // Records a 'skip' score entry so skipped questions appear in history
  // and can be re-attended later via the history edit button.
  const handleSkipQuestion = useCallback(async () => {
    if (!event || !currentRound || !eventId || submittingRef.current) return;
    if (currentRound.status !== 'active') return;
    if (event.current_question > currentRound.question_count) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const skippedQ = event.current_question;
      const nextQ = skippedQ + 1;

      // Track skipped question in local state only — no DB insert because
      // the scores table has team_id NOT NULL, and skips have no team.
      setSkippedQuestions((prev) => {
        const roundSkips = new Set(prev[currentRound.id] ?? []);
        roundSkips.add(skippedQ);
        return { ...prev, [currentRound.id]: roundSkips };
      });

      // Advance question counter in DB
      const { error: updateError } = await supabase
        .from('events')
        .update({ current_question: nextQ })
        .eq('id', eventId);
      if (updateError) throw updateError;

      setEvent((prev) => (prev ? { ...prev, current_question: nextQ } : prev));
      showFeedback(`Question ${skippedQ} skipped `);

      // If that was the last question, check for ties before auto-completing
      if (nextQ > currentRound.question_count) {
        const totals = new Map<string, number>();
        teams.forEach(t => {
          const total = scores.filter(s => s.team_id === t.id).reduce((sum, s) => sum + s.points, 0);
          totals.set(t.id, total);
        });
        const sortedTotals = Array.from(totals.entries()).sort(([, a], [, b]) => b - a);
        let tieRank = 1;
        const rankedForTie = sortedTotals.map(([id, score], i) => {
          if (i > 0 && score < sortedTotals[i - 1][1]) tieRank = i + 1;
          return { id, score, rank: tieRank };
        });
        const top3 = rankedForTie.filter(t => t.rank <= 3);
        const tieGroups = new Map<number, string[]>();
        top3.forEach(t => {
          const existing = tieGroups.get(t.score) || [];
          existing.push(t.id);
          tieGroups.set(t.score, existing);
        });
        let hasTiesNow = false;
        tieGroups.forEach((ids) => { if (ids.length > 1) hasTiesNow = true; });

        if (hasTiesNow) {
          showFeedback('All questions done — teams are tied! Start a tiebreaker.');
        } else {
          if (autoCompleteTimeout.current) clearTimeout(autoCompleteTimeout.current);
          autoCompleteTimeout.current = setTimeout(() => autoCompleteRound(), 800);
        }
      }
    } catch (err: unknown) {
      console.error('Skip question error:', err);
      showFeedback(`Error: ${err instanceof Error ? err.message : 'Skip failed'}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [event, currentRound, eventId, showFeedback, autoCompleteRound, teams, scores]);

  // ---- Edit score ----
  const handleEditScore = useCallback(async () => {
    if (!editingScore || !eventId) return;
    const newPts = parseInt(editPoints);
    if (isNaN(newPts)) return;
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('scores')
        .update({ points: newPts })
        .eq('id', editingScore.scoreId);
      if (updateError) throw updateError;

      setScores((prev) =>
        prev.map((s) =>
          s.id === editingScore.scoreId ? { ...s, points: newPts } : s
        )
      );

      showFeedback(`Updated ${editingScore.teamName}: ${newPts} pts`);
      setEditModalOpen(false);
      setEditingScore(null);
      setEditPoints('');
    } catch (err: unknown) {
      showFeedback(`Edit failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }, [editingScore, editPoints, eventId, showFeedback]);

  // ---- Cancel edit history — exit edit mode, restore original question ----
  const handleCancelHistoryEdit = useCallback(async () => {
    if (!editingHistoryQuestion || !eventId) return;
    try {
      await supabase
        .from('events')
        .update({ current_question: editingHistoryQuestion.originalQuestion })
        .eq('id', eventId);
      setEvent((prev) =>
        prev ? { ...prev, current_question: editingHistoryQuestion.originalQuestion } : prev
      );

      // Restore backed up scores
      if (editBackupScores.length > 0) {
        const { error } = await supabase
          .from('scores')
          .insert(editBackupScores);
        if (!error) {
          setScores(prev => [...prev, ...editBackupScores]);
        }
      }

      setEditingHistoryQuestion(null);
      setEditBackupScores([]);
      showFeedback('Edit cancelled — original scores restored');
    } catch (err) {
      console.error('Cancel edit failed:', err);
      // silently reset local state even if DB update fails
      setEditingHistoryQuestion(null);
      setEditBackupScores([]);
      showFeedback('Edit cancelled — returned to current question');
    }
  }, [editingHistoryQuestion, eventId, showFeedback, editBackupScores]);

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
    async (roundId: string) => {
      if (!eventId || !currentRound || roundId === currentRoundId) return;

      setSubmitting(true);
      try {
        const targetRound = rounds.find((r) => r.id === roundId);
        if (!targetRound) return;

        if (currentRound.status === 'active') {
          const newStatusForCurrentRound = 'pending' as const;
          await supabase
            .from('rounds')
            .update({ status: newStatusForCurrentRound })
            .eq('id', currentRound.id);

          setRounds((prev) =>
            prev.map((r) =>
              r.id === currentRound.id ? { ...r, status: newStatusForCurrentRound } : r
            )
          );
        }

        if (targetRound.status !== 'completed') {
          await supabase
            .from('rounds')
            .update({ status: 'active' })
            .eq('id', roundId);

          setRounds((prev) =>
            prev.map((r) =>
              r.id === roundId ? { ...r, status: 'active' as const } : r
            )
          );
        }

        let targetCurrentQuestion = 1;
        if (targetRound.status !== 'completed') {
          const roundWinningScores = scores.filter(
            (s) => s.round_id === roundId && s.winning_team_id
          );
          if (roundWinningScores.length > 0) {
            targetCurrentQuestion =
              Math.max(...roundWinningScores.map((s) => s.question_number)) + 1;
          }
        } else {
          const roundScores = scores.filter((s) => s.round_id === roundId);
          if (roundScores.length > 0) {
            targetCurrentQuestion = Math.max(...roundScores.map((s) => s.question_number)) + 1;
          } else {
            targetCurrentQuestion = targetRound.question_count + 1;
          }
        }

        await supabase
          .from('events')
          .update({ current_round_id: roundId, current_question: targetCurrentQuestion })
          .eq('id', eventId);

        setCurrentRoundId(roundId);
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                current_round_id: roundId,
                current_question: targetCurrentQuestion,
              }
            : prev
        );
        setRoundDropdownOpen(false);
        setLastAction(null);
        setEditingHistoryQuestion(null);
        // Skipped questions are per-round; state is preserved in skippedQuestions map

        const tbState = roundTiebreakerStates[roundId];
        if (tbState) {
          setTiebreakerMode(tbState.mode);
          setTiebreakerTeamIds(tbState.teams);
        } else {
          setTiebreakerMode(false);
          setTiebreakerTeamIds(new Set());
        }

        showFeedback(`Switched to ${targetRound.round_name}`);
      } catch (err: unknown) {
        showFeedback(`Error: ${err instanceof Error ? err.message : 'Failed to switch round'}`);
      } finally {
        setSubmitting(false);
      }
    },
    [currentRound, currentRoundId, eventId, rounds, scores, showFeedback, roundTiebreakerStates]
  );

  // ---- Complete round & activate next ----
  const handleCompleteRound = useCallback(async () => {
    if (!currentRound || !eventId || !event) return;

    const questionsAnswered = event.current_question - 1;
    const totalQuestions = currentRound.question_count;
    if (questionsAnswered < totalQuestions) {
      showFeedback(`Cannot complete: only ${questionsAnswered}/${totalQuestions} questions answered`);
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from('rounds').update({ status: 'completed' }).eq('id', currentRound.id);

      const nextNonCompletedRound = rounds.find(
        (r) => r.round_number > currentRound.round_number && r.status !== 'completed'
      );

      if (nextNonCompletedRound) {
        await supabase
          .from('rounds')
          .update({ status: 'active' })
          .eq('id', nextNonCompletedRound.id);

        await supabase
          .from('events')
          .update({ current_round_id: nextNonCompletedRound.id, current_question: 1 })
          .eq('id', eventId);

        setRounds((prev) =>
          prev.map((r) => {
            if (r.id === currentRound.id) return { ...r, status: 'completed' };
            if (r.id === nextNonCompletedRound.id) return { ...r, status: 'active' };
            return r;
          })
        );
        setCurrentRoundId(nextNonCompletedRound.id);
        setEvent((prev) =>
          (prev ? { ...prev, current_round_id: nextNonCompletedRound.id, current_question: 1 } : prev)
        );
        showFeedback(`Round completed! Now on ${nextNonCompletedRound.round_name}`);
        navigate(`/events/${eventId}/rounds/${currentRound.id}/stats`);
      } else {
        setRounds((prev) =>
          prev.map((r) => (r.id === currentRound.id ? { ...r, status: 'completed' } : r))
        );
        showFeedback('Round completed! View stats or switch rounds.');
        navigate(`/events/${eventId}/rounds/${currentRound.id}/stats`);
      }
    } catch (err: unknown) {
      showFeedback(`Error: ${err instanceof Error ? err.message : 'Failed to complete round'}`);
    } finally {
      setSubmitting(false);
    }
  }, [currentRound, eventId, event, rounds, showFeedback, navigate]);

  // ---- Reopen a completed round ----
  const handleReopenRound = useCallback(async () => {
    if (!currentRound || !eventId || submittingRef.current || !canExecuteReopen) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmReopenOpen(false);
    try {
      await supabase
        .from('rounds')
        .update({ status: 'active' })
        .eq('id', currentRound.id);

      const wasEventCompleted = event?.status === 'completed';

      const nextActiveRound = rounds.find(
        (r) => r.round_number > currentRound.round_number && r.status === 'active'
      );
      if (nextActiveRound) {
        await supabase
          .from('rounds')
          .update({ status: 'pending' })
          .eq('id', nextActiveRound.id);
      }

      const roundWinningScores = scores.filter(
        (s) => s.round_id === currentRound.id && s.winning_team_id
      );
      const maxQ =
        roundWinningScores.length > 0
          ? Math.max(...roundWinningScores.map((s) => s.question_number)) + 1
          : 1;

      const eventUpdates: Record<string, unknown> = {
        current_round_id: currentRound.id,
        current_question: maxQ,
      };
      if (wasEventCompleted) {
        eventUpdates.status = 'active';
      }
      await supabase.from('events').update(eventUpdates).eq('id', eventId);

      setRounds((prev) =>
        prev.map((r) => {
          if (r.id === currentRound.id) return { ...r, status: 'active' as const };
          if (nextActiveRound && r.id === nextActiveRound.id)
            return { ...r, status: 'pending' as const };
          return r;
        })
      );
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              current_round_id: currentRound.id,
              current_question: maxQ,
              ...(wasEventCompleted ? { status: 'active' as const } : {}),
            }
          : prev
      );
      setCurrentRoundId(currentRound.id);
      setLastAction(null);

      showFeedback(`Reopened ${currentRound.round_name} — you can now make corrections`);
    } catch (err: unknown) {
      showFeedback(
        `Error: ${err instanceof Error ? err.message : 'Failed to reopen round'}`
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [currentRound, eventId, event, rounds, scores, canExecuteReopen, showFeedback]);

  // ---- Navigate to stats ----
  const handleViewStats = useCallback(() => {
    if (!eventId || !currentRound) return;

    if (isLastRound) {
      if (incompleteRounds.length > 0) {
        showFeedback(`Cannot view final results: ${incompleteRounds.length} round(s) not completed. Complete all rounds first.`);
        return;
      }
      navigate(`/events/${eventId}/final-stats`);
    } else {
      navigate(`/events/${eventId}/rounds/${currentRound.id}/stats`);
    }
  }, [eventId, currentRound, isLastRound, incompleteRounds.length, navigate, showFeedback]);

  // ---- Start tiebreaker ----
  const handleStartTiebreaker = useCallback((tiedIds: Set<string>) => {
    if (!currentRoundId) return;
    const newState = { mode: true, teams: new Set(tiedIds) };
    setRoundTiebreakerStates(prev => ({ ...prev, [currentRoundId]: newState }));
    setTiebreakerMode(true);
    setTiebreakerTeamIds(tiedIds);
    showFeedback(`Tiebreaker started for ${tiedIds.size} teams`);
  }, [showFeedback, currentRoundId]);

  // ---- End tiebreaker ----
  const handleEndTiebreaker = useCallback(async () => {
    if (!currentRoundId) return;
    setRoundTiebreakerStates(prev => {
      const newStates = { ...prev };
      delete newStates[currentRoundId];
      return newStates;
    });
    setTiebreakerMode(false);
    setTiebreakerTeamIds(new Set());

    setTimeout(() => {
      if (!tiedTeamsInfo.hasTies) {
        autoCompleteRound();
        showFeedback('Tiebreaker complete - round auto-completed!');
      } else {
        showFeedback('Tiebreaker ended - check rankings and complete manually');
      }
    }, 500);
  }, [autoCompleteRound, showFeedback, tiedTeamsInfo.hasTies, currentRoundId]);

  // ---- Loading / Error states ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
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
    <AppLayout className="relative">
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
                  className="mt-0.5 flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
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
                              ? 'bg-cyan-500/20 text-cyan-300'
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

          {/* Center: Question badges — normal + tiebreaker shown separately */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Normal question badge */}
            <motion.div
              key={`normal-${event.current_question}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${
                currentRound?.status === 'completed'
                  ? 'border-slate-500/20 bg-slate-500/10'
                  : editingHistoryQuestion
                  ? 'border-amber-500/30 bg-amber-500/10 ring-2 ring-amber-500/30'
                  : 'border-cyan-500/20 bg-cyan-500/10'
              }`}
            >
              {currentRound?.status === 'completed' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-400">Completed</span>
                  <span className="text-xs text-slate-500">{questionCounts.normal}/{currentRound.question_count} Q</span>
                </>
              ) : editingHistoryQuestion ? (
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">
                    Editing Q{editingHistoryQuestion.targetQuestion}
                  </span>
                  {/* Close/cancel edit mode button */}
                  <button
                    onClick={handleCancelHistoryEdit}
                    className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition-colors"
                    title="Cancel Edit — keep original value"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <Hash className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-400">Question</span>
                  <span className="text-xl font-bold text-cyan-300">
                    {Math.min(event.current_question, currentRound?.question_count ?? event.current_question)}
                  </span>
                  {currentRound && (
                    <span className="text-xs text-slate-500">
                      / {currentRound.question_count}
                    </span>
                  )}
                </>
              )}
            </motion.div>

            {/* Tiebreaker question badge — shown only when tiebreaker questions exist or mode is active */}
            {(tiebreakerMode || questionCounts.tiebreaker > 0) && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400/80">Tiebreaker Q</span>
                {tiebreakerMode ? (
                  <>
                    <span className="text-xl font-bold text-amber-300">
                      {Math.max(1, event.current_question - (currentRound?.question_count ?? 0))}
                    </span>
                    <span className="text-xs text-amber-500/70">
                      / {currentRound?.tiebreaker_questions ?? 3}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold text-amber-300">{questionCounts.tiebreaker}</span>
                    <span className="text-xs text-amber-500/70">attended</span>
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Right: Restart + Shortcuts + History */}
          <div className="flex items-center gap-2">
            {/* Restart Round button — static, always visible for active/completed rounds */}
            {currentRound && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setConfirmRestartOpen(true)}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Restart Round — clears all scores for this round"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </motion.button>
            )}

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
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                  }`}
                >
                  {key === 'name' ? 'Name' : key === 'totalScore' ? 'Total' : 'Round'}
                  {sortKey === key && (sortAsc ? ' ↑' : ' ↓')}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:bg-white/[0.05]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('top5')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterMode === 'top5' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:bg-white/[0.05]'
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
        {/* ---- Tiebreaker Banner ---- */}
        {tiebreakerMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-0 left-0 right-0 z-[55] border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-xl"
          >
            <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-2.5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-300">Tiebreaker Mode</p>
                  <p className="text-[10px] text-amber-400/60">
                    Tiebreaker Q{Math.max(1, event.current_question - (currentRound?.question_count ?? 0))}/{currentRound?.tiebreaker_questions ?? 3}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleEndTiebreaker}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                End Tiebreaker
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ---- Question history sidebar (collapsible) ---- */}
        <AnimatePresence>
          {questionPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 26 }}
              className="mr-5 flex-shrink-0 overflow-hidden"
            >
              <div className="h-full w-[300px] rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question History</h3>
                  <button onClick={() => setQuestionPanelOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Legend */}
                <div className="mb-3 flex items-center gap-3 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-cyan-500/60" />
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500/60" />
                    <span>Tiebreaker</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-slate-500/60" />
                    <span>Skipped</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {questionHistory.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">No history yet</p>
                  )}
                  {questionHistory.map((q) => (
                    <motion.div
                      key={q.questionNumber}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded-xl border overflow-hidden ${
                        q.isSkipped
                          ? 'border-slate-500/20 bg-slate-500/5'
                          : q.isTiebreaker
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-white/[0.04] bg-white/[0.03]'
                      }`}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                        q.isSkipped
                          ? 'border-slate-500/10'
                          : q.isTiebreaker
                          ? 'border-amber-500/10'
                          : 'border-white/[0.04]'
                      }`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                          q.isSkipped
                            ? 'bg-slate-500/20 text-slate-400'
                            : q.isTiebreaker
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {q.questionNumber}
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {q.isTiebreaker && !q.isSkipped && (
                            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 rounded px-1 py-0.5">TB</span>
                          )}
                          {q.isSkipped && (
                            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-500/15 rounded px-1 py-0.5">Skipped</span>
                          )}
                          {q.winnerTeamName && !q.isSkipped && (
                            <span className="text-[10px] text-emerald-400 truncate">Won by {q.winnerTeamName}</span>
                          )}
                        </div>

                        {/* Rebuild/edit button for skipped or any question */}
                        <button
                          disabled={!!editingHistoryQuestion || !!deletingQuestion || currentRound?.status === 'completed'}
                          onClick={async () => {
                            if (!eventId || !currentRoundId || !!editingHistoryQuestion || !!deletingQuestion || currentRound?.status === 'completed') return;

                            setDeletingQuestion(q.questionNumber);
                            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

                            try {
                              const originalQuestion = event!.current_question;

                              // Backup scores before delete
                              const scoresToBackup = scores.filter(
                                (s) => s.round_id === currentRoundId && s.question_number === q.questionNumber
                              );
                              setEditBackupScores(scoresToBackup);

                              // Delete all scores for this question (including skip entries)
                              const { error: deleteError } = await supabase
                                .from('scores')
                                .delete()
                                .eq('round_id', currentRoundId)
                                .eq('question_number', q.questionNumber);

                              if (deleteError) {
                                showFeedback(`Failed to clear Q${q.questionNumber}: ${deleteError.message}`);
                                setDeletingQuestion(null);
                                return;
                              }

                              setScores((prev) =>
                                prev.filter(
                                  (s) => !(s.round_id === currentRoundId && s.question_number === q.questionNumber)
                                )
                              );

                              deleteTimeoutRef.current = setTimeout(() => {
                                setDeletingQuestion(null);
                              }, 500);

                              // Navigate to edit position
                              await supabase
                                .from('events')
                                .update({ current_question: q.questionNumber })
                                .eq('id', eventId);
                              setEvent((prev) =>
                                prev ? { ...prev, current_question: q.questionNumber } : prev
                              );

                              // Enter edit mode
                              setEditingHistoryQuestion({
                                targetQuestion: q.questionNumber,
                                originalQuestion,
                              });

                              // If this was a skipped question, remove it from skip tracking
                              // so the history entry updates from "Skipped" to the new score
                              if (q.isSkipped && currentRound) {
                                setSkippedQuestions((prev) => {
                                  const roundSkips = new Set(prev[currentRound.id] ?? []);
                                  roundSkips.delete(q.questionNumber);
                                  return { ...prev, [currentRound.id]: roundSkips };
                                });
                              }

                              showFeedback(
                                q.isSkipped
                                  ? `Q${q.questionNumber} (skipped) cleared — score teams to attend it now`
                                  : `Q${q.questionNumber} cleared — score teams to rebuild`
                              );
                            } catch (err) {
                              showFeedback(`Edit failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                              setDeletingQuestion(null);
                            }
                          }}
                          className={`ml-1 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-all ${
                            editingHistoryQuestion || deletingQuestion || currentRound?.status === 'completed'
                              ? 'text-slate-500 cursor-not-allowed opacity-40'
                              : q.isSkipped
                              ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 opacity-60 hover:opacity-100'
                              : 'text-amber-400 hover:text-amber-300 hover:bg-sky-500/20 opacity-0 group-hover/action:opacity-100'
                          }`}
                          title={
                            editingHistoryQuestion || deletingQuestion
                              ? 'Finish current operation'
                              : currentRound?.status === 'completed'
                              ? 'Round is completed (read-only)'
                              : q.isSkipped
                              ? 'Attend this skipped question'
                              : 'Rebuild/edit this question'
                          }
                        >
                          {deletingQuestion === q.questionNumber ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Actions list — not shown for pure skip entries */}
                      {!q.isSkipped && q.actions.length > 0 && (
                        <div className="px-2 py-1.5 space-y-1">
                          {q.actions.map((a) => (
                            <div key={a.scoreId} className="flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-white/[0.03] group/action">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-white/80 truncate">{a.teamName}</p>
                                <p className="text-[9px] text-slate-500">
                                  {a.actionType.replace('_', ' ')} · {a.points > 0 ? '+' : ''}{a.points}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                const isTiebreakerTeam = !tiebreakerMode || tiebreakerTeamIds.has(team.id);
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
                  : 'from-cyan-500/60 to-cyan-600/40';

                return (
                  <motion.div
                    key={team.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    layout
                    className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition-all hover:scale-[1.01] ${rankColors} ${isLeader ? 'shadow-[0_0_30px_-5px_rgba(234,179,8,0.15)]' : ''} ${!isTiebreakerTeam ? 'opacity-25 pointer-events-none' : ''}`}
                  >
                    {/* Animated glow on score */}
                    <AnimatePresence>
                      {animatingTeamId === team.id && (
                        <motion.div
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="absolute inset-0 rounded-2xl bg-cyan-500/25 z-0"
                        />
                      )}
                    </AnimatePresence>

                    {/* Card header */}
                    <div className="relative z-10 flex items-start gap-3 p-4 pb-2">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-xl text-sm font-black flex-shrink-0 ${rankBadge}`}>
                        #{rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white truncate">{team.name}</h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{team.lead}</p>
                      </div>
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
                          <span className="text-xs font-semibold text-cyan-400/80 tabular-nums">{team.roundScore >= 0 ? '+' : ''}{team.roundScore}</span>
                          <span className="text-[10px] text-slate-400">this round</span>
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

                    {/* Scoring Buttons — hidden for completed rounds */}
                    {currentRound?.status === 'completed' ? (
                      <div className="relative z-10 px-4 pb-4">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-500/20 bg-slate-500/5 px-3 py-3">
                          <CheckCircle2 className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-400">Round Completed</span>
                        </div>
                      </div>
                    ) : (
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
                          className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-2 py-2 text-cyan-300 transition-all hover:bg-cyan-500/20 hover:shadow-[0_0_12px_-3px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Gift className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Bonus</span>
                          <span className="text-[9px] text-cyan-400/50">custom</span>
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ---- Bottom Actions ---- */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 pb-24">
            {/* View Stats / Final Results */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleViewStats}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              <BarChart3 className="h-4 w-4" />
              {isLastRound ? 'Final Results' : 'Round Stats'}
            </motion.button>

            {/* Skip Question */}
            {currentRound?.status === 'active' && event.current_question <= (currentRound?.question_count ?? 0) && !tiebreakerMode && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSkipQuestion}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl border border-slate-500/30 bg-slate-600/20 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-4 w-4" />
                Skip Question
              </motion.button>
            )}

            {/* Tiebreaker button */}
            {(!tiebreakerMode && !roundTiebreakerStates[currentRoundId ?? '']?.mode) && tiedTeamsInfo.hasTies && currentRound?.status === 'active' && event.current_question > (currentRound?.question_count ?? 0) && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStartTiebreaker(tiedTeamsInfo.tiedTeamIds)}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-semibold text-amber-400 ring-1 ring-amber-500/30 transition-all hover:bg-amber-500/20 hover:shadow-lg"
              >
                <Zap className="h-4 w-4" />
                <span className="font-bold">Top {tiedTeamsInfo.tiedTeamIds.size} teams tied!</span>
                <span className="text-xs">(Start Tiebreaker)</span>
              </motion.button>
            )}

            {/* Complete Round button */}
            {currentRound?.status === 'active' && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCompleteRound}
                disabled={submitting || remainingQuestions > 0}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                  remainingQuestions > 0
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title={remainingQuestions > 0 ? `Solve ${remainingQuestions} more questions first` : 'Complete round and view stats'}
              >
                <CheckCircle2 className={`h-4 w-4 ${remainingQuestions > 0 ? 'text-orange-400' : 'text-emerald-400'}`} />
                {remainingQuestions > 0
                  ? `Complete (${remainingQuestions} left)`
                  : `Complete → Stats`
                }
                {!isLastRound && remainingQuestions <= 0 && <ChevronRight className="h-4 w-4" />}
              </motion.button>
            )}

            {/* Reopen Round */}
            {canReopenRound && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setConfirmReopenOpen(true)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                Reopen Round
              </motion.button>
            )}
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
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-600/20 text-cyan-300 shadow-lg shadow-cyan-500/10 backdrop-blur-xl transition-colors hover:bg-cyan-600/30"
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
            className="fixed bottom-20 left-1/2 z-50 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-xl"
          >
            <span className="text-sm font-medium text-white">{scoringFeedback}</span>
            {lastAction && !undoing && (
              <button
                onClick={handleUndoScore}
                className="ml-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
              >
                Undo
              </button>
            )}
            {undoing && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin text-amber-400" />
            )}
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
                  <Crown className="h-5 w-5 text-cyan-400" />
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
                      ? 'border-b-2 border-cyan-500 text-cyan-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setLeaderboardTab('round')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    leaderboardTab === 'round'
                      ? 'border-b-2 border-cyan-500 text-cyan-300'
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-sm font-black tabular-nums">
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
                  <Gift className="h-5 w-5 text-cyan-400" />
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
      {/*  EDIT SCORE MODAL                                                  */}
      {/* ================================================================== */}
      <AnimatePresence>
        {editModalOpen && editingScore && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditModalOpen(false)}
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
                  <Pencil className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-bold">Edit Score</h3>
                </div>
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingScore(null);
                    setEditPoints('');
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1 text-xs text-slate-500 mb-3">
                <p>Team: <span className="text-white/70 font-medium">{editingScore.teamName}</span></p>
                <p>Action: <span className="text-white/70 font-medium">{editingScore.actionType.replace('_', ' ')}</span></p>
                <p>Current: <span className="text-white/70 font-medium">{editingScore.currentPoints} pts</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">New Points</label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditScore();
                    if (e.key === 'Escape') {
                      setEditModalOpen(false);
                      setEditingScore(null);
                      setEditPoints('');
                    }
                  }}
                  className={inputCls}
                />
              </div>

              <div className="mt-5 flex gap-3">
                {/* Cancel — exits edit mode, keeps original value */}
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingScore(null);
                    setEditPoints('');
                  }}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEditScore}
                  disabled={!editPoints || isNaN(parseInt(editPoints)) || parseInt(editPoints) === editingScore.currentPoints}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Update
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
                <Keyboard className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-300">Shortcuts</h3>
              </div>
              <button onClick={() => setShortcutsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { key: 'Ctrl+Z', desc: 'Undo last score' },
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

      {/* ================================================================== */}
      {/*  RESTART ROUND CONFIRMATION MODAL                                  */}
      {/* ================================================================== */}
      <AnimatePresence>
        {confirmRestartOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmRestartOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <RefreshCw className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Restart Round?</h2>
                  <p className="text-xs text-slate-400">{currentRound?.round_name}</p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-sm text-slate-300">
                  This will permanently clear all scores for this round and reset the question counter to 1.
                </p>
                <div className="space-y-2 text-xs text-slate-400 border-l-2 border-red-500/30 pl-3 py-1 bg-red-500/5 rounded-r-lg">
                  <p className="font-medium text-red-400">This action cannot be undone:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All scores for <span className="text-white/70 font-medium">{currentRound?.round_name}</span> will be deleted</li>
                    <li>Question counter resets to <span className="text-red-300 font-medium">Q1</span></li>
                    <li>Tiebreaker state is cleared</li>
                    {currentRound?.status === 'completed' && (
                      <li>Round status reverts to <span className="text-red-300 font-medium">active</span></li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmRestartOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium hover:bg-white/[0.06] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestartRound}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Restart Round
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/*  REOPEN ROUND CONFIRMATION MODAL                                   */}
      {/* ================================================================== */}
      <AnimatePresence>
        {confirmReopenOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmReopenOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <RotateCcw className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reopen Round?</h2>
                  <p className="text-xs text-slate-400">{currentRound?.round_name}</p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-sm text-slate-300">
                  This will reopen the round so you can make scoring corrections.
                </p>
                <div className="space-y-2 text-xs text-slate-400 border-l-2 border-amber-500/30 pl-3 py-1 bg-amber-500/5 rounded-r-lg">
                  <p>What will happen:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Round status changes back to <span className="text-amber-300 font-medium">active</span></li>
                    {event?.status === 'completed' && (
                      <li>Event status reverts from <span className="text-slate-300">completed</span> to <span className="text-amber-300 font-medium">active</span></li>
                    )}
                    {rounds.find((r) => r.round_number > (currentRound?.round_number ?? 0) && r.status === 'active') && (
                      <li>Next active round pauses back to <span className="text-amber-300 font-medium">pending</span></li>
                    )}
                    <li>Scoring buttons become available again</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmReopenOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium hover:bg-white/[0.06] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopenRound}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen Round
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty AnimatePresence placeholder kept for future modals */}
      <AnimatePresence />
    </AppLayout>
  );
}
