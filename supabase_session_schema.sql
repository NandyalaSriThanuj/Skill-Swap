-- Alter the public.learning_sessions table for advanced tracking
ALTER TABLE public.learning_sessions 
  DROP CONSTRAINT IF EXISTS learning_sessions_status_check;

ALTER TABLE public.learning_sessions 
  ADD COLUMN IF NOT EXISTS teaching_skill text,
  ADD COLUMN IF NOT EXISTS learning_skill text,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS progress integer default 0,
  ADD COLUMN IF NOT EXISTS mentor_rating numeric CHECK (mentor_rating >= 1 AND mentor_rating <= 5),
  ADD COLUMN IF NOT EXISTS learner_feedback text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer default 0,
  ADD COLUMN IF NOT EXISTS attendance_status jsonb default '{}'::jsonb;

ALTER TABLE public.learning_sessions 
  ADD CONSTRAINT learning_sessions_status_check 
  CHECK (status IN ('scheduled', 'active', 'completed', 'expired'));

-- Alter session_messages to support file/image/code sharing
ALTER TABLE public.session_messages
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text;

-- Add profile stats columns for learning sessions tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_sessions integer default 0,
  ADD COLUMN IF NOT EXISTS teaching_hours numeric default 0,
  ADD COLUMN IF NOT EXISTS learning_hours numeric default 0,
  ADD COLUMN IF NOT EXISTS rating numeric default 5;

