// Run: node scripts/seed-sample.mjs
// Inserts sample event data into Supabase for demo purposes.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env manually to avoid dotenv dependency
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

const SAMPLE_EVENT_NAME = '[SAMPLE] Annual Quiz Championship 2026';

const eventData = {
  name: SAMPLE_EVENT_NAME,
  description: '[SAMPLE] A demo quiz event showcasing all QFactor features.',
  date: new Date().toISOString(),
  quiz_master: 'Dr. Sarah Mitchell',
  quiz_master_email: 'sarah.m@example.com',
  moderators: [
    { name: 'James Wilson', email: 'james.w@example.com' },
    { name: 'Priya Sharma', email: 'priya.s@example.com' },
  ],
  number_of_rounds: 3,
  points_system: 'Bounce: 10, Pounce+: 15, Pounce-: -5',
  status: 'completed',
  current_question: 5,
};

const roundsData = [
  { round_name: 'General Knowledge', round_number: 1, description: 'Science, history, geography, and culture', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' },
  { round_name: 'Science & Technology', round_number: 2, description: 'Physics, chemistry, biology, and modern tech', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' },
  { round_name: 'Arts & Literature', round_number: 3, description: 'World literature, fine arts, music, and cinema', bounce_points: 10, pounce_plus: 15, pounce_minus: -5, question_count: 5, status: 'completed' },
];

const teamsData = [
  {
    name: 'Quantum Minds', lead: 'Alex Rivera',
    participants: [
      { name: 'Alex Rivera', student_id: 'STU001', email: 'alex.r@example.com', phone: '+1-555-0101' },
      { name: 'Maya Chen', student_id: 'STU002', email: 'maya.c@example.com', phone: '+1-555-0102' },
      { name: 'Jordan Lee', student_id: 'STU003', email: 'jordan.l@example.com', phone: '+1-555-0103' },
    ],
  },
  {
    name: 'Neural Networks', lead: 'Sam Patel',
    participants: [
      { name: 'Sam Patel', student_id: 'STU004', email: 'sam.p@example.com', phone: '+1-555-0104' },
      { name: 'Olivia Brooks', student_id: 'STU005', email: 'olivia.b@example.com', phone: '+1-555-0105' },
      { name: 'Ethan Nguyen', student_id: 'STU006', email: 'ethan.n@example.com', phone: '+1-555-0106' },
    ],
  },
  {
    name: 'Trivia Titans', lead: 'Zoe Martinez',
    participants: [
      { name: 'Zoe Martinez', student_id: 'STU007', email: 'zoe.m@example.com', phone: '+1-555-0107' },
      { name: "Liam O'Connor", student_id: 'STU008', email: 'liam.o@example.com', phone: '+1-555-0108' },
      { name: 'Aisha Khan', student_id: 'STU009', email: 'aisha.k@example.com', phone: '+1-555-0109' },
    ],
  },
  {
    name: 'Brainstormers', lead: 'Noah Taylor',
    participants: [
      { name: 'Noah Taylor', student_id: 'STU010', email: 'noah.t@example.com', phone: '+1-555-0110' },
      { name: 'Emma Wilson', student_id: 'STU011', email: 'emma.w@example.com', phone: '+1-555-0111' },
      { name: 'Raj Gupta', student_id: 'STU012', email: 'raj.g@example.com', phone: '+1-555-0112' },
    ],
  },
];

// [roundIndex, teamIndex, questionNumber, actionType, points, isWinner]
const scoreTemplates = [
  // ROUND 1 — General Knowledge
  { ri: 0, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 3, q: 1, a: 'pounce_minus', p: -5, w: false },
  { ri: 0, ti: 1, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 2, q: 2, a: 'pounce_plus', p: 15, w: true },
  { ri: 0, ti: 0, q: 3, a: 'pounce_plus', p: 15, w: true },
  { ri: 0, ti: 1, q: 3, a: 'buzzer', p: 10, w: true },
  { ri: 0, ti: 3, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 0, q: 4, a: 'bonus', p: 10, w: true },
  { ri: 0, ti: 2, q: 5, a: 'bounce', p: 10, w: true },
  { ri: 0, ti: 3, q: 5, a: 'buzzer_minus', p: -5, w: false },
  { ri: 0, ti: 1, q: 5, a: 'bonus', p: 10, w: true },

  // ROUND 2 — Science & Technology
  { ri: 1, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 2, q: 1, a: 'pounce_plus', p: 15, w: true },
  { ri: 1, ti: 1, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 3, q: 2, a: 'pounce_plus', p: 15, w: true },
  { ri: 1, ti: 0, q: 3, a: 'buzzer', p: 10, w: true },
  { ri: 1, ti: 1, q: 3, a: 'pounce_minus', p: -5, w: false },
  { ri: 1, ti: 2, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 3, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 1, ti: 0, q: 5, a: 'pounce_plus', p: 15, w: true },
  { ri: 1, ti: 1, q: 5, a: 'buzzer', p: 10, w: true },
  { ri: 1, ti: 2, q: 5, a: 'bonus', p: 5, w: true },

  // ROUND 3 — Arts & Literature
  { ri: 2, ti: 2, q: 1, a: 'pounce_plus', p: 15, w: true },
  { ri: 2, ti: 0, q: 1, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 3, q: 2, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 1, q: 2, a: 'pounce_minus', p: -5, w: false },
  { ri: 2, ti: 0, q: 3, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 2, q: 3, a: 'buzzer', p: 10, w: true },
  { ri: 2, ti: 2, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 1, q: 4, a: 'bounce', p: 10, w: true },
  { ri: 2, ti: 3, q: 4, a: 'buzzer_minus', p: -5, w: false },
  { ri: 2, ti: 0, q: 5, a: 'bonus', p: 10, w: true },
  { ri: 2, ti: 2, q: 5, a: 'pounce_plus', p: 15, w: true },
  { ri: 2, ti: 1, q: 5, a: 'bonus', p: 5, w: true },
  { ri: 2, ti: 3, q: 5, a: 'bonus', p: 5, w: true },
];

async function seed() {
  console.log('Checking for existing sample data...');
  const { data: existing } = await supabase.from('events').select('id').eq('name', SAMPLE_EVENT_NAME).limit(1);
  if (existing && existing.length > 0) {
    console.log('Sample data already exists. Delete it first from the app, then re-run.');
    process.exit(1);
  }

  console.log('Inserting sample event...');
  const { data: ev, error: ee } = await supabase.from('events').insert(eventData).select('id').single();
  if (ee) { console.error('Event insert failed:', ee.message); process.exit(1); }
  console.log(`  Event created: ${ev.id}`);

  console.log('Inserting rounds...');
  const { data: insertedRounds, error: re } = await supabase
    .from('rounds')
    .insert(roundsData.map((r) => ({ ...r, event_id: ev.id })))
    .select('id, round_number');
  if (re) { console.error('Rounds insert failed:', re.message); process.exit(1); }

  const roundIdMap = new Map();
  insertedRounds.forEach((r) => roundIdMap.set(r.round_number, r.id));
  console.log(`  ${insertedRounds.length} rounds created`);

  console.log('Inserting teams & participants...');
  const teamIds = [];
  for (const team of teamsData) {
    const { data: td, error: te } = await supabase
      .from('teams').insert({ event_id: ev.id, name: team.name, lead: team.lead })
      .select('id').single();
    if (te) { console.error('Team insert failed:', te.message); process.exit(1); }
    teamIds.push(td.id);

    const { error: pe } = await supabase.from('participants').insert(
      team.participants.map((p) => ({ team_id: td.id, ...p }))
    );
    if (pe) { console.error('Participants insert failed:', pe.message); process.exit(1); }
  }
  console.log(`  ${teamIds.length} teams with participants created`);

  console.log('Inserting scores...');
  const scoreRows = scoreTemplates.map((s) => ({
    event_id: ev.id,
    round_id: roundIdMap.get(s.ri + 1),
    team_id: teamIds[s.ti],
    question_number: s.q,
    action_type: s.a,
    points: s.p,
    winning_team_id: s.w ? teamIds[s.ti] : null,
  }));
  const { error: se } = await supabase.from('scores').insert(scoreRows);
  if (se) { console.error('Scores insert failed:', se.message); process.exit(1); }
  console.log(`  ${scoreRows.length} score entries created`);

  // Set current_round_id to last round
  const lastRoundId = roundIdMap.get(3);
  if (lastRoundId) {
    await supabase.from('events').update({ current_round_id: lastRoundId }).eq('id', ev.id);
  }

  // Print score summary
  console.log('\n--- Score Summary ---');
  const teamNames = teamsData.map((t) => t.name);
  for (let ti = 0; ti < 4; ti++) {
    let total = 0;
    const parts = [];
    for (let ri = 0; ri < 3; ri++) {
      const roundTotal = scoreTemplates
        .filter((s) => s.ri === ri && s.ti === ti)
        .reduce((sum, s) => sum + s.p, 0);
      total += roundTotal;
      parts.push(`R${ri + 1}:${roundTotal}`);
    }
    console.log(`  ${teamNames[ti].padEnd(18)} ${parts.join('  ')}  Total: ${total}`);
  }

  console.log('\nDone! Sample data inserted successfully.');
  console.log(`Event ID: ${ev.id}`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
