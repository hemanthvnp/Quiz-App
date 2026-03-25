import { motion } from 'framer-motion';

interface BarChartProps {
  data: {
    teamId: string;
    teamName: string;
    score: number;
    rank: number;
  }[];
  height?: number;
}

function getBarGradient(rank: number) {
  switch (rank) {
    case 1: return 'linear-gradient(180deg, #f59e0b, #eab308)';
    case 2: return 'linear-gradient(180deg, #d1d5db, #9ca3af)';
    case 3: return 'linear-gradient(180deg, #d97706, #b45309)';
    default: return 'linear-gradient(180deg, rgba(34,211,238,0.5), rgba(6,182,212,0.3))';
  }
}

function getRankColor(rank: number) {
  switch (rank) {
    case 1: return 'text-yellow-400';
    case 2: return 'text-gray-300';
    case 3: return 'text-amber-600';
    default: return 'text-cyan-400/60';
  }
}

export default function BarChart({ data, height = 300 }: BarChartProps) {
  const maxScore = Math.max(...data.map(d => d.score), 1);
  
  return (
    <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
      <div 
        className="relative flex items-end justify-around gap-2 pt-8"
        style={{ height: `${height}px` }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full border-t border-white/[0.1] relative">
              <span className="absolute -left-1 -top-2.5 text-[10px] text-slate-500 tabular-nums">
                {Math.round((maxScore * (4 - i)) / 4)}
              </span>
            </div>
          ))}
        </div>

        {data.map((item, index) => {
          const barHeightPercent = Math.max((item.score / maxScore) * 100, 2);
          const isTop3 = item.rank <= 3;

          return (
            <div key={item.teamId} className="relative flex flex-col items-center flex-1 h-full group">
              {/* Score label */}
              <motion.span
                className={`absolute -top-7 text-sm font-bold tabular-nums z-10 ${getRankColor(item.rank)}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                {item.score}
              </motion.span>

              {/* Bar Container - spans the height of the chart area minus label space */}
              <div className="flex-1 w-full flex flex-col justify-end items-center relative mb-4">
                <div className="w-full max-w-[40px] h-full flex flex-col justify-end">
                  <motion.div
                    className="w-full rounded-t-lg relative overflow-hidden"
                    style={{ 
                      background: getBarGradient(item.rank),
                      boxShadow: isTop3 ? `0 4px 20px -2px ${item.rank === 1 ? 'rgba(234,179,8,0.3)' : item.rank === 2 ? 'rgba(156,163,175,0.3)' : 'rgba(180,83,9,0.3)'}` : 'none'
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeightPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
                  >
                     {/* Shimmer Effect */}
                     <motion.div
                      className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/20 to-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + index * 0.05 }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Team Name - Fixed at the bottom */}
              <div className="h-10 w-full text-center flex flex-col justify-start">
                <p className={`text-[10px] font-semibold truncate px-1 transition-colors group-hover:text-white ${isTop3 ? 'text-white' : 'text-slate-500'}`}>
                  {item.teamName}
                </p>
                {isTop3 && (
                   <p className={`text-[8px] font-bold uppercase tracking-tighter ${getRankColor(item.rank)}`}>
                    #{item.rank}
                   </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
