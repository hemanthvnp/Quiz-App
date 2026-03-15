import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Crown, Star, BarChart3, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import Podium from '../components/Podium';
import ScoreBar from '../components/ScoreBar';

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
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Calculating final results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="w-6 h-6 text-violet-400" />
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
              <button
                onClick={() => navigate('/events')}
                className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-slate-300 transition-colors hover:bg-white/[0.06] flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Events
              </button>
            </div>
          </div>
        </header>

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
              <Trophy className="w-5 h-5 text-violet-400" />
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

          {/* Round-wise stats links */}
          {rounds.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-semibold text-slate-300 uppercase tracking-wider">
                  Round Details
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rounds.map((r) => (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/events/${eventId}/rounds/${r.id}/stats`)}
                    className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{r.round_name}</p>
                      <p className="text-xs text-slate-500">Round {r.round_number}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </motion.button>
                ))}
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
              className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors flex items-center gap-2 text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Events
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
