import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  UserPlus,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Team, Participant, Event } from '../types';
import { AppLayout, AppHeader, LoadingScreen } from '../components/Layout';

interface TeamWithParticipants extends Team {
  participants: Participant[];
}

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const card = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
};

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30';
const inputErrCls =
  'w-full rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30';
const errText = 'mt-1 text-[11px] text-red-400';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;

export default function ManageTeams() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<TeamWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  // Add team modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLead, setNewTeamLead] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);

  // Edit team state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLead, setEditLead] = useState('');

  // Expanded teams
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Add participant form state per team
  const [participantForms, setParticipantForms] = useState<
    Record<string, { name: string; student_id: string; email: string; phone: string }>
  >({});
  const [partErrors, setPartErrors] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!eventId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function fetchData() {
    setLoading(true);
    const [eventRes, teamsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('teams').select('*, participants(*)').eq('event_id', eventId!),
    ]);
    if (eventRes.data) setEvent(eventRes.data as Event);
    if (teamsRes.data) setTeams(teamsRes.data as TeamWithParticipants[]);
    setLoading(false);
  }

  async function handleAddTeam() {
    if (!newTeamName.trim() || !eventId) return;
    setAddingTeam(true);
    const { error } = await supabase
      .from('teams')
      .insert({ event_id: eventId, name: newTeamName.trim(), lead: newTeamLead.trim() });
    if (!error) {
      setNewTeamName('');
      setNewTeamLead('');
      setShowAddModal(false);
      await fetchData();
    }
    setAddingTeam(false);
  }

  async function handleUpdateTeam(teamId: string) {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from('teams')
      .update({ name: editName.trim(), lead: editLead.trim() })
      .eq('id', teamId);
    if (!error) {
      setEditingTeamId(null);
      await fetchData();
    }
  }

  async function handleDeleteTeam(teamId: string) {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (!error) await fetchData();
  }

  function getParticipantForm(teamId: string) {
    return participantForms[teamId] || { name: '', student_id: '', email: '', phone: '' };
  }

  function updateParticipantForm(teamId: string, field: string, value: string) {
    setParticipantForms((prev) => ({
      ...prev,
      [teamId]: { ...getParticipantForm(teamId), [field]: value },
    }));
  }

  async function handleAddParticipant(teamId: string) {
    const form = getParticipantForm(teamId);
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (form.email.trim() && !emailRegex.test(form.email.trim())) errs.email = 'Invalid email format.';
    if (form.phone.trim() && !phoneRegex.test(form.phone.trim())) errs.phone = '10-digit number required.';
    if (Object.keys(errs).length > 0) {
      setPartErrors((prev) => ({ ...prev, [teamId]: errs }));
      return;
    }
    setPartErrors((prev) => { const n = { ...prev }; delete n[teamId]; return n; });
    const { error } = await supabase.from('participants').insert({
      team_id: teamId,
      name: form.name.trim(),
      student_id: form.student_id.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    });
    if (!error) {
      setParticipantForms((prev) => ({
        ...prev,
        [teamId]: { name: '', student_id: '', email: '', phone: '' },
      }));
      await fetchData();
    }
  }

  async function handleDeleteParticipant(participantId: string) {
    const { error } = await supabase.from('participants').delete().eq('id', participantId);
    if (!error) await fetchData();
  }

  function toggleExpand(teamId: string) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function startEdit(team: TeamWithParticipants) {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditLead(team.lead);
  }

  if (loading) return <LoadingScreen message="Loading teams..." />;

  return (
    <AppLayout>
      <AppHeader>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/events')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Manage Teams</h1>
            <p className="text-sm text-slate-400 truncate">{event?.name ?? 'Event'}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>{teams.length} Teams</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Team
          </motion.button>
        </div>
      </AppHeader>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {teams.length === 0 && (
          <div className="flex flex-col items-center py-32">
            <div className="mb-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">No teams yet</h2>
            <p className="text-sm text-slate-400 mb-5">Add your first team to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Team
            </button>
          </div>
        )}

        <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {teams.map((team) => {
              const isEditing = editingTeamId === team.id;
              const isExpanded = expandedTeams.has(team.id);
              const form = getParticipantForm(team.id);

              return (
                <motion.div
                  key={team.id}
                  layout
                  variants={card}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                        <Users className="h-5 w-5 text-cyan-400" />
                      </div>

                      {isEditing ? (
                        <div className="flex flex-1 flex-wrap items-center gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Team name"
                            className={inputCls}
                            style={{ maxWidth: 180 }}
                          />
                          <input
                            type="text"
                            value={editLead}
                            onChange={(e) => setEditLead(e.target.value)}
                            placeholder="Team lead"
                            className={inputCls}
                            style={{ maxWidth: 180 }}
                          />
                          <button
                            onClick={() => handleUpdateTeam(team.id)}
                            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-medium text-white cursor-pointer transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTeamId(null)}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-slate-400 cursor-pointer hover:bg-white/[0.06] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white truncate">{team.name}</h3>
                          {team.lead && (
                            <p className="text-xs text-slate-500">Lead: {team.lead}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(team)}
                          className="rounded-lg p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Edit team"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="rounded-lg p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleExpand(team.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>{team.participants?.length ?? 0}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Participants Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' as const }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.04] px-5 py-4">
                          {team.participants && team.participants.length > 0 ? (
                            <div className="mb-4 flex flex-col gap-2">
                              <p className="mb-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Members
                              </p>
                              {team.participants.map((p) => (
                                <motion.div
                                  key={p.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-2.5"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm text-white/80">{p.name}</span>
                                    <span className="text-xs text-slate-500">
                                      {[p.student_id, p.email, p.phone]
                                        .filter(Boolean)
                                        .join(' | ') || 'No additional info'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteParticipant(p.id)}
                                    className="rounded-md p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <p className="mb-4 text-xs text-slate-500">No members yet.</p>
                          )}

                          {/* Add Participant Form */}
                          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Add Member
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <input
                                  type="text"
                                  placeholder="Name *"
                                  value={form.name}
                                  onChange={(e) => { updateParticipantForm(team.id, 'name', e.target.value); setPartErrors((prev) => { const n = { ...prev }; if (n[team.id]) { delete n[team.id].name; if (!Object.keys(n[team.id]).length) delete n[team.id]; } return n; }); }}
                                  className={partErrors[team.id]?.name ? inputErrCls : inputCls}
                                />
                                {partErrors[team.id]?.name && <p className={errText}>{partErrors[team.id].name}</p>}
                              </div>
                              <input
                                type="text"
                                placeholder="Student ID"
                                value={form.student_id}
                                onChange={(e) => updateParticipantForm(team.id, 'student_id', e.target.value)}
                                className={inputCls}
                              />
                              <div>
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={form.email}
                                  onChange={(e) => { updateParticipantForm(team.id, 'email', e.target.value); setPartErrors((prev) => { const n = { ...prev }; if (n[team.id]) { delete n[team.id].email; if (!Object.keys(n[team.id]).length) delete n[team.id]; } return n; }); }}
                                  className={partErrors[team.id]?.email ? inputErrCls : inputCls}
                                />
                                {partErrors[team.id]?.email && <p className={errText}>{partErrors[team.id].email}</p>}
                              </div>
                              <div>
                                <input
                                  type="tel"
                                  placeholder="Phone (10 digits)"
                                  value={form.phone}
                                  onChange={(e) => { updateParticipantForm(team.id, 'phone', e.target.value); setPartErrors((prev) => { const n = { ...prev }; if (n[team.id]) { delete n[team.id].phone; if (!Object.keys(n[team.id]).length) delete n[team.id]; } return n; }); }}
                                  className={partErrors[team.id]?.phone ? inputErrCls : inputCls}
                                />
                                {partErrors[team.id]?.phone && <p className={errText}>{partErrors[team.id].phone}</p>}
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleAddParticipant(team.id)}
                              disabled={!form.name.trim()}
                              className="flex items-center justify-center gap-2 self-start rounded-lg bg-cyan-600/20 border border-cyan-500/20 px-5 py-2 text-xs font-medium text-cyan-300 transition-all hover:bg-cyan-600/30 disabled:opacity-40 cursor-pointer"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Add Member
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Add Team Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Plus className="h-5 w-5 text-cyan-400" />
                  Add Team
                </h2>
                <button
                  onClick={() => { setShowAddModal(false); setNewTeamName(''); setNewTeamLead(''); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Team Lead
                  </label>
                  <input
                    type="text"
                    value={newTeamLead}
                    onChange={(e) => setNewTeamLead(e.target.value)}
                    placeholder="Enter team lead name"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowAddModal(false); setNewTeamName(''); setNewTeamLead(''); }}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm text-slate-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddTeam}
                  disabled={!newTeamName.trim() || addingTeam}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {addingTeam ? 'Adding...' : 'Add Team'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
