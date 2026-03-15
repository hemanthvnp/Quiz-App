export interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  quiz_master: string;
  quiz_master_email: string;
  moderators: Moderator[];
  number_of_rounds: number;
  points_system: string | null;
  status: 'upcoming' | 'active' | 'completed';
  current_round_id: string | null;
  current_question: number;
  created_at: string;
}

export interface Moderator {
  name: string;
  email?: string;
}

export interface Round {
  id: string;
  event_id: string;
  round_name: string;
  round_number: number;
  description: string | null;
  bounce_points: number;
  pounce_plus: number;
  pounce_minus: number;
  question_count: number;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  lead: string;
  created_at: string;
}

export interface Participant {
  id: string;
  team_id: string;
  name: string;
  student_id: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export type ActionType = 'bounce' | 'pounce_plus' | 'pounce_minus' | 'buzzer' | 'buzzer_minus' | 'bonus';

export interface Score {
  id: string;
  event_id: string;
  round_id: string;
  team_id: string;
  question_number: number;
  action_type: ActionType;
  points: number;
  winning_team_id: string | null;
  created_at: string;
}

export interface TeamWithScores extends Team {
  totalScore: number;
  roundScore: number;
  participants?: Participant[];
}
