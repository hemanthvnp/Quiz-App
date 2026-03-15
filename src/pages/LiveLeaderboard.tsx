import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Trophy, Zap, Crown, Monitor } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { AppLayout } from '../components/Layout';

interface Event {
  id: string;
  name: string;
  status: string;
  current_round: number;
  current_question: number;
}

interface Team {
  id: string;
  name: string;
  event_id: string;
}

interface Score {
  id: string;
  round_id: string;
  team_id: string;
  question_number: number;
  points: number;
  winning_team_id: string | null;
  event_id: string;
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  previousRank: number | null;
  flashActive: boolean;
}

interface LatestResult {
  questionNumber: number;
  teamName: string;
  timestamp: number;
}

export default function LiveLeaderboard() {
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [, setScores] = useState<Score[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [latestResult, setLatestResult] = useState<LatestResult | null>(null);
  const [eventCompleted, setEventCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const prevScoreMapRef = useRef<Map<string, number>>(new Map());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const confettiFired = useRef(false);
  const teamMapRef = useRef<Map<string, string>>(new Map());

  const buildLeaderboard = useCallback(
    (
      teamsData: Team[],
      scoresData: Score[],
      prevLeaderboard: LeaderboardEntry[]
    ): LeaderboardEntry[] => {
      const teamMap = new Map<string, string>();
      teamsData.forEach((t) => teamMap.set(t.id, t.name));
      teamMapRef.current = teamMap;

      const scoreMap = new Map<string, number>();
      teamsData.forEach((t) => scoreMap.set(t.id, 0));
      scoresData.forEach((s) => {
        const current = scoreMap.get(s.team_id) || 0;
        scoreMap.set(s.team_id, current + (s.points || 0));
      });

      const changedTeams = new Set<string>();
      scoreMap.forEach((score, teamId) => {
        const prev = prevScoreMapRef.current.get(teamId);
        if (prev !== undefined && prev !== score) {
          changedTeams.add(teamId);
        }
      });
      prevScoreMapRef.current = new Map(scoreMap);

      const prevRankMap = new Map<string, number>();
      prevLeaderboard.forEach((e) => prevRankMap.set(e.teamId, e.rank));

      const sorted = Array.from(scoreMap.entries())
        .map(([teamId, totalScore]) => ({
          teamId,
          teamName: teamMap.get(teamId) || 'Unknown',
          totalScore,
          rank: 0,
          previousRank: prevRankMap.get(teamId) ?? null,
          flashActive: changedTeams.has(teamId),
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

      changedTeams.forEach((teamId) => {
        const existing = flashTimers.current.get(teamId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setLeaderboard((prev) =>
            prev.map((e) => (e.teamId === teamId ? { ...e, flashActive: false } : e))
          );
          flashTimers.current.delete(teamId);
        }, 2000);
        flashTimers.current.set(teamId, timer);
      });

      return sorted;
    },
    []
  );

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      setLoading(true);

      const [eventRes, teamsRes, scoresRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('teams').select('*').eq('event_id', eventId),
        supabase.from('scores').select('*').eq('event_id', eventId),
      ]);

      const eventData = eventRes.data as Event | null;
      const teamsData = (teamsRes.data as Team[]) || [];
      const scoresData = (scoresRes.data as Score[]) || [];

      setEvent(eventData);
      setTeams(teamsData);
      setScores(scoresData);

      if (eventData?.status === 'completed') {
        setEventCompleted(true);
      }

      const lb = buildLeaderboard(teamsData, scoresData, []);
      setLeaderboard(lb);
      setLoading(false);
    };

    fetchData();
  }, [eventId, buildLeaderboard]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel('live-scores')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setScores((prevScores) => {
            let updated: Score[];
            if (payload.eventType === 'INSERT') {
              const newScore = payload.new as Score;
              updated = [...prevScores, newScore];

              if (newScore.winning_team_id) {
                const winnerName =
                  teamMapRef.current.get(newScore.winning_team_id) || 'Unknown';
                setLatestResult({
                  questionNumber: newScore.question_number,
                  teamName: winnerName,
                  timestamp: Date.now(),
                });
                setTimeout(() => {
                  setLatestResult((prev) =>
                    prev && Date.now() - prev.timestamp >= 4900 ? null : prev
                  );
                }, 5000);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedScore = payload.new as Score;
              updated = prevScores.map((s) =>
                s.id === updatedScore.id ? updatedScore : s
              );
            } else if (payload.eventType === 'DELETE') {
              const oldScore = payload.old as { id: string };
              updated = prevScores.filter((s) => s.id !== oldScore.id);
            } else {
              updated = prevScores;
            }

            setLeaderboard((prevLb) => buildLeaderboard(teams, updated, prevLb));
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updatedEvent = payload.new as Event;
          setEvent(updatedEvent);
          if (updatedEvent.status === 'completed') {
            setEventCompleted(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, teams, buildLeaderboard]);

  useEffect(() => {
    if (eventCompleted && !confettiFired.current && leaderboard.length > 0) {
      confettiFired.current = true;

      const duration = 6000;
      const end = Date.now() + duration;

      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#22d3ee', '#34d399', '#c0c0c0', '#cd7f32'],
      });

      const fireConfetti = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#ffd700', '#22d3ee', '#34d399', '#c0c0c0', '#cd7f32'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#ffd700', '#22d3ee', '#34d399', '#c0c0c0', '#cd7f32'],
        });
        if (Date.now() < end) {
          requestAnimationFrame(fireConfetti);
        }
      };
      fireConfetti();
    }
  }, [eventCompleted, leaderboard]);

  useEffect(() => {
    return () => {
      flashTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-500';
      default: return 'text-cyan-400';
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/[0.04] border-yellow-500/15';
      case 2: return 'bg-gray-400/[0.03] border-gray-400/15';
      case 3: return 'bg-amber-700/[0.03] border-amber-600/15';
      default: return 'bg-white/[0.02] border-white/[0.06]';
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/40 scale-110';
      case 2: return 'bg-gray-300/20 text-gray-300 ring-2 ring-gray-400/40';
      case 3: return 'bg-amber-700/20 text-amber-500 ring-2 ring-amber-600/40';
      default: return 'bg-cyan-500/10 text-cyan-400/60';
    }
  };

  const winner = leaderboard.length > 0 ? leaderboard[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-3 text-cyan-400 text-xl"
        >
          <Monitor className="w-7 h-7" />
          Connecting to live feed...
        </motion.div>
      </div>
    );
  }

  return (
    <AppLayout className="overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl px-8 py-5"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Trophy className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {event?.name || 'Live Leaderboard'}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  {event?.current_round && (
                    <span className="text-sm text-slate-400">
                      Round {event.current_round}
                    </span>
                  )}
                  {event?.current_question && (
                    <span className="text-sm text-slate-400">
                      Question {event.current_question}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/20"
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-400 uppercase tracking-wider">
                  Live
                </span>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Latest Question Result Banner */}
        <AnimatePresence>
          {latestResult && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-8 pt-4">
                <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
                  <Zap className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                  <span className="text-lg text-white">
                    Question {latestResult.questionNumber}
                  </span>
                  <span className="text-white/40 text-lg">&rarr;</span>
                  <span className="text-lg font-bold text-cyan-300">
                    {latestResult.teamName}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Completed — Winner Banner */}
        <AnimatePresence>
          {eventCompleted && winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="max-w-6xl mx-auto px-8 pt-6"
            >
              <div className="relative text-center py-8 rounded-2xl bg-yellow-500/[0.04] border border-yellow-500/15 backdrop-blur-md">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -8, 0] }}
                  transition={{ duration: 2, delay: 1, ease: 'easeInOut' as const }}
                >
                  <Crown className="w-16 h-16 text-yellow-400 mx-auto drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]" />
                </motion.div>
                <p className="text-slate-400 uppercase tracking-[0.2em] font-medium mt-3 text-sm">
                  Winner
                </p>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-5xl font-extrabold bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mt-2"
                >
                  {winner.teamName}
                </motion.h2>
                <p className="text-yellow-400 text-xl font-bold mt-2">
                  {winner.totalScore} points
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-6">
          <LayoutGroup>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry) => (
                  <motion.div
                    key={entry.teamId}
                    layout
                    layoutId={entry.teamId}
                    initial={{ opacity: 0, x: -40 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: entry.flashActive
                        ? 'rgba(6, 182, 212, 0.1)'
                        : 'rgba(255, 255, 255, 0)',
                    }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{
                      layout: { type: 'spring' as const, stiffness: 300, damping: 30 },
                      opacity: { duration: 0.4 },
                      backgroundColor: { duration: 0.3 },
                    }}
                    className={`relative flex items-center gap-6 px-8 py-5 rounded-2xl border backdrop-blur-md transition-shadow ${getRankBg(
                      entry.rank
                    )} ${entry.flashActive ? 'ring-2 ring-cyan-500/40' : ''}`}
                  >
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl ${getRankBadge(
                        entry.rank
                      )}`}
                    >
                      {entry.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-2xl font-bold truncate ${
                          entry.rank === 1 ? 'text-yellow-300' : 'text-white'
                        }`}
                      >
                        {entry.teamName}
                      </h3>
                      {entry.previousRank !== null &&
                        entry.previousRank !== entry.rank && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-sm font-medium ${
                              entry.rank < entry.previousRank
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {entry.rank < entry.previousRank
                              ? `\u25B2 Up from #${entry.previousRank}`
                              : `\u25BC Down from #${entry.previousRank}`}
                          </motion.span>
                        )}
                    </div>

                    <div className="text-right">
                      <motion.span
                        key={entry.totalScore}
                        initial={entry.flashActive ? { scale: 1.3 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' as const, stiffness: 300 }}
                        className={`text-4xl font-extrabold tabular-nums ${getRankColor(
                          entry.rank
                        )}`}
                      >
                        {entry.totalScore}
                      </motion.span>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                        points
                      </p>
                    </div>

                    <AnimatePresence>
                      {entry.flashActive && (
                        <motion.div
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5 }}
                          className="absolute inset-0 rounded-2xl bg-cyan-500/15 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {leaderboard.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 text-slate-500 text-xl"
                >
                  Waiting for scores...
                </motion.div>
              )}
            </div>
          </LayoutGroup>
        </main>

        <footer className="text-center py-4 text-slate-600 text-sm border-t border-white/[0.04]">
          QFactor Live Leaderboard
        </footer>
      </div>
    </AppLayout>
  );
}
