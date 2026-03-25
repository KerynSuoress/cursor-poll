-- Cursor Conference Voting — run in Supabase SQL Editor
-- Dashboard: Authentication → Providers → enable "Anonymous sign-ins"
--
-- ⚠️  UPGRADING an existing deployment?
--     Run only the "Migration" block at the bottom instead of this full file.

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 80),
  feedback text check (char_length(feedback) <= 1000),
  created_at timestamptz default now()
);

create table questions (
  id serial primary key,
  text text not null,
  order_index int not null
);

insert into questions (text, order_index) values
  ('How would you rate the overall conference experience?', 1),
  ('How valuable was the content and speakers?', 2),
  ('How well was the event organized?', 3),
  ('How likely are you to attend a similar Cursor event again?', 4),
  ('Would you recommend this event to a colleague?', 5);

create table votes (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  question_id int references questions(id),
  score int check (score between 1 and 5),
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

create index votes_question_id_idx on votes(question_id);

-- ─────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────

alter table profiles enable row level security;
alter table votes enable row level security;
alter table questions enable row level security;

create policy "insert own profile"  on profiles for insert with check (auth.uid() = id);
create policy "update own profile"  on profiles for update using (auth.uid() = id);
create policy "read all profiles"   on profiles for select using (true);

create policy "insert own votes"    on votes for insert with check (auth.uid() = user_id);
create policy "update own votes"    on votes for update using (auth.uid() = user_id);
-- No raw SELECT policy on votes — aggregated data is exposed via get_vote_averages() RPC only.

create policy "questions are public" on questions for select using (true);

-- ─────────────────────────────────────────────
-- RPC: aggregated results (hides individual scores)
-- ─────────────────────────────────────────────

create or replace function get_vote_averages()
returns table(
  id          int,
  text        text,
  order_index int,
  avg_score   numeric,
  vote_count  bigint
)
language sql
security definer
as $$
  select
    q.id,
    q.text,
    q.order_index,
    round(coalesce(avg(v.score), 0)::numeric, 1) as avg_score,
    count(v.id)                                  as vote_count
  from questions q
  left join votes v on v.question_id = q.id
  group by q.id, q.text, q.order_index
  order by q.order_index;
$$;

-- Allow any authenticated user (including anonymous) to call this function.
grant execute on function get_vote_averages() to authenticated;

-- ─────────────────────────────────────────────
-- Migration (existing deployment only)
-- ─────────────────────────────────────────────
-- Run this block if you already applied the original schema.sql:
--
-- alter table profiles
--   add column if not exists feedback text check (char_length(feedback) <= 1000),
--   add constraint profiles_name_length check (char_length(name) <= 80);
--
-- create index if not exists votes_question_id_idx on votes(question_id);
--
-- drop policy if exists "read all votes" on votes;
--
-- create or replace function get_vote_averages() ...  (paste function above)
-- grant execute on function get_vote_averages() to authenticated;
