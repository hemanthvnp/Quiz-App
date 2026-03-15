import { motion } from 'framer-motion';
import { Crown, Trophy, Star } from 'lucide-react';

interface PodiumEntry {
  teamName: string;
  totalScore: number;
  rank: 1 | 2 | 3;
}

interface PodiumProps {
  entries: PodiumEntry[];
}

const config: Record<number, {
  height: number; mobileHeight: number;
  gradient: string; topFace: string; sideFace: string;
  scoreColor: string; delay: number;
  Icon: typeof Crown;
}> = {
  1: {
    height: 200, mobileHeight: 150,
    gradient: 'linear-gradient(180deg, #facc15, #eab308)',
    topFace: '#fde047', sideFace: '#ca8a04',
    scoreColor: 'text-yellow-300', delay: 0.3,
    Icon: Crown,
  },
  2: {
    height: 150, mobileHeight: 110,
    gradient: 'linear-gradient(180deg, #d1d5db, #9ca3af)',
    topFace: '#e5e7eb', sideFace: '#6b7280',
    scoreColor: 'text-gray-200', delay: 0.5,
    Icon: Trophy,
  },
  3: {
    height: 110, mobileHeight: 80,
    gradient: 'linear-gradient(180deg, #d97706, #b45309)',
    topFace: '#f59e0b', sideFace: '#92400e',
    scoreColor: 'text-amber-300', delay: 0.7,
    Icon: Star,
  },
};

export default function Podium({ entries }: PodiumProps) {
  if (entries.length === 0) return null;

  // Arrange: 2nd, 1st, 3rd
  const displayOrder = [
    entries.find((e) => e.rank === 2),
    entries.find((e) => e.rank === 1),
    entries.find((e) => e.rank === 3),
  ].filter(Boolean) as PodiumEntry[];

  return (
    <div className="mb-12">
      <div
        className="flex items-end justify-center gap-3 sm:gap-5 mx-auto max-w-md"
        style={{ perspective: '800px', perspectiveOrigin: '50% 40%' }}
      >
        {displayOrder.map((entry) => {
          const c = config[entry.rank];
          const Icon = c.Icon;

          return (
            <div key={entry.rank} className="flex flex-col items-center">
              {/* Floating label above */}
              <motion.div
                className="text-center mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: c.delay + 0.6, duration: 0.4 }}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${
                  entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : 'text-amber-500'
                }`} />
                <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[100px] sm:max-w-[130px]">
                  {entry.teamName}
                </p>
                <p className={`text-sm sm:text-lg font-extrabold ${c.scoreColor}`}>
                  {entry.totalScore}
                </p>
              </motion.div>

              {/* 3D Block */}
              <motion.div
                className="relative w-24 sm:w-32 rounded-t-lg overflow-visible"
                style={{
                  transformStyle: 'preserve-3d',
                  background: c.gradient,
                }}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: window.innerWidth < 640 ? c.mobileHeight : c.height, opacity: 1 }}
                transition={{
                  height: { duration: 0.8, delay: c.delay, ease: [0.34, 1.56, 0.64, 1] },
                  opacity: { duration: 0.3, delay: c.delay },
                }}
              >
                {/* Top face for 3D depth */}
                <div
                  className="absolute left-0 right-0 top-0 h-4 rounded-t-lg"
                  style={{
                    transform: 'rotateX(70deg)',
                    transformOrigin: 'bottom center',
                    background: c.topFace,
                  }}
                />
                {/* Right side face */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 rounded-tr-lg"
                  style={{
                    transform: 'rotateY(-55deg)',
                    transformOrigin: 'left center',
                    background: c.sideFace,
                  }}
                />

                {/* Rank number centered in block */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  transition={{ delay: c.delay + 0.5 }}
                >
                  <span className="text-5xl sm:text-6xl font-black text-white">
                    {entry.rank}
                  </span>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
