import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Eye, LogOut, Trophy, Users, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppLayout, AppHeader } from '../components/Layout';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
};

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

  const stats = [
    { label: 'Total Events', value: totalEvents, icon: Trophy, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Active', value: activeEvents, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Teams', value: totalTeams, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <AppLayout>
      <AppHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-violet-400">Q</span>
            </div>
            <span className="text-lg font-bold text-white">QFactor</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </AppHeader>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-slate-400">Manage your quiz events</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <motion.div key={s.label} variants={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            variants={item}
            whileHover={{ y: -2 }}
            onClick={() => navigate('/events/create')}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-violet-500/10">
                <Plus className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Create Event</h3>
            </div>
            <p className="text-sm text-slate-400">Set up a new quiz event with teams and rounds</p>
          </motion.button>

          <motion.button
            variants={item}
            whileHover={{ y: -2 }}
            onClick={() => navigate('/events')}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Eye className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">View Events</h3>
            </div>
            <p className="text-sm text-slate-400">Manage active and completed quiz events</p>
          </motion.button>
        </motion.div>
      </main>
    </AppLayout>
  );
}
