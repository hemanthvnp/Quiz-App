import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://rcvsoamiywxwvimifboh.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdnNvYW1peXd4d3ZpbWlmYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDQ2NTAsImV4cCI6MjA4OTEyMDY1MH0.MLk4zUIiz6YNfk_WndKCSE9oBqBXU8KMP2yS8An3Za8'
);
