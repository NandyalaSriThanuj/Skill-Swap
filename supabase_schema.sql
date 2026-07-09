-- SkillSwap Database Schema
-- Run this script in your Supabase SQL Editor to set up all tables, indexes, triggers, and Row Level Security (RLS) policies.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

---------------------------------------------------------
-- 1. PROFILES TABLE
-- Stores profile details. Syncs with Supabase Auth users.
---------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  availability text default 'available' check (availability in ('available', 'busy', 'offline')),
  skills_teach text[] default '{}',
  skills_learn text[] default '{}',
  mentor_verification_status text default 'pending' check (mentor_verification_status in ('pending', 'verified', 'rejected')),
  interview_status text default 'pending',
  final_score integer,
  skill_verified text,
  mentor_badge text,
  assessment_date timestamp with time zone,
  certificate_status text default 'not_issued',
  last_assessment_timestamp timestamp with time zone,
  certificates jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

---------------------------------------------------------
-- 2. SKILLS TABLE
-- Master catalog of skills available on the platform.
---------------------------------------------------------
create table public.skills (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on skills
alter table public.skills enable row level security;

-- Skills Policies
create policy "Skills are viewable by everyone" 
  on public.skills for select 
  using (true);

create policy "Authenticated users can suggest/insert new skills" 
  on public.skills for insert 
  with check (auth.role() = 'authenticated');

---------------------------------------------------------
-- 3. USER_SKILLS JUNCTION TABLE
-- Maps users to the skills they want to teach or learn.
---------------------------------------------------------
create table public.user_skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill_id uuid references public.skills(id) on delete cascade not null,
  type text not null check (type in ('teach', 'learn')),
  level text not null check (level in ('Beginner', 'Intermediate', 'Expert')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure a user doesn't add the same teach/learn skill duplicate record
  unique (user_id, skill_id, type)
);

-- Enable RLS on user_skills
alter table public.user_skills enable row level security;

-- User Skills Policies
create policy "User skill mappings are viewable by everyone" 
  on public.user_skills for select 
  using (true);

create policy "Users can map their own skills" 
  on public.user_skills for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own mapped skills" 
  on public.user_skills for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own mapped skills" 
  on public.user_skills for delete 
  using (auth.uid() = user_id);

---------------------------------------------------------
-- 4. SWAP_REQUESTS TABLE
-- Manages exchange proposals between two users.
---------------------------------------------------------
create table public.swap_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  skill_offered text not null,
  skill_wanted text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'rejected', 'completed')),
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Check constraint to prevent requesting swap with oneself
  constraint swap_cannot_be_self check (sender_id <> receiver_id)
);

-- Enable RLS on swap_requests
alter table public.swap_requests enable row level security;

-- Swap Requests Policies
create policy "Users can view swap requests they are involved in" 
  on public.swap_requests for select 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Authenticated users can create swap requests" 
  on public.swap_requests for insert 
  with check (auth.uid() = sender_id);

create policy "Involved users can update swap requests" 
  on public.swap_requests for update 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

---------------------------------------------------------
-- 5. REVIEWS TABLE
-- Stores ratings and feedback after a swap is completed.
---------------------------------------------------------
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  swap_request_id uuid references public.swap_requests(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure reviewer cannot leave multiple reviews for the same request
  unique (swap_request_id, reviewer_id),
  constraint reviewer_cannot_be_reviewee check (reviewer_id <> reviewee_id)
);

-- Enable RLS on reviews
alter table public.reviews enable row level security;

-- Reviews Policies
create policy "Reviews are viewable by everyone" 
  on public.reviews for select 
  using (true);

create policy "Participants can review completed swaps" 
  on public.reviews for insert 
  with check (
    auth.uid() = reviewer_id 
    and exists (
      select 1 from public.swap_requests 
      where id = swap_request_id and status = 'completed'
    )
  );

---------------------------------------------------------
-- 6. NOTIFICATIONS TABLE
-- Real-time events inbox for swap proposals, status updates, or reviews.
---------------------------------------------------------
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('request_received', 'request_accepted', 'message_received', 'review_received')),
  title text not null,
  content text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on notifications
alter table public.notifications enable row level security;

-- Notifications Policies
create policy "Users can view their own notifications" 
  on public.notifications for select 
  using (auth.uid() = user_id);

create policy "Users can update their own notifications" 
  on public.notifications for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications" 
  on public.notifications for delete 
  using (auth.uid() = user_id);

---------------------------------------------------------
-- INDEXES FOR PERFORMANCE OPTIMIZATION
---------------------------------------------------------
create index idx_profiles_username on public.profiles(username);
create index idx_user_skills_user_id on public.user_skills(user_id);
create index idx_user_skills_skill_id on public.user_skills(skill_id);
create index idx_swap_requests_sender on public.swap_requests(sender_id);
create index idx_swap_requests_receiver on public.swap_requests(receiver_id);
create index idx_reviews_reviewee on public.reviews(reviewee_id);
create index idx_notifications_user_unread on public.notifications(user_id) where is_read = false;

---------------------------------------------------------
-- TRIGGERS & FUNCTIONS
---------------------------------------------------------

-- 1. Automatically update 'updated_at' column on update
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trigger_update_swap_requests_updated_at
  before update on public.swap_requests
  for each row execute function public.handle_updated_at();

-- Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name, avatar_url, bio, location, availability, skills_teach, skills_learn)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=' || coalesce(new.raw_user_meta_data->>'username', new.id::text),
    '',
    null,
    'available',
    '{}',
    '{}'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
---------------------------------------------------------
-- 7. LEARNING_SESSIONS TABLE
-- Stores private real-time communication rooms.
---------------------------------------------------------
create table public.learning_sessions (
  id uuid default gen_random_uuid() primary key,
  room_id text unique not null,
  learner_id uuid references public.profiles(id) on delete cascade not null,
  mentor_id uuid references public.profiles(id) on delete cascade not null,
  swap_request_id uuid references public.swap_requests(id) on delete cascade not null,
  session_link text not null,
  status text default 'active' not null check (status in ('active', 'expired')),
  shared_notes text default '' not null,
  expires_at timestamp with time zone default (now() + interval '24 hours') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on learning_sessions
alter table public.learning_sessions enable row level security;

-- Learning Sessions Policies
create policy "Users can view learning sessions they are part of" 
  on public.learning_sessions for select 
  using (auth.uid() = learner_id or auth.uid() = mentor_id);

create policy "Users can insert sessions they are part of" 
  on public.learning_sessions for insert 
  with check (auth.uid() = learner_id or auth.uid() = mentor_id);

create policy "Users can update learning sessions they are part of" 
  on public.learning_sessions for update 
  using (auth.uid() = learner_id or auth.uid() = mentor_id);

-- Indexes for performance
create index idx_learning_sessions_room_id on public.learning_sessions(room_id);
create index idx_learning_sessions_participants on public.learning_sessions(learner_id, mentor_id);

-- Trigger to notify users when a session is created
create or replace function public.notify_on_session_created()
returns trigger as $$
declare
  learner_name text;
  mentor_name text;
begin
  -- Fetch display names
  select full_name into learner_name from public.profiles where id = new.learner_id;
  select full_name into mentor_name from public.profiles where id = new.mentor_id;

  -- Notify Learner
  insert into public.notifications (user_id, type, title, content)
  values (
    new.learner_id,
    'request_accepted',
    'Learning Session Created!',
    'Your swap request is accepted. Join ' || coalesce(mentor_name, 'Partner') || ' in the learning room.'
  );

  -- Notify Mentor
  insert into public.notifications (user_id, type, title, content)
  values (
    new.mentor_id,
    'request_accepted',
    'Learning Session Created!',
    'You accepted a swap request. Join ' || coalesce(learner_name, 'Partner') || ' in the learning room.'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_on_session_created
  after insert on public.learning_sessions
  for each row execute function public.notify_on_session_created();

---------------------------------------------------------
-- 8. MESSAGES TABLE
-- Chat messages for coordinating swap requests.
---------------------------------------------------------
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  swap_request_id uuid references public.swap_requests(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on messages
alter table public.messages enable row level security;

-- Messages Policies
create policy "Users can view messages they are part of" 
  on public.messages for select 
  using (
    exists (
      select 1 from public.swap_requests 
      where id = messages.swap_request_id 
      and (auth.uid() = sender_id or auth.uid() = receiver_id)
    )
  );

create policy "Users can insert messages they are part of" 
  on public.messages for insert 
  with check (
    auth.uid() = sender_id 
    and exists (
      select 1 from public.swap_requests 
      where id = messages.swap_request_id 
      and (auth.uid() = sender_id or auth.uid() = receiver_id)
    )
  );

create index idx_messages_swap_request_id on public.messages(swap_request_id);

---------------------------------------------------------
-- 9. SESSION_MESSAGES TABLE
-- Live chat messages within learning rooms.
---------------------------------------------------------
create table public.session_messages (
  id uuid default gen_random_uuid() primary key,
  room_id text references public.learning_sessions(room_id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on session_messages
alter table public.session_messages enable row level security;

-- Session Messages Policies
create policy "Users can view session messages they are part of" 
  on public.session_messages for select 
  using (
    exists (
      select 1 from public.learning_sessions 
      where room_id = session_messages.room_id 
      and (auth.uid() = learner_id or auth.uid() = mentor_id)
    )
  );

create policy "Users can insert session messages they are part of" 
  on public.session_messages for insert 
  with check (
    auth.uid() = sender_id 
    and exists (
      select 1 from public.learning_sessions 
      where room_id = session_messages.room_id 
      and (auth.uid() = learner_id or auth.uid() = mentor_id)
    )
  );

create index idx_session_messages_room_id on public.session_messages(room_id);

---------------------------------------------------------
-- 10. INTERVIEW_SESSIONS TABLE
-- Stores individual chat transcripts and statuses of active assessment interviews.
---------------------------------------------------------
create table public.interview_sessions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid default gen_random_uuid() not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill text not null,
  status text default 'pending' not null check (status in ('pending', 'in_progress', 'completed')),
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, skill)
);

-- Enable RLS on interview_sessions
alter table public.interview_sessions enable row level security;

-- Policies for interview_sessions
create policy "Users can view their own interview sessions"
  on public.interview_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own interview sessions"
  on public.interview_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own interview sessions"
  on public.interview_sessions for update
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp on interview_sessions
create trigger trigger_update_interview_sessions_updated_at
  before update on public.interview_sessions
  for each row execute function public.handle_updated_at();

---------------------------------------------------------
-- 11. MENTOR_ASSESSMENTS TABLE
-- Stores final evaluation scores, detailed feedback report, badge, and final recommendation.
---------------------------------------------------------
create table public.mentor_assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill text not null,
  interview_transcript jsonb not null default '[]'::jsonb,
  score integer check (score >= 0 and score <= 100),
  report text,
  badge text not null check (badge in ('Expert Mentor', 'Verified Mentor', 'Community Mentor', 'Not Eligible')),
  recommendation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, skill)
);

-- Enable RLS on mentor_assessments
alter table public.mentor_assessments enable row level security;

-- Policies for mentor_assessments
create policy "Mentor assessments are viewable by everyone"
  on public.mentor_assessments for select
  using (true);

create policy "Users can insert their own mentor assessments"
  on public.mentor_assessments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own mentor assessments"
  on public.mentor_assessments for update
  using (auth.uid() = user_id);

-- Indexes for performance
create index idx_interview_sessions_user_skill on public.interview_sessions(user_id, skill);
create index idx_mentor_assessments_user_skill on public.mentor_assessments(user_id, skill);
create index idx_mentor_assessments_badge on public.mentor_assessments(badge);


