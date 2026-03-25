import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Crown, Star, BarChart3, ChevronRight, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import Podium from '../components/Podium';
import ScoreBar from '../components/ScoreBar';
import { AppLayout, AppHeader, LoadingScreen } from '../components/Layout';

interface Event {
  id: string;
  name: string;
  status: string;
}

interface Round {
  id: string;
  round_name: string;
  round_number: number;
  event_id: string;
  question_count: number;
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
  points: number;
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  roundScores: Record<string, number>; // roundId -> score
  rank: number;
}

export default function FinalStats() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [startingTiebreaker, setStartingTiebreaker] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      setLoading(true);

      const [eventRes, roundsRes, teamsRes, scoresRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
        supabase.from('teams').select('*').eq('event_id', eventId),
        supabase.from('scores').select('*').eq('event_id', eventId),
      ]);

      const eventData = eventRes.data as Event | null;
      const roundsData = (roundsRes.data as Round[]) || [];
      const teamsData = (teamsRes.data as Team[]) || [];
      const scoresData = (scoresRes.data as Score[]) || [];

      setEvent(eventData);
      setRounds(roundsData);

      const teamMap = new Map<string, string>();
      teamsData.forEach((t) => teamMap.set(t.id, t.name));

      // Build per-team per-round scores
      const teamRoundScores = new Map<string, Record<string, number>>();
      const teamTotals = new Map<string, number>();
      teamsData.forEach((t) => {
        teamRoundScores.set(t.id, {});
        teamTotals.set(t.id, 0);
      });

      scoresData.forEach((s) => {
        const rs = teamRoundScores.get(s.team_id);
        if (rs) {
          rs[s.round_id] = (rs[s.round_id] || 0) + (s.points || 0);
        }
        teamTotals.set(s.team_id, (teamTotals.get(s.team_id) || 0) + (s.points || 0));
      });

      const sorted = Array.from(teamTotals.entries())
        .map(([teamId, totalScore]) => ({
          teamId,
          teamName: teamMap.get(teamId) || 'Unknown',
          totalScore,
          roundScores: teamRoundScores.get(teamId) || {},
          rank: 0,
        }))
        .sort((a, b) => b.totalScore - a.totalScore);

      // Tie-aware ranking: teams with equal scores share the same rank
      let currentRank = 1;
      sorted.forEach((entry, idx) => {
        if (idx > 0 && entry.totalScore < sorted[idx - 1].totalScore) {
          currentRank = idx + 1;
        }
        entry.rank = currentRank;
      });

      setLeaderboard(sorted);
      setLoading(false);
    };

    fetchData();
  }, [eventId]);

  const handleMarkCompleted = async () => {
    if (!eventId || marking) return;
    setMarking(true);
    await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
    setEvent((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    setMarking(false);
  };

  const handleReopenEvent = async () => {
    if (!eventId || marking) return;
    setMarking(true);
    await supabase.from('events').update({ status: 'active' }).eq('id', eventId);
    setEvent((prev) => (prev ? { ...prev, status: 'active' } : prev));
    setMarking(false);
  };

  const handleStartTiebreaker = async () => {
    if (!eventId || startingTiebreaker || rounds.length === 0) return;
    setStartingTiebreaker(true);
    try {
      const lastRound = rounds[rounds.length - 1];

      // Reopen last round
      await supabase.from('rounds').update({ status: 'active' }).eq('id', lastRound.id);

      // Reactivate event, point to last round, set question beyond count so tiebreaker triggers
      await supabase.from('events').update({
        status: 'active',
        current_round_id: lastRound.id,
        current_question: lastRound.question_count + 1,
      }).eq('id', eventId);

      navigate(`/events/${eventId}/rounds`);
    } catch {
      setStartingTiebreaker(false);
    }
  };

  const handleRestartEvent = async () => {
    if (!eventId || restarting) return;
    setRestarting(true);
    try {
      // Delete all scores
      await supabase.from('scores').delete().eq('event_id', eventId);
      // Reset all rounds to pending
      await supabase.from('rounds').update({ status: 'pending' }).eq('event_id', eventId);
      // Reset event
      const firstRound = rounds.length > 0 ? rounds[0] : null;
      await supabase.from('events').update({
        status: 'upcoming',
        current_round_id: firstRound?.id ?? null,
        current_question: 0,
      }).eq('id', eventId);
      setConfirmRestart(false);
      navigate(`/events`);
    } catch {
      setRestarting(false);
      setConfirmRestart(false);
    }
  };

  useEffect(() => {
    if (!loading && leaderboard.length > 0 && !confettiFired.current) {
      confettiFired.current = true;

      const duration = 4000;
      const end = Date.now() + duration;

      const fireConfetti = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#ffd700', '#a78bfa', '#34d399', '#c0c0c0', '#cd7f32'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#ffd700', '#a78bfa', '#34d399', '#c0c0c0', '#cd7f32'],
        });
        if (Date.now() < end) requestAnimationFrame(fireConfetti);
      };

      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#a78bfa', '#34d399', '#c0c0c0', '#cd7f32'],
      });
      fireConfetti();
    }
  }, [loading, leaderboard]);

  const winner = leaderboard.length > 0 ? leaderboard[0] : null;

  // Detect if there are ties in top 3 positions
  const hasTies = leaderboard.length > 1 && leaderboard.some((e, i) => i > 0 && e.rank <= 3 && e.rank === leaderboard[i - 1].rank);

  if (loading) return <LoadingScreen message="Calculating final results..." />;

  return (
    <AppLayout className="overflow-hidden">
      <div className="relative z-10">
        <AppHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="w-6 h-6 text-cyan-400" />
              <div>
                <h1 className="text-lg font-bold">Final Results</h1>
                {event && <p className="text-sm text-slate-400">{event.name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {event && event.status !== 'completed' && (
                <button
                  onClick={handleMarkCompleted}
                  disabled={marking}
                  className="px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {marking ? 'Marking...' : 'Mark Completed'}
                </button>
              )}
              {event && event.status === 'completed' && (
                <button
                  onClick={handleReopenEvent}
                  disabled={marking}
                  className="px-4 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {marking ? 'Reopening...' : 'Reopen Event'}
                </button>
              )}
              {event && (
                <button
                  onClick={() => setConfirmRestart(true)}
                  className="px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restart Event
                </button>
              )}
              <button
                onClick={() => navigate('/events')}
                className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-slate-300 transition-colors hover:bg-white/[0.06] flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Events
              </button>
            </div>
          </div>
        </AppHeader>

        <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
          {/* Winner Announcement */}
          <AnimatePresence>
            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' as const }}
                className="text-center space-y-4"
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 1.5, delay: 1, ease: 'easeInOut' as const }}
                  className="inline-block"
                >
                  <Crown className="w-16 h-16 text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-400 text-sm uppercase tracking-[0.2em] font-medium"
                >
                  Winner
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent"
                >
                  {winner.teamName}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center justify-center gap-2 text-yellow-400/80"
                >
                  <Star className="w-5 h-5 fill-yellow-400/50" />
                  <span className="text-2xl font-bold">{winner.totalScore} points</span>
                  <Star className="w-5 h-5 fill-yellow-400/50" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Podium */}
          {leaderboard.length >= 2 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Podium
                entries={leaderboard.slice(0, Math.min(3, leaderboard.length)).map((e) => ({
                  teamName: e.teamName,
                  totalScore: e.totalScore,
                  rank: e.rank as 1 | 2 | 3,
                }))}
              />
            </motion.section>
          )}

          {/* Final Rankings — Score Bars with Sparklines */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-slate-300 uppercase tracking-wider">
                Final Rankings
              </h3>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, idx) => (
                <ScoreBar
                  key={entry.teamId}
                  rank={entry.rank}
                  teamName={entry.teamName}
                  score={entry.totalScore}
                  maxScore={leaderboard[0]?.totalScore || 1}
                  index={idx}
                  sparklineData={rounds.length > 0 ? rounds.map((r) => entry.roundScores[r.id] || 0) : undefined}
                />
              ))}
              {leaderboard.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-500 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  No scores recorded.
                </div>
              )}
            </div>
          </motion.section>

          {/* Tiebreaker Notice */}
          {hasTies && event && event.status !== 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Tie Detected</p>
                  <p className="text-xs text-amber-400/60">Some teams share the same score. Start a tiebreaker to resolve it.</p>
                </div>
              </div>
              <button
                onClick={handleStartTiebreaker}
                disabled={startingTiebreaker}
                className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                {startingTiebreaker ? 'Opening...' : 'Start Tiebreaker'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Round-wise Bar Graphs */}
          {rounds.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-slate-300 uppercase tracking-wider">
                  Round Breakdown
                </h3>
              </div>
              <div className="space-y-8">
                {rounds.map((r, roundIdx) => {
                  // Get scores for this round sorted by score
                  const roundTeamScores = leaderboard
                    .map((entry) => ({
                      teamId: entry.teamId,
                      teamName: entry.teamName,
                      roundScore: entry.roundScores[r.id] || 0,
                    }))
                    .sort((a, b) => b.roundScore - a.roundScore);

                  // Calculate rank with ties
                  let currentRank = 1;
                  const rankedScores = roundTeamScores.map((entry, idx) => {
                    if (idx > 0 && entry.roundScore < roundTeamScores[idx - 1].roundScore) {
                      currentRank = idx + 1;
                    }
                    return { ...entry, rank: currentRank };
                  });

                  const maxRoundScore = rankedScores[0]?.roundScore || 1;

                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 + roundIdx * 0.1 }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-sm">
                            {r.round_number}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{r.round_name}</p>
                            <p className="text-xs text-slate-500">{r.question_count} questions</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/events/${eventId}/rounds/${r.id}/stats`)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          Details <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {rankedScores.map((entry, idx) => (
                          <ScoreBar
                            key={entry.teamId}
                            rank={entry.rank}
                            teamName={entry.teamName}
                            score={entry.roundScore}
                            maxScore={maxRoundScore}
                            index={idx}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Bottom Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex justify-center pt-4 pb-8"
          >
            <button
              onClick={() => navigate('/events')}
              className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-2 text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Events
            </button>
          </motion.div>
        </main>
      </div>

      {/* Restart Confirmation Modal */}
      <AnimatePresence>
        {confirmRestart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !restarting && setConfirmRestart(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Restart Event?</h3>
                  <p className="text-sm text-slate-400">
                    This will <span className="text-red-400 font-semibold">delete all scores</span> and reset all rounds. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setConfirmRestart(false)}
                    disabled={restarting}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-medium text-slate-400 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestartEvent}
                    disabled={restarting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {restarting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Restarting...
                      </>
                    ) : (
                      'Yes, Restart'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
