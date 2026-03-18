import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronDown, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Event, Round, Moderator, RoundType } from '../types';
import { AppLayout, AppHeader, LoadingScreen } from '../components/Layout';
import DateTimePicker from '../components/DateTimePicker';

interface RoundEditConfig {
  id: string | null; // null = new round to be created
  round_name: string;
  description: string;
  round_type: RoundType;
  bounce_points: number;
  pounce_plus: number;
  pounce_minus: number;
  buzzer_points: number;
  question_count: number;
  tiebreaker_questions: number;
}

const defaultRound = (i: number): RoundEditConfig => ({
  id: null,
  round_name: `Round ${i + 1}`,
  description: '',
  round_type: 'bounce_pounce',
  bounce_points: 10,
  pounce_plus: 15,
  pounce_minus: -5,
  buzzer_points: 10,
  question_count: 5,
  tiebreaker_questions: 3,
});

const inp = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30';
const inpError = 'w-full rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30';
const lbl = 'block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider';
const errText = 'mt-1 text-[11px] text-red-400';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [existingRounds, setExistingRounds] = useState<Round[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [quizMaster, setQuizMaster] = useState('');
  const [quizMasterEmail, setQuizMasterEmail] = useState('');
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [rounds, setRounds] = useState<RoundEditConfig[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Warning modal for deleting rounds with scores
  const [deleteRoundWarning, setDeleteRoundWarning] = useState<number | null>(null);

  // Fetch existing event + rounds
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const [eventRes, roundsRes] = await Promise.all([
          supabase.from('events').select('*').eq('id', eventId).single(),
          supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
        ]);
        if (eventRes.error) throw eventRes.error;
        if (roundsRes.error) throw roundsRes.error;

        const ev = eventRes.data as Event;
        const rds = roundsRes.data as Round[];

        if (ev.status === 'completed') {
          navigate(`/events/${eventId}/final-stats`);
          return;
        }

        setExistingRounds(rds);
        setName(ev.name);
        setDescription(ev.description ?? '');
        setDate(ev.date ?? '');
        setQuizMaster(ev.quiz_master);
        setQuizMasterEmail(ev.quiz_master_email);
        setModerators(ev.moderators ?? []);
        setRounds(rds.map((r) => ({
          id: r.id,
          round_name: r.round_name,
          description: r.description ?? '',
          round_type: r.round_type ?? 'bounce_pounce',
          bounce_points: r.bounce_points,
          pounce_plus: r.pounce_plus,
          pounce_minus: r.pounce_minus,
          buzzer_points: r.buzzer_points ?? 10,
          question_count: r.question_count,
          tiebreaker_questions: r.tiebreaker_questions,
        })));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, navigate]);

  // Moderators
  const addMod = () => setModerators((p) => [...p, { name: '', email: '' }]);
  const rmMod = (i: number) => setModerators((p) => p.filter((_, j) => j !== i));
  const updMod = (i: number, f: keyof Moderator, v: string) => setModerators((p) => p.map((m, j) => j === i ? { ...m, [f]: v } : m));

  // Rounds
  const addRound = () => {
    setRounds((p) => [...p, defaultRound(p.length)]);
    setExpandedRounds((p) => new Set([...p, rounds.length]));
  };
  const removeRound = (index: number) => {
    if (rounds.length <= 1) return;
    const round = rounds[index];
    if (round.id) {
      const existing = existingRounds.find((r) => r.id === round.id);
      if (existing && existing.status !== 'pending') {
        setDeleteRoundWarning(index);
        return;
      }
    }
    setRounds((p) => p.filter((_, i) => i !== index));
  };
  const confirmDeleteRound = () => {
    if (deleteRoundWarning !== null) {
      setRounds((p) => p.filter((_, i) => i !== deleteRoundWarning));
      setDeleteRoundWarning(null);
    }
  };
  const updRound = (i: number, f: keyof RoundEditConfig, v: string | number | null) => {
    setRounds((p) => p.map((r, j) => {
      if (j !== i) return r;
      const updated = { ...r, [f]: v };
      // Validation: pounce_plus must be >= 0, pounce_minus must be <= 0
      if (f === 'pounce_plus' && typeof v === 'number' && v < 0) {
        updated.pounce_plus = 0;
      }
      if (f === 'pounce_minus' && typeof v === 'number' && v > 0) {
        updated.pounce_minus = 0;
      }
      return updated;
    }));
  };
  const toggleRound = (i: number) => setExpandedRounds((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // Validation
  const validate = (): string | null => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs['ev-name'] = 'Event name is required.';
    if (!date.trim()) errs['ev-date'] = 'Date is required.';
    if (!quizMaster.trim()) errs['qm-name'] = 'Quiz master name is required.';
    if (!quizMasterEmail.trim()) errs['qm-email'] = 'Quiz master email is required.';
    else if (!emailRegex.test(quizMasterEmail.trim())) errs['qm-email'] = 'Invalid email format.';

    for (let i = 0; i < moderators.length; i++) {
      if (!moderators[i].name.trim()) errs[`mod-${i}-name`] = 'Name required.';
      if (moderators[i].email && !emailRegex.test(moderators[i].email!.trim())) errs[`mod-${i}-email`] = 'Invalid email.';
    }

    if (rounds.length < 1) errs['rounds'] = 'At least one round is required.';
    setFieldErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length > 0) return errs[keys[0]];
    return null;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !eventId) return;
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      // 1. Update event row
      const { error: eventError } = await supabase.from('events').update({
        name: name.trim(),
        description: description.trim() || null,
        date: date || null,
        quiz_master: quizMaster.trim(),
        quiz_master_email: quizMasterEmail.trim(),
        moderators: moderators.map((m) => ({ name: m.name.trim(), email: m.email?.trim() || undefined })),
        number_of_rounds: rounds.length,
      }).eq('id', eventId);
      if (eventError) throw eventError;

      // 2. Determine which rounds to update, create, or delete
      const existingIds = new Set(existingRounds.map((r) => r.id));
      const keptIds = new Set(rounds.filter((r) => r.id !== null).map((r) => r.id!));
      const deletedIds = [...existingIds].filter((id) => !keptIds.has(id));

      // 2a. Delete removed rounds (and their scores via FK cascade)
      for (const roundId of deletedIds) {
        await supabase.from('scores').delete().eq('round_id', roundId);
        await supabase.from('rounds').delete().eq('id', roundId);
      }

      // 2b. Update existing rounds + insert new ones
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i];
        if (r.id) {
          const { error: roundError } = await supabase.from('rounds').update({
            round_name: r.round_name.trim() || `Round ${i + 1}`,
            round_type: r.round_type,
            description: r.description.trim() || null,
            bounce_points: r.bounce_points,
            pounce_plus: r.pounce_plus,
            pounce_minus: r.pounce_minus,
            buzzer_points: r.buzzer_points,
            question_count: r.question_count,
            tiebreaker_questions: r.tiebreaker_questions,
            round_number: i + 1,
          }).eq('id', r.id);
          if (roundError) throw roundError;
        } else {
          const { error: insertError } = await supabase.from('rounds').insert({
            event_id: eventId,
            round_name: r.round_name.trim() || `Round ${i + 1}`,
            round_number: i + 1,
            round_type: r.round_type,
            description: r.description.trim() || null,
            bounce_points: r.bounce_points,
            pounce_plus: r.pounce_plus,
            pounce_minus: r.pounce_minus,
            buzzer_points: r.buzzer_points,
            question_count: r.question_count,
            tiebreaker_questions: r.tiebreaker_questions,
            status: 'pending',
          });
          if (insertError) throw insertError;
        }
      }

      navigate('/events');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading event..." />;

  return (
    <AppLayout>
      <AppHeader maxWidth="max-w-3xl">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/events')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Edit Event</h1>
        </div>
      </AppHeader>

      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} onSubmit={handleSubmit} className="relative z-10 max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</motion.div>
          )}
        </AnimatePresence>

        {/* Event Details */}
        <Section title="Event Details">
          <div>
            <label htmlFor="ev-name" className={lbl}>Name <span className="text-red-400">*</span></label>
            <input id="ev-name" required placeholder="e.g. Annual Quiz 2026" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n['ev-name']; return n; }); }} className={fieldErrors['ev-name'] ? inpError : inp} />
            {fieldErrors['ev-name'] && <p className={errText}>{fieldErrors['ev-name']}</p>}
          </div>
          <div>
            <label htmlFor="ev-desc" className={lbl}>Description</label>
            <textarea id="ev-desc" rows={3} placeholder="Describe the event..." value={description} onChange={(e) => setDescription(e.target.value)} className={inp + ' resize-none'} />
          </div>
          <div>
            <label htmlFor="ev-date" className={lbl}>Date &amp; Time <span className="text-red-400">*</span></label>
            <DateTimePicker value={date} onChange={(v) => { setDate(v); setFieldErrors((p) => { const n = { ...p }; delete n['ev-date']; return n; }); }} hasError={!!fieldErrors['ev-date']} />
            {fieldErrors['ev-date'] && <p className={errText}>{fieldErrors['ev-date']}</p>}
          </div>
        </Section>

        {/* Quiz Master */}
        <Section title="Quiz Master">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qm-name" className={lbl}>Name <span className="text-red-400">*</span></label>
              <input id="qm-name" required placeholder="Full name" value={quizMaster} onChange={(e) => { setQuizMaster(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n['qm-name']; return n; }); }} className={fieldErrors['qm-name'] ? inpError : inp} />
              {fieldErrors['qm-name'] && <p className={errText}>{fieldErrors['qm-name']}</p>}
            </div>
            <div>
              <label htmlFor="qm-email" className={lbl}>Email <span className="text-red-400">*</span></label>
              <input id="qm-email" type="email" required placeholder="email@example.com" value={quizMasterEmail} onChange={(e) => { setQuizMasterEmail(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n['qm-email']; return n; }); }} className={fieldErrors['qm-email'] ? inpError : inp} />
              {fieldErrors['qm-email'] && <p className={errText}>{fieldErrors['qm-email']}</p>}
            </div>
          </div>
        </Section>

        {/* Moderators */}
        <Section title="Moderators" action={<button type="button" onClick={addMod} className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add</button>}>
          {moderators.length === 0 && <p className="text-sm text-slate-500">No moderators added.</p>}
          <AnimatePresence initial={false}>
            {moderators.map((mod, i) => (
              <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input placeholder="Name *" required value={mod.name} onChange={(e) => { updMod(i, 'name', e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n[`mod-${i}-name`]; return n; }); }} className={fieldErrors[`mod-${i}-name`] ? inpError : inp} />
                      {fieldErrors[`mod-${i}-name`] && <p className={errText}>{fieldErrors[`mod-${i}-name`]}</p>}
                    </div>
                    <div>
                      <input placeholder="Email" type="email" value={mod.email || ''} onChange={(e) => { updMod(i, 'email', e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n[`mod-${i}-email`]; return n; }); }} className={fieldErrors[`mod-${i}-email`] ? inpError : inp} />
                      {fieldErrors[`mod-${i}-email`] && <p className={errText}>{fieldErrors[`mod-${i}-email`]}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => rmMod(i)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Section>

        {/* Round Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Round Configuration</h2>
            <button type="button" onClick={addRound} className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Round</button>
          </div>
          <p className="text-xs text-slate-500">Point changes apply to future questions only. Existing scores are not affected.</p>
          {rounds.map((r, i) => (
            <Accordion
              key={r.id || `new-${i}`}
              title={`${r.round_name || `Round ${i + 1}`} (${r.round_type === 'bounce_pounce' ? 'Bounce & Pounce' : 'Buzzer'})`}
              open={expandedRounds.has(i)}
              toggle={() => toggleRound(i)}
              extra={rounds.length > 1 && (
                <button type="button" onClick={() => removeRound(i)} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Remove round">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            >
              <div className="space-y-4 p-5 border-t border-white/[0.04]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Round Name</label><input placeholder={`Round ${i + 1}`} value={r.round_name} onChange={(e) => updRound(i, 'round_name', e.target.value)} className={inp} /></div>
                  <div>
                    <label className={lbl}>Round Type <span className="text-red-400">*</span></label>
                    <select value={r.round_type} onChange={(e) => updRound(i, 'round_type', e.target.value as RoundType)} className={inp + ' cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white'}>
                      <option value="bounce_pounce">Bounce & Pounce</option>
                      <option value="buzzer">Buzzer</option>
                    </select>
                  </div>
                </div>
                <div><label className={lbl}>Description</label><textarea rows={2} placeholder="Describe..." value={r.description} onChange={(e) => updRound(i, 'description', e.target.value)} className={inp + ' resize-none'} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {r.round_type === 'bounce_pounce' && (
                    <>
                      <div><label className={lbl}>Bounce Points</label><input type="number" value={r.bounce_points} onChange={(e) => updRound(i, 'bounce_points', +e.target.value || 0)} className={inp} /></div>
                      <div>
                        <label className={lbl}>Pounce + <span className="text-xs text-slate-500">(≥0)</span></label>
                        <input type="number" min={0} value={r.pounce_plus} onChange={(e) => updRound(i, 'pounce_plus', Math.max(0, +e.target.value || 0))} className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Pounce − <span className="text-xs text-slate-500">(≤0)</span></label>
                        <input type="number" max={0} value={r.pounce_minus} onChange={(e) => updRound(i, 'pounce_minus', Math.min(0, +e.target.value || 0))} className={inp} />
                      </div>
                    </>
                  )}
                  {r.round_type === 'buzzer' && (
                    <div><label className={lbl}>Buzzer Points</label><input type="number" value={r.buzzer_points} onChange={(e) => updRound(i, 'buzzer_points', +e.target.value || 0)} className={inp} /></div>
                  )}
                  <div><label className={lbl}>Questions</label><input type="number" min={1} max={20} value={r.question_count} onChange={(e) => updRound(i, 'question_count', Math.max(1, Math.min(20, +e.target.value || 5)))} className={inp} /></div>
                  <div><label className={lbl}>Tiebreaker Q</label><input type="number" min={1} max={10} value={r.tiebreaker_questions} onChange={(e) => updRound(i, 'tiebreaker_questions', Math.max(1, Math.min(10, +e.target.value || 3)))} className={inp} /></div>
                </div>
                {r.id && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      existingRounds.find((er) => er.id === r.id)?.status === 'completed' ? 'bg-slate-400' :
                      existingRounds.find((er) => er.id === r.id)?.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    {existingRounds.find((er) => er.id === r.id)?.status ?? 'pending'}
                  </div>
                )}
              </div>
            </Accordion>
          ))}
        </div>

        {/* Manage Teams link */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Teams</h2>
              <p className="mt-1 text-xs text-slate-500">Add, edit, or remove teams and participants.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}/teams`)}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> Manage Teams
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 pb-12">
          <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </motion.form>

      {/* Delete Round Warning Modal */}
      <AnimatePresence>
        {deleteRoundWarning !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteRoundWarning(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Delete Round?</h3>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                <span className="font-medium text-white">{rounds[deleteRoundWarning]?.round_name}</span> has been played and may contain scores.
              </p>
              <p className="text-sm text-red-300 border-l-2 border-red-500/50 pl-3 py-2 bg-red-500/10 rounded-r-lg mb-6">
                Deleting this round will permanently remove all its score data. This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDeleteRoundWarning(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 font-medium hover:bg-white/[0.06] transition-colors text-sm">
                  Cancel
                </button>
                <button type="button" onClick={confirmDeleteRound} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors text-sm">
                  Delete Round
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

/* -- Helpers -------------------------------------------------------- */

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Accordion({ title, open, toggle, extra, children }: { title: string; open: boolean; toggle: () => void; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5">
        <button type="button" onClick={toggle} className="flex-1 flex items-center justify-between text-left">
          <span className="text-sm font-medium text-white">{title}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </button>
        {extra && <div className="ml-3">{extra}</div>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
