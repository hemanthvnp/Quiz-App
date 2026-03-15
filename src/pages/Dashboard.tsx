import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Plus, Eye, LogOut, Trophy, Users, Activity, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppLayout, AppHeader } from '../components/Layout';

/* ================================================================== */
/*  Animated counter                                                   */
/* ================================================================== */
function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (value === 0 && !started.current) return;
    started.current = true;
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}

/* ================================================================== */
/*  Glowing stat card                                                  */
/* ================================================================== */
function StatCard({
  label, value, icon: Icon, gradient, glowColor, delay,
}: {
  label: string; value: number; icon: React.ElementType; gradient: string; glowColor: string; delay: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotlightX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const spotlightY = useSpring(mouseY, { stiffness: 100, damping: 20 });

  const spotlight = useTransform(
    [spotlightX, spotlightY] as never,
    ([x, y]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${glowColor} 0%, transparent 70%)`
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
    >
      {/* Mouse spotlight */}
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: spotlight }} />

      {/* Running shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 45%, transparent 50%)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, delay: delay + 1, repeat: Infinity, repeatDelay: 6 }}
      />

      {/* Top glow line */}
      <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent ${gradient} to-transparent opacity-40 group-hover:opacity-80 transition-opacity`} />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            style={{ boxShadow: `0 8px 32px ${glowColor}` }}
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>

          {/* Decorative ring */}
          <motion.div
            className="w-10 h-10 rounded-full border border-white/[0.04]"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <div className={`absolute top-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r ${gradient}`} />
          </motion.div>
        </div>

        <p className="text-4xl font-extrabold text-white mb-1 tabular-nums">
          <AnimatedNumber value={value} />
        </p>
        <p className="text-sm text-slate-400 font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Action card                                                        */
/* ================================================================== */
function ActionCard({
  title, description, icon: Icon, gradient, onClick, delay,
}: {
  title: string; description: string; icon: React.ElementType; gradient: string; onClick: () => void; delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-7 text-left overflow-hidden transition-colors hover:border-white/[0.12] cursor-pointer"
    >
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {/* Running border glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className={`p-3 rounded-2xl bg-gradient-to-br ${gradient.replace('from-', 'from-').replace('/[0.03]', '/10').replace('/[0.06]', '/15')} border border-white/[0.08]`}
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>

          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="w-5 h-5 text-white/60" />
          </motion.div>
        </div>

        <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">{description}</p>
      </div>
    </motion.button>
  );
}

/* ================================================================== */
/*  Floating particle                                                  */
/* ================================================================== */
function FloatingParticle({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-cyan-400/20 pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{ y: [0, -20, 10, -15, 0], x: [0, 10, -8, 5, 0], opacity: [0.2, 0.5, 0.2] }}
      transition={{ duration: 8 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

const particles = [
  { x: '10%', y: '20%', size: 4, delay: 0 },
  { x: '85%', y: '15%', size: 3, delay: 2 },
  { x: '70%', y: '65%', size: 5, delay: 4 },
  { x: '25%', y: '75%', size: 3, delay: 1 },
  { x: '50%', y: '40%', size: 4, delay: 3 },
  { x: '92%', y: '50%', size: 3, delay: 5 },
];

/* ================================================================== */
/*  Dashboard                                                          */
/* ================================================================== */
export default function Dashboard() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { replace: true }); return; }
    const load = async () => {
      const [e, a, t] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
      ]);
      setTotalEvents(e.count ?? 0);
      setActiveEvents(a.count ?? 0);
      setTotalTeams(t.count ?? 0);
    };
    load();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      <AppHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-rose-600 flex items-center justify-center shadow-lg shadow-cyan-600/20"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-extrabold text-white">Q</span>
            </motion.div>
            <div>
              <span className="text-lg font-bold text-white">QFactor</span>
              <span className="hidden sm:inline text-xs text-slate-500 ml-2">Quiz Management</span>
            </div>
          </div>
          <motion.button
            onClick={() => logout()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </motion.button>
        </div>
      </AppHeader>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Floating particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}
        </div>

        {/* Welcome Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-12 relative"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
            </motion.div>
            <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest">Welcome back</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 leading-tight">
            Dashboard
          </h1>
          <p className="text-slate-400 text-lg">Manage your quiz events and track performance</p>

          {/* Decorative gradient line */}
          <motion.div
            className="mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-600 via-rose-500 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: 96 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          <StatCard
            label="Total Events"
            value={totalEvents}
            icon={Trophy}
            gradient="from-cyan-600 to-cyan-400"
            glowColor="rgba(6,182,212,0.15)"
            delay={0.1}
          />
          <StatCard
            label="Active Events"
            value={activeEvents}
            icon={Activity}
            gradient="from-emerald-600 to-emerald-400"
            glowColor="rgba(16,185,129,0.15)"
            delay={0.2}
          />
          <StatCard
            label="Total Teams"
            value={totalTeams}
            icon={Users}
            gradient="from-rose-600 to-rose-400"
            glowColor="rgba(244,63,94,0.15)"
            delay={0.3}
          />
        </div>

        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center gap-3 mb-5"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Quick Actions</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ActionCard
            title="Create Event"
            description="Set up a new quiz event with teams, rounds, and scoring rules"
            icon={Plus}
            gradient="from-cyan-600/[0.03] to-rose-600/[0.06]"
            onClick={() => navigate('/events/create')}
            delay={0.5}
          />
          <ActionCard
            title="View Events"
            description="Manage, monitor, and review all your active and completed events"
            icon={Eye}
            gradient="from-emerald-600/[0.03] to-cyan-600/[0.06]"
            onClick={() => navigate('/events')}
            delay={0.6}
          />
        </div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 flex items-center justify-center gap-2"
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/[0.06]" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 rounded-full border border-white/[0.06] flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
          </motion.div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/[0.06]" />
        </motion.div>
      </main>
    </AppLayout>
  );
}
