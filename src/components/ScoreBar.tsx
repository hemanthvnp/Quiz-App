import { motion } from 'framer-motion';
import Sparkline from './Sparkline';

interface ScoreBarProps {
  rank: number;
  teamName: string;
  score: number;
  maxScore: number;
  index: number;
  sparklineData?: number[];
}

function getBarGradient(rank: number) {
  switch (rank) {
    case 1: return 'linear-gradient(90deg, #eab308, #f59e0b)';
    case 2: return 'linear-gradient(90deg, #9ca3af, #d1d5db)';
    case 3: return 'linear-gradient(90deg, #b45309, #d97706)';
    default: return 'linear-gradient(90deg, rgba(124,58,237,0.5), rgba(139,92,246,0.5))';
  }
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1: return 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/40';
    case 2: return 'bg-gray-300/20 text-gray-300 ring-2 ring-gray-400/40';
    case 3: return 'bg-amber-700/20 text-amber-500 ring-2 ring-amber-600/40';
    default: return 'bg-violet-500/10 text-violet-400/60';
  }
}

function getSparklineColor(rank: number) {
  switch (rank) {
    case 1: return '#facc15';
    case 2: return '#d1d5db';
    case 3: return '#d97706';
    default: return '#a78bfa';
  }
}

export default function ScoreBar({ rank, teamName, score, maxScore, index, sparklineData }: ScoreBarProps) {
  const barPercent = maxScore > 0 ? Math.max((score / maxScore) * 100, 5) : 5;

  return (
    <motion.div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.03] transition-colors"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.4, ease: 'easeOut' }}
    >
      {/* Top row: badge + name + score */}
      <div className="flex items-center gap-3 mb-2">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 ${getRankBadge(rank)}`}>
          {rank}
        </span>
        <span className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{teamName}</span>
        <motion.span
          className="text-lg font-bold tabular-nums text-white flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 + index * 0.1 }}
        >
          {score}
        </motion.span>
      </div>

      {/* Animated bar */}
      <div className="h-7 rounded-lg bg-white/[0.04] overflow-hidden">
        <motion.div
          className="h-full rounded-lg relative"
          style={{ background: getBarGradient(rank) }}
          initial={{ width: '0%' }}
          animate={{ width: `${barPercent}%` }}
          transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.2, delay: 0.8 + index * 0.1, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* Sparkline (optional) */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-slate-500 flex-shrink-0">Rounds</span>
          <Sparkline data={sparklineData} width={120} height={28} color={getSparklineColor(rank)} />
        </div>
      )}
    </motion.div>
  );
}
