-- Run once in the Supabase SQL Editor. New submissions are approved by the server.
begin;
create table public.teacher_impact_submissions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null default '' check (char_length(student_name) <= 40),
  country text not null check (char_length(btrim(country)) between 1 and 40),
  level text not null check (char_length(btrim(level)) between 1 and 40),
  teacher_name text not null default '' check (char_length(teacher_name) <= 40),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now(),
  status text not null default 'approved' check (status in ('pending','approved','rejected'))
);
alter table public.teacher_impact_submissions enable row level security;
revoke all on public.teacher_impact_submissions from public, anon, authenticated;
grant select on public.teacher_impact_submissions to anon, authenticated;
grant insert (id,student_name,country,level,teacher_name,message)
  on public.teacher_impact_submissions to anon, authenticated;
create policy approved_public_read on public.teacher_impact_submissions
  for select to anon, authenticated using (status = 'approved');
create policy automatic_approved_submission on public.teacher_impact_submissions
  for insert to anon, authenticated with check (status = 'approved');
create index teacher_impact_approved_recent on public.teacher_impact_submissions
  (created_at desc, id desc) where status = 'approved';
commit;
