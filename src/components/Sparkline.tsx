import { useId } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 120, height = 32, color = '#a78bfa' }: SparklineProps) {
  const id = useId();
  const pad = 4;

  if (data.length <= 1) {
    return (
      <svg width={width} height={height} className="inline-block">
        <circle cx={width / 2} cy={height / 2} r={3} fill={color} />
      </svg>
    );
  }

  const dw = width - pad * 2;
  const dh = height - pad * 2;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * dw,
    y: pad + dh - ((v - minV) / range) * dh,
  }));

  const polyStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Polygon for area fill (close to bottom)
  const areaStr = `${pts[0].x},${height - pad} ${polyStr} ${pts[pts.length - 1].x},${height - pad}`;

  // Compute total line length for dash animation
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    totalLen += Math.sqrt((pts[i].x - pts[i - 1].x) ** 2 + (pts[i].y - pts[i - 1].y) ** 2);
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block" aria-hidden>
      <defs>
        <linearGradient id={`sf-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      <motion.polygon
        points={areaStr}
        fill={`url(#sf-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />

      <motion.polyline
        points={polyStr}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ strokeDasharray: totalLen, strokeDashoffset: totalLen }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }}
      />

      {pts.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: i === data.length - 1 ? 1 : 0.6, scale: 1 }}
          transition={{ delay: 0.5 + (i / data.length) * 0.8, duration: 0.3 }}
        />
      ))}
    </svg>
  );
}
