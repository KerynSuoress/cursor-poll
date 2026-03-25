-- Cursor Conference Voting — run in Supabase SQL Editor
-- Dashboard: Authentication → Providers → enable "Anonymous sign-ins"

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
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

alter table profiles enable row level security;
alter table votes enable row level security;
alter table questions enable row level security;

create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "read all profiles" on profiles for select using (true);
create policy "insert own votes" on votes for insert with check (auth.uid() = user_id);
create policy "update own votes" on votes for update using (auth.uid() = user_id);
create policy "read all votes" on votes for select using (true);
create policy "questions are public" on questions for select using (true);
