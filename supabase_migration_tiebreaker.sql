-- Add tiebreaker_questions column to rounds table
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS tiebreaker_questions integer NOT NULL DEFAULT 3;
