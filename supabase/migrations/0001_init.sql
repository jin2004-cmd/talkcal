-- TalkCal Supabase schema
-- 0001_init.sql
-- 在 Supabase SQL Editor 里整段跑一次即可。

-- 1) events 表
create table if not exists public.events (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  priority text not null default 'med' check (priority in ('high','med','low')),
  category text not null default 'life',
  note text default '',
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) push_subscriptions 表（Web Push 订阅）
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  keys jsonb not null,
  updated_at timestamptz not null default now()
);

-- 3) RLS：只能看到/修改自己的行
alter table public.events enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events for update using (auth.uid() = user_id);
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push_upsert_own" on public.push_subscriptions;
create policy "push_upsert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions for update using (auth.uid() = user_id);
drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- 4) 开启 Realtime（events 表）
alter publication supabase_realtime add table public.events;

-- 5) 方便后台函数按 user_id 反查
create index if not exists events_user_time_idx on public.events (user_id, start_at);
create index if not exists push_user_idx on public.push_subscriptions (user_id);
