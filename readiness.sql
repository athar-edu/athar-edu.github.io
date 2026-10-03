-- Run manually as postgres in a staging Supabase SQL Editor after schema.sql.
-- All synthetic rows and temporary fixtures are rolled back. No real row is changed.
-- Requires the client-generated id INSERT grant from the current schema.
-- A SQL capacity check is not a browser/API concurrency or durability test.
begin;
set local statement_timeout = '30s';

create temporary table readiness_fixture (
  n integer primary key,
  id uuid not null unique default gen_random_uuid()
) on commit drop;
insert into readiness_fixture (n) select generate_series(1, 3003);
grant select on readiness_fixture to anon, authenticated;

-- Isolated approved/rejected samples, seeded by the administrator.
insert into public.teacher_impact_submissions
  (id, student_name, country, level, teacher_name, message, status)
select id, 'Synthetic QA', 'QA', 'المستوى الأول', '', 'Synthetic QA moderation sample',
  case n when 3001 then 'approved' else 'rejected' end
from readiness_fixture where n in (3001, 3002);

set local role anon;
-- The same privileges used by visitors accept 3,000 synthetic submissions.
-- Omit status and created_at: the server owns automatic approval and timestamps.
insert into public.teacher_impact_submissions
  (id, student_name, country, level, teacher_name, message)
select id, 'Synthetic QA ' || n, 'QA', 'المستوى الأول', '',
  'Synthetic QA capacity sample ' || n
from readiness_fixture where n <= 3000;

do $qa$
declare
  seen integer;
  duplicate_constraint text;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3001 then
    raise exception 'FAIL anon SELECT: expected 3000 new approved rows plus the approved fixture, got %', seen;
  end if;
  if exists (select 1 from public.teacher_impact_submissions where status <> 'approved') then
    raise exception 'FAIL anon SELECT exposed a pending or rejected row';
  end if;

  -- A retry with the same UUID must not create a second automatically approved row.
  begin
    insert into public.teacher_impact_submissions
      (id, student_name, country, level, teacher_name, message)
    select id, 'Synthetic QA 1', 'QA', 'المستوى الأول', '',
      'Synthetic QA capacity sample 1' from readiness_fixture where n = 1;
    raise exception 'FAIL duplicate UUID was accepted';
  exception when unique_violation then
    get stacked diagnostics duplicate_constraint = constraint_name;
    if duplicate_constraint <> 'teacher_impact_submissions_pkey' then
      raise exception 'FAIL duplicate hit unexpected constraint: %', duplicate_constraint;
    end if;
  end;

  begin
    insert into public.teacher_impact_submissions (country, level, message, status)
      values ('QA', 'المستوى الأول', 'Synthetic QA forbidden status', 'approved');
    raise exception 'FAIL anon can set status';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.teacher_impact_submissions (country, level, message, created_at)
      values ('QA', 'المستوى الأول', 'Synthetic QA forbidden date', now());
    raise exception 'FAIL anon can set created_at';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.teacher_impact_submissions set status = 'approved'
      where id = (select id from readiness_fixture where n = 1);
    raise exception 'FAIL anon has UPDATE privilege';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.teacher_impact_submissions
      where id = (select id from readiness_fixture where n = 3001);
    raise exception 'FAIL anon has DELETE privilege';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.teacher_impact_submissions (country, level, message)
      values ('  ', 'المستوى الأول', 'Synthetic QA blank country');
    raise exception 'FAIL blank country accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.teacher_impact_submissions (country, level, message)
      values ('QA', 'المستوى الأول', repeat('x', 2001));
    raise exception 'FAIL message over 2000 characters accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS anon: 3000 automatic-approved INSERTs, rejected hidden, no status/date writes, duplicate rejection, validation';
end;
$qa$;

reset role;
do $qa$
declare saved integer;
begin
  select count(*) into saved from public.teacher_impact_submissions s
    join readiness_fixture f using (id)
    where f.n <= 3000 and s.status = 'approved' and s.created_at = transaction_timestamp();
  if saved <> 3000 then
    raise exception 'FAIL administrator expected 3000 approved rows with server timestamp, got %', saved;
  end if;
  raise notice 'PASS administrator: exactly 3000 automatic-approved capacity fixtures exist';
end;
$qa$;

set local role authenticated;
insert into public.teacher_impact_submissions
  (id, student_name, country, level, teacher_name, message)
select id, 'Synthetic authenticated QA', 'QA', 'المستوى الثاني', '',
  'Synthetic QA authenticated sample' from readiness_fixture where n = 3003;
do $qa$
declare seen integer;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3002 then
    raise exception 'FAIL authenticated SELECT: expected 3002 approved fixtures, got %', seen;
  end if;
  begin
    insert into public.teacher_impact_submissions (country, level, message, status)
      values ('QA', 'المستوى الأول', 'Synthetic QA forbidden status', 'approved');
    raise exception 'FAIL authenticated can set status';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.teacher_impact_submissions set status = 'approved'
      where id = (select id from readiness_fixture where n = 1);
    raise exception 'FAIL authenticated has UPDATE privilege';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.teacher_impact_submissions
      where id = (select id from readiness_fixture where n = 3001);
    raise exception 'FAIL authenticated has DELETE privilege';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS authenticated: INSERT allowed, approved-only SELECT, no moderation';
end;
$qa$;

reset role;
-- Reject one automatically approved fixture; leave every real record untouched.
update public.teacher_impact_submissions set status = 'rejected'
  where id = (select id from readiness_fixture where n = 1);
set local role anon;
do $qa$
declare seen integer;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3001 then
    raise exception 'FAIL rejected fixture remained publicly readable';
  end if;
  raise notice 'PASS anon rejection: rejected fixture disappears';
end;
$qa$;
reset role;

set local role authenticated;
do $qa$
declare seen integer;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3001 then
    raise exception 'FAIL authenticated can still read the rejected fixture';
  end if;
  if exists (select 1 from public.teacher_impact_submissions where status <> 'approved') then
    raise exception 'FAIL authenticated SELECT exposed a pending or rejected row';
  end if;
  raise notice 'PASS authenticated rejection: rejected fixture disappears';
end;
$qa$;
reset role;

-- Reapprove the same fixture and verify visibility for both public roles.
update public.teacher_impact_submissions set status = 'approved'
  where id = (select id from readiness_fixture where n = 1);
set local role anon;
do $qa$
declare seen integer;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3002 then
    raise exception 'FAIL anon cannot read the reapproved fixture';
  end if;
  raise notice 'PASS anon reapproval: fixture becomes public again';
end;
$qa$;
reset role;
set local role authenticated;
do $qa$
declare seen integer;
begin
  select count(*) into seen from public.teacher_impact_submissions s
    join readiness_fixture f using (id);
  if seen <> 3002 then
    raise exception 'FAIL authenticated cannot read the reapproved fixture';
  end if;
  raise notice 'PASS authenticated reapproval: fixture becomes public again';
end;
$qa$;
reset role;
do $qa$
begin
  if not exists (
    select 1 from public.teacher_impact_submissions s
    join readiness_fixture f using (id)
    where f.n = 3002 and s.status = 'rejected'
  ) then
    raise exception 'FAIL the originally rejected fixture was changed';
  end if;
end;
$qa$;

rollback;
-- Expect PASS notices above and a ROLLBACK result; no fixtures persist.
