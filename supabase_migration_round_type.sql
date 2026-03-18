-- Migration to add round_type and buzzer_points columns to rounds table
-- round_type can be 'bounce_pounce' or 'buzzer'

-- Add round_type column
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS round_type text NOT NULL DEFAULT 'bounce_pounce';

-- Add buzzer_points column
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS buzzer_points integer NOT NULL DEFAULT 10;

-- Add check constraint to ensure only valid values
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_round_type_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_round_type_check CHECK (round_type IN ('bounce_pounce', 'buzzer'));
