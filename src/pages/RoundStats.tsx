import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Trophy, Hash, Zap, Target, AlertCircle, Award, Gift, Minus, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScoreBar from '../components/ScoreBar';
import { AppLayout, AppHeader, LoadingScreen } from '../components/Layout';

interface Round {
  id: string;
  event_id: string;
  round_number: number;
  round_name: string;
  status: string;
  question_count: number;
  bounce_points: number;
  pounce_plus: number;
  pounce_minus: number;
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
  action_type: string;
  points: number;
  winning_team_id: string | null;
  event_id: string;
}

interface TeamRoundScore {
  teamId: string;
  teamName: string;
  roundScore: number;
  rank: number;
}

interface TeamOverallScore {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
}

interface QuestionDetail {
  questionNumber: number;
  actions: { teamName: string; actionType: string; points: number }[];
  winnerName: string | null;
}

const actionMeta: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  bounce: { icon: Zap, color: 'text-emerald-400', label: 'Bounce' },
  pounce_plus: { icon: Target, color: 'text-blue-400', label: 'Pounce+' },
  pounce_minus: { icon: Minus, color: 'text-red-400', label: 'Pounce−' },
  buzzer: { icon: Award, color: 'text-amber-400', label: 'Buzzer' },
  buzzer_minus: { icon: AlertCircle, color: 'text-orange-400', label: 'Buzz−' },
  bonus: { icon: Gift, color: 'text-cyan-400', label: 'Bonus' },
};

export default function RoundStats() {
  const { eventId, roundId } = useParams<{ eventId: string; roundId: string }>();
  const navigate = useNavigate();

  const [round, setRound] = useState<Round | null>(null);
  const [roundScores, setRoundScores] = useState<TeamRoundScore[]>([]);
  const [overallScores, setOverallScores] = useState<TeamOverallScore[]>([]);
  const [questionDetails, setQuestionDetails] = useState<QuestionDetail[]>([]);
  // Removed unused eventData variable
  const [nextRoundId, setNextRoundId] = useState<string | null>(null);
  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [incompleteRounds, setIncompleteRounds] = useState<Round[]>([]);
  const [showFinalResultsModal, setShowFinalResultsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Removed unused isEventCompleted variable

  useEffect(() => {
    if (!eventId || !roundId) return;

    const fetchData = async () => {
      setLoading(true);

      const [eventRes, roundRes, teamsRes, roundScoresRes, allScoresRes, allRoundsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('rounds').select('*').eq('id', roundId).single(),
        supabase.from('teams').select('*').eq('event_id', eventId),
        supabase.from('scores').select('*').eq('round_id', roundId),
        supabase.from('scores').select('*').eq('event_id', eventId),
        supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number', { ascending: true }),
      ]);

      setEventData(eventRes.data);

      const roundData = roundRes.data as Round | null;
      const teamsData = (teamsRes.data as Team[]) || [];
      const roundScoresData = (roundScoresRes.data as Score[]) || [];
      const allScoresData = (allScoresRes.data as Score[]) || [];
      const allRounds = (allRoundsRes.data as Round[]) || [];

      setRound(roundData);

      const teamMap = new Map<string, string>();
      teamsData.forEach((t) => teamMap.set(t.id, t.name));

      // Round scores
      const rScoreMap = new Map<string, number>();
      teamsData.forEach((t) => rScoreMap.set(t.id, 0));
      roundScoresData.forEach((s) => {
        rScoreMap.set(s.team_id, (rScoreMap.get(s.team_id) || 0) + (s.points || 0));
      });
      const rSorted = Array.from(rScoreMap.entries())
        .map(([teamId, roundScore]) => ({ teamId, teamName: teamMap.get(teamId) || 'Unknown', roundScore, rank: 0 }))
        .sort((a, b) => b.roundScore - a.roundScore);
      // Tie-aware ranking
      let rRank = 1;
      rSorted.forEach((e, i) => {
        if (i > 0 && e.roundScore < rSorted[i - 1].roundScore) rRank = i + 1;
        e.rank = rRank;
      });
      setRoundScores(rSorted);

      // Overall cumulative scores (up to and including this round)
      const currentRoundNum = roundData?.round_number ?? 999;
      const roundsUpToNow = new Set(allRounds.filter((r) => r.round_number <= currentRoundNum).map((r) => r.id));
      const oScoreMap = new Map<string, number>();
      teamsData.forEach((t) => oScoreMap.set(t.id, 0));
      allScoresData.forEach((s) => {
        if (roundsUpToNow.has(s.round_id)) {
          oScoreMap.set(s.team_id, (oScoreMap.get(s.team_id) || 0) + (s.points || 0));
        }
      });
      const oSorted = Array.from(oScoreMap.entries())
        .map(([teamId, totalScore]) => ({ teamId, teamName: teamMap.get(teamId) || 'Unknown', totalScore, rank: 0 }))
        .sort((a, b) => b.totalScore - a.totalScore);
      // Tie-aware ranking
      let oRank = 1;
      oSorted.forEach((e, i) => {
        if (i > 0 && e.totalScore < oSorted[i - 1].totalScore) oRank = i + 1;
        e.rank = oRank;
      });
      setOverallScores(oSorted);

      // Question-wise details with all actions
      const qMap = new Map<number, { actions: Score[]; winner: string | null }>();
      roundScoresData.forEach((s) => {
        if (!qMap.has(s.question_number)) {
          qMap.set(s.question_number, { actions: [], winner: null });
        }
        const entry = qMap.get(s.question_number)!;
        entry.actions.push(s);
        if (s.winning_team_id && !entry.winner) {
          entry.winner = s.winning_team_id;
        }
      });
      const qDetails: QuestionDetail[] = Array.from(qMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([qNum, data]) => ({
          questionNumber: qNum,
          actions: data.actions.map((a) => ({
            teamName: teamMap.get(a.team_id) || 'Unknown',
            actionType: a.action_type,
            points: a.points,
          })),
          winnerName: data.winner ? teamMap.get(data.winner) || 'Unknown' : null,
        }));
      setQuestionDetails(qDetails);

      // Store all rounds and calculate incomplete rounds
      setAllRounds(allRounds);
      const incomplete = allRounds.filter((r) => r.status !== 'completed');
      setIncompleteRounds(incomplete);

      // Next round - navigate to event round if next is not completed, to stats if completed
      if (roundData && allRounds.length > 0) {
        const currentIdx = allRounds.findIndex((r) => r.id === roundId);
        if (currentIdx >= 0 && currentIdx < allRounds.length - 1) {
          setNextRoundId(allRounds[currentIdx + 1].id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [eventId, roundId]);

  const handleNextRound = () => {
    if (!nextRoundId) return;
    const nextRound = allRounds.find((r) => r.id === nextRoundId);
    if (!nextRound) return;

    // If next round is completed, go to stats; otherwise go to event round
    if (nextRound.status === 'completed') {
      navigate(`/events/${eventId}/rounds/${nextRoundId}/stats`);
    } else {
      navigate(`/events/${eventId}/rounds`);
    }
  };

  const handleFinalResults = () => {
    setShowFinalResultsModal(true);
  };

  const handleConfirmFinalResults = async () => {
    // Mark all incomplete rounds as completed and complete the event
    try {
      // Update event status to completed
      await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);

      // Mark all incomplete rounds as completed
      await Promise.all(
        incompleteRounds.map((r) =>
          supabase.from('rounds').update({ status: 'completed' }).eq('id', r.id)
        )
      );

      setShowFinalResultsModal(false);
      navigate(`/events/${eventId}/final-stats`);
    } catch (err) {
      console.error('Error completing event:', err);
    }
  };

  if (loading) return <LoadingScreen message="Loading round stats..." />;

  return (
    <AppLayout>
      <AppHeader maxWidth="max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/events/${eventId}/rounds`)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Round Stats</h1>
              {round && (
                <p className="text-sm text-slate-400">
                  {round.round_name || `Round ${round.round_number}`}
                  <span className="mx-2 text-slate-600">·</span>
                  <span className="text-slate-500">{round.question_count} questions</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/events/${eventId}/rounds`)}
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              Back to Rounds
            </button>
            {nextRoundId && (
              <button
                onClick={handleNextRound}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium text-white transition-colors flex items-center gap-2"
              >
                Next Round
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </AppHeader>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* ---- Two-column: Leaderboards ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Round Rankings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-slate-300 uppercase tracking-wider">Round Rankings</h2>
            </div>
            <div className="space-y-2">
              {roundScores.map((ts, idx) => (
                <ScoreBar
                  key={ts.teamId}
                  rank={ts.rank}
                  teamName={ts.teamName}
                  score={ts.roundScore}
                  maxScore={roundScores[0]?.roundScore || 1}
                  index={idx}
                />
              ))}
              {roundScores.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-500 text-sm rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  No scores yet.
                </div>
              )}
            </div>
          </motion.section>

          {/* Overall Standings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-semibold text-slate-300 uppercase tracking-wider">Overall Standings</h2>
            </div>
            <div className="space-y-2">
              {overallScores.map((ts, idx) => (
                <ScoreBar
                  key={ts.teamId}
                  rank={ts.rank}
                  teamName={ts.teamName}
                  score={ts.totalScore}
                  maxScore={overallScores[0]?.totalScore || 1}
                  index={idx}
                />
              ))}
              {overallScores.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-500 text-sm rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  No scores yet.
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* ---- Question-wise Results ---- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Hash className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-300 uppercase tracking-wider">Question Results</h2>
          </div>
          <div className="space-y-3">
            {questionDetails.length > 0 ? (
              questionDetails.map((qd, idx) => (
                <motion.div
                  key={qd.questionNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35, ease: 'easeOut' }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04]">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 font-bold text-sm">
                      Q{qd.questionNumber}
                    </div>
                    {qd.winnerName && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-sm font-semibold text-white">{qd.winnerName}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 flex flex-wrap gap-3">
                    {qd.actions.map((action, ai) => {
                      const meta = actionMeta[action.actionType] || actionMeta.bounce;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={ai}
                          className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.04] px-3 py-2"
                        >
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          <span className="text-xs font-medium text-white/80">{action.teamName}</span>
                          <span className={`text-xs font-bold tabular-nums ${action.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {action.points > 0 ? '+' : ''}{action.points}
                          </span>
                          <span className="text-[10px] text-slate-500">{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-5 py-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center text-slate-500 text-sm">
                No question results available yet.
              </div>
            )}
          </div>
        </motion.section>

        {/* ---- Round Info Bar ---- */}
        {round && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
          >
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Point System</span>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 text-xs"><Zap className="w-3 h-3 text-emerald-400" /> Bounce: <span className="font-bold text-white">{round.bounce_points}</span></span>
              <span className="flex items-center gap-1.5 text-xs"><Target className="w-3 h-3 text-blue-400" /> Pounce+: <span className="font-bold text-white">+{round.pounce_plus}</span></span>
              <span className="flex items-center gap-1.5 text-xs"><Minus className="w-3 h-3 text-red-400" /> Pounce−: <span className="font-bold text-white">{round.pounce_minus}</span></span>
            </div>
          </motion.div>
        )}

        {/* Bottom Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between pt-6 pb-8"
        >
          <button
            onClick={() => navigate(`/events/${eventId}/rounds`)}
            className="px-6 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium transition-colors hover:bg-white/[0.06] flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rounds
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFinalResults}
              className="px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium transition-colors hover:bg-white/[0.06] flex items-center gap-2 text-sm"
            >
              <Trophy className="w-4 h-4" />
              Final Results
            </button>
            {nextRoundId && (
              <button
                onClick={handleNextRound}
                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-2"
              >
                Next Round
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Final Results Confirmation Modal */}
        {showFinalResultsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Go to Final Results?</h2>
                <button
                  onClick={() => setShowFinalResultsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 space-y-4">
                {incompleteRounds.length > 0 ? (
                  <>
                    <p className="text-sm text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        The following rounds are not completed:
                      </span>
                    </p>
                    <div className="ml-6 space-y-2">
                      {incompleteRounds.map((r) => (
                        <p key={r.id} className="text-sm text-slate-300">
                          • {r.round_name}
                        </p>
                      ))}
                    </div>
                    <p className="text-sm text-red-300 border-l-2 border-red-500/50 pl-3 py-2 bg-red-500/10">
                      <strong>Warning:</strong> Clicking "Skip to Final Results" will automatically mark all remaining rounds as completed and skip to final results without checking if questions are answered.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    All rounds are completed. You can now view the final results.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFinalResultsModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium hover:bg-white/[0.06] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmFinalResults}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  {incompleteRounds.length > 0 ? 'Skip to Final Results' : 'View Final Results'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
