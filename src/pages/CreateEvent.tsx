import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Moderator } from '../types';

interface RoundConfig { round_name: string; description: string; bounce_points: number; pounce_plus: number; pounce_minus: number; question_count: number; }
interface ParticipantConfig { name: string; student_id: string; email: string; phone: string; }
interface TeamConfig { team_name: string; team_lead: string; participants: ParticipantConfig[]; }

const defaultRound = (i: number): RoundConfig => ({ round_name: `Round ${i + 1}`, description: '', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5 });
const defaultParticipant = (): ParticipantConfig => ({ name: '', student_id: '', email: '', phone: '' });
const defaultTeam = (i: number): TeamConfig => ({ team_name: `Team ${i + 1}`, team_lead: '', participants: [defaultParticipant()] });

const inp = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30';
const inpError = 'w-full rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30';
const lbl = 'block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider';
const errText = 'mt-1 text-[11px] text-red-400';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;

export default function CreateEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [quizMaster, setQuizMaster] = useState('');
  const [quizMasterEmail, setQuizMasterEmail] = useState('');
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [numberOfRounds, setNumberOfRounds] = useState(1);
  const [pointsSystem, setPointsSystem] = useState('');
  const [rounds, setRounds] = useState<RoundConfig[]>([defaultRound(0)]);
  const [teams, setTeams] = useState<TeamConfig[]>([defaultTeam(0)]);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([0]));
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set([0]));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Moderators
  const addMod = () => setModerators((p) => [...p, { name: '', email: '' }]);
  const rmMod = (i: number) => setModerators((p) => p.filter((_, j) => j !== i));
  const updMod = (i: number, f: keyof Moderator, v: string) => setModerators((p) => p.map((m, j) => j === i ? { ...m, [f]: v } : m));

  // Rounds
  const changeRoundCount = (v: number) => {
    const n = Math.max(1, v);
    setNumberOfRounds(n);
    setRounds((p) => n > p.length ? [...p, ...Array.from({ length: n - p.length }, (_, i) => defaultRound(p.length + i))] : p.slice(0, n));
  };
  const updRound = (i: number, f: keyof RoundConfig, v: string | number) => setRounds((p) => p.map((r, j) => j === i ? { ...r, [f]: v } : r));
  const toggleRound = (i: number) => setExpandedRounds((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // Teams
  const addTeam = () => { setTeams((p) => [...p, defaultTeam(p.length)]); setExpandedTeams((p) => new Set([...p, teams.length])); };
  const rmTeam = (i: number) => { setTeams((p) => p.filter((_, j) => j !== i)); setExpandedTeams((p) => { const n = new Set(p); n.delete(i); return n; }); };
  const updTeam = (i: number, f: keyof Omit<TeamConfig, 'participants'>, v: string) => setTeams((p) => p.map((t, j) => j === i ? { ...t, [f]: v } : t));
  const toggleTeam = (i: number) => setExpandedTeams((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // Participants
  const addPart = (ti: number) => setTeams((p) => p.map((t, i) => i === ti ? { ...t, participants: [...t.participants, defaultParticipant()] } : t));
  const rmPart = (ti: number, pi: number) => setTeams((p) => p.map((t, i) => i === ti ? { ...t, participants: t.participants.filter((_, j) => j !== pi) } : t));
  const updPart = (ti: number, pi: number, f: keyof ParticipantConfig, v: string) =>
    setTeams((p) => p.map((t, i) => i === ti ? { ...t, participants: t.participants.map((pt, j) => j === pi ? { ...pt, [f]: v } : pt) } : t));

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

    if (teams.length < 1) errs['teams'] = 'Add at least one team.';
    for (let i = 0; i < teams.length; i++) {
      if (!teams[i].team_name.trim()) errs[`team-${i}-name`] = 'Team name required.';
      if (!teams[i].participants.length) errs[`team-${i}-parts`] = 'Add at least one participant.';
      for (let j = 0; j < teams[i].participants.length; j++) {
        const p = teams[i].participants[j];
        if (!p.name.trim()) errs[`team-${i}-p-${j}-name`] = 'Name required.';
        if (p.email.trim() && !emailRegex.test(p.email.trim())) errs[`team-${i}-p-${j}-email`] = 'Invalid email.';
        if (p.phone.trim() && !phoneRegex.test(p.phone.trim())) errs[`team-${i}-p-${j}-phone`] = '10-digit number required.';
      }
    }

    setFieldErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length > 0) return errs[keys[0]];
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    let createdEventId: string | null = null;
    try {
      const { data: ev, error: ee } = await supabase.from('events').insert({
        name: name.trim(), description: description.trim() || null, date: date || null,
        quiz_master: quizMaster.trim(), quiz_master_email: quizMasterEmail.trim(),
        moderators: moderators.map((m) => ({ name: m.name.trim(), email: m.email?.trim() || undefined })),
        number_of_rounds: numberOfRounds, points_system: pointsSystem.trim() || null, status: 'upcoming', current_question: 0,
      }).select('id').single();
      if (ee) throw ee;
      if (!ev) throw new Error('No data returned.');
      createdEventId = ev.id;

      const { error: re } = await supabase.from('rounds').insert(rounds.map((r, i) => ({
        event_id: ev.id, round_name: r.round_name.trim() || `Round ${i + 1}`, round_number: i + 1,
        description: r.description.trim() || null, bounce_points: r.bounce_points, pounce_plus: r.pounce_plus,
        pounce_minus: r.pounce_minus, question_count: r.question_count, status: 'pending' as const,
      })));
      if (re) throw re;

      for (const team of teams) {
        const { data: td, error: te } = await supabase.from('teams').insert({ event_id: ev.id, name: team.team_name.trim(), lead: team.team_lead.trim() || null }).select('id').single();
        if (te) throw te;
        if (!td) throw new Error('No team data.');
        if (team.participants.length) {
          const { error: pe } = await supabase.from('participants').insert(team.participants.map((p) => ({
            team_id: td.id, name: p.name.trim(), student_id: p.student_id.trim() || null, email: p.email.trim() || null, phone: p.phone.trim() || null,
          })));
          if (pe) throw pe;
        }
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      // Clean up orphaned event if later steps failed
      if (createdEventId) {
        await supabase.from('scores').delete().eq('event_id', createdEventId);
        await supabase.from('participants').delete().in('team_id',
          (await supabase.from('teams').select('id').eq('event_id', createdEventId)).data?.map((t) => t.id) ?? []
        );
        await supabase.from('teams').delete().eq('event_id', createdEventId);
        await supabase.from('rounds').delete().eq('event_id', createdEventId);
        await supabase.from('events').delete().eq('id', createdEventId);
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center gap-4 px-6 py-4">
          <button type="button" onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Create Event</h1>
        </div>
      </header>

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
            <input id="ev-date" type="datetime-local" required value={date} onChange={(e) => { setDate(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n['ev-date']; return n; }); }} className={fieldErrors['ev-date'] ? inpError : inp} />
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
        <Section title="Moderators" action={<button type="button" onClick={addMod} className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add</button>}>
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

        {/* Scoring */}
        <Section title="Scoring & Rounds">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="n-rounds" className={lbl}>Number of Rounds</label>
              <input id="n-rounds" type="number" min={1} value={numberOfRounds} onChange={(e) => changeRoundCount(parseInt(e.target.value) || 1)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Points System</label>
            <textarea rows={3} placeholder="Describe scoring rules..." value={pointsSystem} onChange={(e) => setPointsSystem(e.target.value)} className={inp + ' resize-none'} />
          </div>
        </Section>

        {/* Round Config */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Round Configuration</h2>
          {rounds.map((r, i) => (
            <Accordion key={i} title={r.round_name || `Round ${i + 1}`} open={expandedRounds.has(i)} toggle={() => toggleRound(i)}>
              <div className="space-y-4 p-5 border-t border-white/[0.04]">
                <div><label className={lbl}>Round Name</label><input placeholder={`Round ${i + 1}`} value={r.round_name} onChange={(e) => updRound(i, 'round_name', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Description</label><textarea rows={2} placeholder="Describe..." value={r.description} onChange={(e) => updRound(i, 'description', e.target.value)} className={inp + ' resize-none'} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className={lbl}>Bounce</label><input type="number" value={r.bounce_points} onChange={(e) => updRound(i, 'bounce_points', +e.target.value || 0)} className={inp} /></div>
                  <div><label className={lbl}>Pounce +</label><input type="number" value={r.pounce_plus} onChange={(e) => updRound(i, 'pounce_plus', +e.target.value || 0)} className={inp} /></div>
                  <div><label className={lbl}>Pounce −</label><input type="number" value={r.pounce_minus} onChange={(e) => updRound(i, 'pounce_minus', +e.target.value || 0)} className={inp} /></div>
                  <div><label className={lbl}>Questions</label><input type="number" min={5} max={5} value={5} readOnly className={inp + ' opacity-60 cursor-not-allowed'} /></div>
                </div>
              </div>
            </Accordion>
          ))}
        </div>

        {/* Teams */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Teams</h2>
            <button type="button" onClick={addTeam} className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Team</button>
          </div>
          {teams.map((t, ti) => (
            <Accordion key={ti} title={t.team_name || `Team ${ti + 1}`} open={expandedTeams.has(ti)} toggle={() => toggleTeam(ti)}
              extra={teams.length > 1 && <button type="button" onClick={() => rmTeam(ti)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            >
              <div className="space-y-4 p-5 border-t border-white/[0.04]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Team Name <span className="text-red-400">*</span></label><input placeholder={`Team ${ti + 1}`} value={t.team_name} onChange={(e) => updTeam(ti, 'team_name', e.target.value)} className={inp} /></div>
                  <div><label className={lbl}>Team Lead</label><input placeholder="Lead name" value={t.team_lead} onChange={(e) => updTeam(ti, 'team_lead', e.target.value)} className={inp} /></div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Participants</span>
                    <button type="button" onClick={() => addPart(ti)} className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"><Plus className="w-3 h-3" /> Add</button>
                  </div>
                  <AnimatePresence initial={false}>
                    {t.participants.map((p, pi) => (
                      <motion.div key={pi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-start gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <input placeholder="Name *" value={p.name} onChange={(e) => { updPart(ti, pi, 'name', e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n[`team-${ti}-p-${pi}-name`]; return n; }); }} className={fieldErrors[`team-${ti}-p-${pi}-name`] ? inpError : inp} />
                              {fieldErrors[`team-${ti}-p-${pi}-name`] && <p className={errText}>{fieldErrors[`team-${ti}-p-${pi}-name`]}</p>}
                            </div>
                            <input placeholder="Student ID" value={p.student_id} onChange={(e) => updPart(ti, pi, 'student_id', e.target.value)} className={inp} />
                            <div>
                              <input placeholder="Email" type="email" value={p.email} onChange={(e) => { updPart(ti, pi, 'email', e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n[`team-${ti}-p-${pi}-email`]; return n; }); }} className={fieldErrors[`team-${ti}-p-${pi}-email`] ? inpError : inp} />
                              {fieldErrors[`team-${ti}-p-${pi}-email`] && <p className={errText}>{fieldErrors[`team-${ti}-p-${pi}-email`]}</p>}
                            </div>
                            <div>
                              <input placeholder="Phone (10 digits)" type="tel" value={p.phone} onChange={(e) => { updPart(ti, pi, 'phone', e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n[`team-${ti}-p-${pi}-phone`]; return n; }); }} className={fieldErrors[`team-${ti}-p-${pi}-phone`] ? inpError : inp} />
                              {fieldErrors[`team-${ti}-p-${pi}-phone`] && <p className={errText}>{fieldErrors[`team-${ti}-p-${pi}-phone`]}</p>}
                            </div>
                          </div>
                          {t.participants.length > 1 && (
                            <button type="button" onClick={() => rmPart(ti, pi)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {t.participants.length === 0 && <p className="text-sm text-slate-500">No participants added.</p>}
                </div>
              </div>
            </Accordion>
          ))}
        </div>

        {/* Submit */}
        <div className="pt-4 pb-12">
          <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-600/20 cursor-pointer"
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

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
