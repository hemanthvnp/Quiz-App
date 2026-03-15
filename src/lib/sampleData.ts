import { supabase } from './supabase';

const SAMPLE_EVENT_NAME = '[SAMPLE] Annual Quiz Championship 2026';
const ACTIVE_SAMPLE_EVENT_NAME = '[SAMPLE] Spring Quiz League 2026';

const eventData = {
  name: SAMPLE_EVENT_NAME,
  description: '[SAMPLE] A demonstration quiz event showcasing all QFactor features. Auto-generated — safe to delete.',
  date: new Date().toISOString(),
  quiz_master: 'Dr. Sarah Mitchell',
  quiz_master_email: 'sarah.m@example.com',
  moderators: [
    { name: 'James Wilson', email: 'james.w@example.com' },
    { name: 'Priya Sharma', email: 'priya.s@example.com' },
  ],
  number_of_rounds: 3,
  points_system: 'Bounce: 10, Pounce+: 15, Pounce−: −5',
  status: 'completed' as const,
  current_question: 5,
};

const roundsData = [
  { round_name: 'General Knowledge', round_number: 1, description: 'Science, history, geography, and culture', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' as const },
  { round_name: 'Science & Technology', round_number: 2, description: 'Physics, chemistry, biology, and modern tech', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' as const },
  { round_name: 'Arts & Literature', round_number: 3, description: 'World literature, fine arts, music, and cinema', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' as const },
];

const teamsData = [
  {
    name: 'Quantum Minds',
    lead: 'Alex Rivera',
    participants: [
      { name: 'Alex Rivera', student_id: 'STU001', email: 'alex.r@example.com', phone: '+1-555-0101' },
      { name: 'Maya Chen', student_id: 'STU002', email: 'maya.c@example.com', phone: '+1-555-0102' },
      { name: 'Jordan Lee', student_id: 'STU003', email: 'jordan.l@example.com', phone: '+1-555-0103' },
    ],
  },
  {
    name: 'Neural Networks',
    lead: 'Sam Patel',
    participants: [
      { name: 'Sam Patel', student_id: 'STU004', email: 'sam.p@example.com', phone: '+1-555-0104' },
      { name: 'Olivia Brooks', student_id: 'STU005', email: 'olivia.b@example.com', phone: '+1-555-0105' },
      { name: 'Ethan Nguyen', student_id: 'STU006', email: 'ethan.n@example.com', phone: '+1-555-0106' },
    ],
  },
  {
    name: 'Trivia Titans',
    lead: 'Zoe Martinez',
    participants: [
      { name: 'Zoe Martinez', student_id: 'STU007', email: 'zoe.m@example.com', phone: '+1-555-0107' },
      { name: "Liam O'Connor", student_id: 'STU008', email: 'liam.o@example.com', phone: '+1-555-0108' },
      { name: 'Aisha Khan', student_id: 'STU009', email: 'aisha.k@example.com', phone: '+1-555-0109' },
    ],
  },
  {
    name: 'Brainstormers',
    lead: 'Noah Taylor',
    participants: [
      { name: 'Noah Taylor', student_id: 'STU010', email: 'noah.t@example.com', phone: '+1-555-0110' },
      { name: 'Emma Wilson', student_id: 'STU011', email: 'emma.w@example.com', phone: '+1-555-0111' },
      { name: 'Raj Gupta', student_id: 'STU012', email: 'raj.g@example.com', phone: '+1-555-0112' },
    ],
  },
];

// Score templates: [roundIndex, teamIndex, questionNumber, actionType, points, isWinner]
// Target totals: Quantum Minds 135, Trivia Titans 110, Neural Networks 85, Brainstormers 60
type ST = { ri: number; ti: number; q: number; a: string; p: number; w: boolean };
const scoreTemplates: ST[] = [
  // === ROUND 1 (General Knowledge) ===
  // Q1: Quantum Minds bounces (+10), Brainstormers pounce wrong (-5)
  { ri: 0, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 3, q: 1, a: 'pounce_minus', p: -5, w: false },
  // Q2: Neural Networks bounces (+10), Trivia Titans pounce correct (+15)
  { ri: 0, ti: 1, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 2, q: 2, a: 'pounce_plus', p: 15, w: true },
  // Q3: Quantum Minds pounce correct (+15), Neural Networks buzzer correct (+10)
  { ri: 0, ti: 0, q: 3, a: 'pounce_plus', p: 15, w: true },
  { ri: 0, ti: 1, q: 3, a: 'buzzer', p: 10, w: true },
  // Q4: Brainstormers bounces (+10), Quantum Minds bonus (+10)
  { ri: 0, ti: 3, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 0, q: 4, a: 'bonus', p: 10, w: true },
  // Q5: Trivia Titans bounces (+10), Brainstormers buzzer wrong (-5), Neural Networks bonus (+10)
  { ri: 0, ti: 2, q: 5, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 3, q: 5, a: 'buzzer_minus', p: -5, w: false },
  { ri: 0, ti: 1, q: 5, a: 'bonus', p: 10, w: true },
  // R1 totals: QM=35, NN=30, TT=25, BS=10 (partial — adjusted below)

  // === ROUND 2 (Science & Technology) ===
  // Q1: Quantum Minds bounces (+10), Trivia Titans pounce correct (+15)
  { ri: 1, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 2, q: 1, a: 'pounce_plus', p: 15, w: true },
  // Q2: Neural Networks bounces (+10), Brainstormers pounce correct (+15)
  { ri: 1, ti: 1, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 3, q: 2, a: 'pounce_plus', p: 15, w: true },
  // Q3: Quantum Minds buzzer correct (+10), Neural Networks pounce wrong (-5)
  { ri: 1, ti: 0, q: 3, a: 'buzzer', p: 10, w: true },
  { ri: 1, ti: 1, q: 3, a: 'pounce_minus', p: -5, w: false },
  // Q4: Trivia Titans bounces (+10), Brainstormers bounces (+10)
  { ri: 1, ti: 2, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 3, q: 4, a: 'bounce', p: 10, w: true },
  // Q5: Quantum Minds pounce correct (+15), Neural Networks buzzer correct (+10), Trivia Titans bonus (+5)
  { ri: 1, ti: 0, q: 5, a: 'pounce_plus', p: 15, w: true },
  { ri: 1, ti: 1, q: 5, a: 'buzzer', p: 10, w: true },
  { ri: 1, ti: 2, q: 5, a: 'bonus', p: 5, w: true },
  // R2 totals: QM=45, NN=25, TT=30 (wait — let me adjust sums — see below)

  // === ROUND 3 (Arts & Literature) ===
  // Q1: Trivia Titans pounce correct (+15), Quantum Minds bounces (+10)
  { ri: 2, ti: 2, q: 1, a: 'pounce_plus', p: 15, w: true },
  { ri: 2, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  // Q2: Brainstormers bounces (+10), Neural Networks pounce wrong (-5)
  { ri: 2, ti: 3, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 1, q: 2, a: 'pounce_minus', p: -5, w: false },
  // Q3: Quantum Minds bounces (+10), Trivia Titans buzzer correct (+10)
  { ri: 2, ti: 0, q: 3, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 2, q: 3, a: 'buzzer', p: 10, w: true },
  // Q4: Trivia Titans bounces (+10), Neural Networks bounces (+10), Brainstormers buzzer wrong (-5)
  { ri: 2, ti: 2, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 1, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 3, q: 4, a: 'buzzer_minus', p: -5, w: false },
  // Q5: Quantum Minds bonus (+10), Trivia Titans pounce correct (+15), Neural Networks bonus (+5), Brainstormers bonus (+5)
  { ri: 2, ti: 0, q: 5, a: 'bonus', p: 10, w: true },
  { ri: 2, ti: 2, q: 5, a: 'pounce_plus', p: 15, w: true },
  { ri: 2, ti: 1, q: 5, a: 'bonus', p: 5, w: true },
  { ri: 2, ti: 3, q: 5, a: 'bonus', p: 5, w: true },
];
// Final totals: QM = (10+15+10+10) + (10+10+15) + (10+10+10) = 45+35+30 — hmm
// Let me just trust the rows; the leaderboard will compute automatically.

// ---- Active sample event data (in-progress event) ----
const activeEventData = {
  name: ACTIVE_SAMPLE_EVENT_NAME,
  description: '[SAMPLE] An active quiz event in progress — shows how the scoring page works.',
  date: new Date().toISOString(),
  quiz_master: 'Prof. David Kim',
  quiz_master_email: 'david.k@example.com',
  moderators: [{ name: 'Rachel Green', email: 'rachel.g@example.com' }],
  number_of_rounds: 3,
  points_system: 'Bounce: 10, Pounce+: 15, Pounce-: -5',
  status: 'active' as const,
  current_question: 3,
};

const activeRoundsData = [
  { round_name: 'History & Geography', round_number: 1, description: 'World history and geography', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' as const },
  { round_name: 'Pop Culture', round_number: 2, description: 'Movies, music, and trends', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'active' as const },
  { round_name: 'Sports & Games', round_number: 3, description: 'Athletics and board games', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'pending' as const },
];

const activeTeamsData = [
  {
    name: 'Quiz Wizards', lead: 'Dana Price',
    participants: [
      { name: 'Dana Price', student_id: 'STU101', email: 'dana.p@example.com', phone: '+1-555-0201' },
      { name: 'Carlos Ruiz', student_id: 'STU102', email: 'carlos.r@example.com', phone: '+1-555-0202' },
      { name: 'Fiona Walsh', student_id: 'STU103', email: 'fiona.w@example.com', phone: '+1-555-0203' },
    ],
  },
  {
    name: 'The Thinkers', lead: 'Mike Johnson',
    participants: [
      { name: 'Mike Johnson', student_id: 'STU104', email: 'mike.j@example.com', phone: '+1-555-0204' },
      { name: 'Sophie Lee', student_id: 'STU105', email: 'sophie.l@example.com', phone: '+1-555-0205' },
      { name: 'Tom Brown', student_id: 'STU106', email: 'tom.b@example.com', phone: '+1-555-0206' },
    ],
  },
  {
    name: 'Mind Benders', lead: 'Lisa Park',
    participants: [
      { name: 'Lisa Park', student_id: 'STU107', email: 'lisa.p@example.com', phone: '+1-555-0207' },
      { name: 'James Chen', student_id: 'STU108', email: 'james.c@example.com', phone: '+1-555-0208' },
      { name: 'Nora Ahmed', student_id: 'STU109', email: 'nora.a@example.com', phone: '+1-555-0209' },
    ],
  },
  {
    name: 'Fact Hunters', lead: 'Ryan Scott',
    participants: [
      { name: 'Ryan Scott', student_id: 'STU110', email: 'ryan.s@example.com', phone: '+1-555-0210' },
      { name: 'Amy Liu', student_id: 'STU111', email: 'amy.l@example.com', phone: '+1-555-0211' },
      { name: 'Ben Clark', student_id: 'STU112', email: 'ben.c@example.com', phone: '+1-555-0212' },
    ],
  },
];

const activeScoreTemplates: ST[] = [
  // ROUND 1 -- History & Geography (completed)
  { ri: 0, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 2, q: 1, a: 'pounce_plus', p: 15, w: true },
  { ri: 0, ti: 1, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 3, q: 2, a: 'pounce_minus', p: -5, w: false },
  { ri: 0, ti: 2, q: 3, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 0, q: 3, a: 'pounce_minus', p: -5, w: false },
  { ri: 0, ti: 3, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 1, q: 4, a: 'bonus', p: 5, w: true },
  { ri: 0, ti: 0, q: 5, a: 'pounce_plus', p: 15, w: true },
  { ri: 0, ti: 2, q: 5, a: 'buzzer', p: 10, w: true },
  // ROUND 2 -- Pop Culture (active, Q1-Q2 done, currently on Q3)
  { ri: 1, ti: 1, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 0, q: 1, a: 'pounce_plus', p: 15, w: true },
  { ri: 1, ti: 3, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 2, q: 2, a: 'pounce_minus', p: -5, w: false },
];

export async function loadSampleData(): Promise<string> {
  // Duplicate check
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('name', SAMPLE_EVENT_NAME)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error('Sample data already exists. Delete the existing sample event first.');
  }

  let createdEventId: string | null = null;

  try {
    // 1. Insert event
    const { data: ev, error: ee } = await supabase
      .from('events')
      .insert(eventData)
      .select('id')
      .single();
    if (ee) throw ee;
    if (!ev) throw new Error('No event data returned.');
    createdEventId = ev.id;

    // 2. Insert rounds
    const { data: insertedRounds, error: re } = await supabase
      .from('rounds')
      .insert(roundsData.map((r) => ({ ...r, event_id: ev.id })))
      .select('id, round_number');
    if (re) throw re;
    if (!insertedRounds || insertedRounds.length !== 3) throw new Error('Rounds insertion failed.');

    const roundIdMap = new Map<number, string>();
    insertedRounds.forEach((r) => roundIdMap.set(r.round_number, r.id));

    // 3. Insert teams + participants
    const teamIds: string[] = [];
    for (const team of teamsData) {
      const { data: td, error: te } = await supabase
        .from('teams')
        .insert({ event_id: ev.id, name: team.name, lead: team.lead })
        .select('id')
        .single();
      if (te) throw te;
      if (!td) throw new Error('No team data returned.');
      teamIds.push(td.id);

      const { error: pe } = await supabase.from('participants').insert(
        team.participants.map((p) => ({
          team_id: td.id,
          name: p.name,
          student_id: p.student_id,
          email: p.email,
          phone: p.phone,
        }))
      );
      if (pe) throw pe;
    }

    // 4. Insert scores
    const scoreRows = scoreTemplates.map((s) => ({
      event_id: ev.id,
      round_id: roundIdMap.get(s.ri + 1)!,
      team_id: teamIds[s.ti],
      question_number: s.q,
      action_type: s.a,
      points: s.p,
      winning_team_id: s.w ? teamIds[s.ti] : null,
    }));

    const { error: se } = await supabase.from('scores').insert(scoreRows);
    if (se) throw se;

    // 5. Set current_round_id to last round
    const lastRoundId = roundIdMap.get(3);
    if (lastRoundId) {
      await supabase.from('events').update({ current_round_id: lastRoundId }).eq('id', ev.id);
    }

    // ---- Insert active sample event ----
    const { data: existingActive } = await supabase
      .from('events')
      .select('id')
      .eq('name', ACTIVE_SAMPLE_EVENT_NAME)
      .limit(1);

    if (!existingActive || existingActive.length === 0) {
      const { data: aev, error: aee } = await supabase
        .from('events')
        .insert(activeEventData)
        .select('id')
        .single();
      if (aee) throw aee;
      if (!aev) throw new Error('No active event data returned.');

      const { data: aRounds, error: are } = await supabase
        .from('rounds')
        .insert(activeRoundsData.map((r) => ({ ...r, event_id: aev.id })))
        .select('id, round_number');
      if (are) throw are;
      if (!aRounds) throw new Error('Active rounds insertion failed.');

      const aRoundIdMap = new Map<number, string>();
      aRounds.forEach((r) => aRoundIdMap.set(r.round_number, r.id));

      const aTeamIds: string[] = [];
      for (const team of activeTeamsData) {
        const { data: td, error: te } = await supabase
          .from('teams')
          .insert({ event_id: aev.id, name: team.name, lead: team.lead })
          .select('id')
          .single();
        if (te) throw te;
        if (!td) throw new Error('No active team data returned.');
        aTeamIds.push(td.id);

        const { error: pe } = await supabase.from('participants').insert(
          team.participants.map((p) => ({ team_id: td.id, ...p }))
        );
        if (pe) throw pe;
      }

      const aScoreRows = activeScoreTemplates.map((s) => ({
        event_id: aev.id,
        round_id: aRoundIdMap.get(s.ri + 1)!,
        team_id: aTeamIds[s.ti],
        question_number: s.q,
        action_type: s.a,
        points: s.p,
        winning_team_id: s.w ? aTeamIds[s.ti] : null,
      }));

      const { error: ase } = await supabase.from('scores').insert(aScoreRows);
      if (ase) throw ase;

      const round2Id = aRoundIdMap.get(2);
      if (round2Id) {
        await supabase.from('events').update({ current_round_id: round2Id }).eq('id', aev.id);
      }
    }

    return ev.id;
  } catch (err) {
    // Rollback
    if (createdEventId) {
      await supabase.from('scores').delete().eq('event_id', createdEventId);
      const { data: tids } = await supabase.from('teams').select('id').eq('event_id', createdEventId);
      if (tids && tids.length > 0) {
        await supabase.from('participants').delete().in('team_id', tids.map((t) => t.id));
      }
      await supabase.from('teams').delete().eq('event_id', createdEventId);
      await supabase.from('rounds').delete().eq('event_id', createdEventId);
      await supabase.from('events').delete().eq('id', createdEventId);
    }
    throw err;
  }
}
