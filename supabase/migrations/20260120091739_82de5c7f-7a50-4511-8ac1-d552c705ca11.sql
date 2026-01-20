-- 2) Fix function search_path for security linter
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Tighten RLS on quiz_sessions (remove overly permissive policy)
drop policy if exists "Service can manage quiz sessions" on public.quiz_sessions;

create policy "Users can view their quiz sessions"
on public.quiz_sessions
for select
using (auth.uid() = user_id);

create policy "Users can create their quiz sessions"
on public.quiz_sessions
for insert
with check (auth.uid() = user_id);

create policy "Users can update their quiz sessions"
on public.quiz_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their quiz sessions"
on public.quiz_sessions
for delete
using (auth.uid() = user_id);

-- 4) Referral visit inserts: allow anonymous inserts only when user_id is null
drop policy if exists "Anyone can insert referral_visits" on public.referral_visits;
create policy "Visitors can insert referral visits"
on public.referral_visits
for insert
with check (user_id is null or user_id = auth.uid());