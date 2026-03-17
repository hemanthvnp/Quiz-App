import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Trophy, ArrowLeft, Plus, Clock, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Event } from '../types';
import { AppLayout, AppHeader } from '../components/Layout';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const card = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function Badge({ status }: { status: Event['status'] }) {
  const m: Record<string, { cls: string; label: string }> = {
    upcoming: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Upcoming' },
    active: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Active' },
    completed: { cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Completed' },
  };
  const c = m[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${c.cls}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {c.label}
    </span>
  );
}

export default function ViewEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: e } = await supabase.from('events').select('*').order('date', { ascending: false });
        if (e) throw e;
        setEvents(data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load events.');
      } finally { setLoading(false); }
    })();
  }, []);

  const go = (ev: Event) => navigate(ev.status === 'completed' ? `/events/${ev.id}/final-stats` : `/events/${ev.id}/rounds`);

  const handleDelete = async (eventId: string) => {
    if (deleting) return;
    setDeleting(true);
    try {
      // Delete in order: scores -> participants (via teams) -> teams -> rounds -> event
      await supabase.from('scores').delete().eq('event_id', eventId);

      const { data: teamIds } = await supabase.from('teams').select('id').eq('event_id', eventId);
      if (teamIds && teamIds.length > 0) {
        await supabase.from('participants').delete().in('team_id', teamIds.map((t) => t.id));
      }

      await supabase.from('teams').delete().eq('event_id', eventId);
      await supabase.from('rounds').delete().eq('event_id', eventId);
      await supabase.from('events').delete().eq('id', eventId);

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <AppHeader>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Events</h1>
          <div className="flex-1" />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/events/create')} className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> New Event
          </motion.button>
        </div>
      </AppHeader>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex flex-col items-center py-32 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading events...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-center text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center py-32">
            <div className="mb-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Trophy className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">No events yet</h2>
            <p className="text-sm text-slate-400 mb-5">Create your first event to get started</p>
            <Link to="/events/create" className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Create Event
            </Link>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <motion.div key={ev.id} variants={card} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors overflow-hidden">
                <button type="button" onClick={() => go(ev)} className="w-full text-left p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-base font-semibold text-white leading-snug group-hover:text-cyan-300 transition-colors">{ev.name}</h3>
                    <Badge status={ev.status} />
                  </div>
                  <div className="space-y-2 text-sm text-slate-400">
                    {ev.date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(ev.date)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {ev.number_of_rounds} Round{ev.number_of_rounds !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-slate-500" />
                      {ev.quiz_master}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
                    {ev.status === 'completed' ? 'View Results' : 'View Rounds'} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
                <div className="border-t border-white/[0.04] px-5 py-3 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/events/${ev.id}/teams`); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Manage Teams
                  </button>
                  {ev.status !== 'completed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/events/${ev.id}/edit`); }}
                      className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-cyan-500/10 hover:border-cyan-500/20 p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                      title="Edit event"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(ev.id); }}
                    className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Event</h3>
              <p className="text-sm text-slate-400 mb-1">
                Are you sure you want to delete <span className="text-white font-medium">{events.find((e) => e.id === deleteConfirm)?.name}</span>?
              </p>
              <p className="text-xs text-slate-500 mb-6">
                This will permanently remove all rounds, teams, participants, and scores associated with this event.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
