-- ==============================================================================
-- TestHub Complete All-in-One Database Setup Script
-- Run this once in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. TABLE: admin_emails
create table if not exists public.admin_emails (
  email text primary key check (email = lower(trim(email)))
);

comment on table public.admin_emails is 'Authorized Gmail accounts with admin rights for the coaching owner';

-- 3. TABLE: profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'student')) default 'student',
  full_name text null,
  grade int null check (grade is null or (grade >= 8 and grade <= 12)),
  created_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists grade int check (grade is null or (grade >= 8 and grade <= 12));

comment on table public.profiles is 'User profiles with role assignment and student grade';

-- 4. TABLE: classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  grade int not null unique check (grade >= 8 and grade <= 12)
);

comment on table public.classes is 'Coaching centre class levels (Grades 8, 9, 10, 11, 12)';

-- 5. TABLE: subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint uq_subject_per_class unique (class_id, name)
);

comment on table public.subjects is 'Subjects offered under specific classes';

-- 6. TABLE: tests
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  duration_minutes int null check (duration_minutes is null or duration_minutes > 0),
  marks_per_question numeric not null default 1 check (marks_per_question > 0),
  negative_marks numeric not null default 0 check (negative_marks >= 0),
  show_result boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.tests is 'MCQ tests configuration and publication state';

-- 7. TABLE: questions
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  "position" int not null check ("position" > 0),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text null,
  created_at timestamptz not null default now(),
  constraint uq_question_position_per_test unique (test_id, "position")
);

comment on table public.questions is 'MCQ questions with options, server-only correct answers, and explanations';

-- 8. TABLE: attempts
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null,
  class_id uuid not null references public.classes(id) on delete cascade,
  total_questions int not null default 0,
  correct int not null default 0,
  wrong int not null default 0,
  unanswered int not null default 0,
  score numeric not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  constraint uq_one_attempt_per_student unique (test_id, student_id)
);

comment on table public.attempts is 'Student test attempts and overall graded scorecard';

-- 9. TABLE: attempt_answers
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option char(1) null check (selected_option is null or selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  constraint uq_one_answer_per_attempt_question unique (attempt_id, question_id)
);

comment on table public.attempt_answers is 'Detailed question-by-question student responses';

-- 10. TABLE: app_settings
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

comment on table public.app_settings is 'Coaching portal configuration settings';

-- 11. INDEXES
create index if not exists idx_attempts_test_id on public.attempts(test_id);
create index if not exists idx_attempts_class_id on public.attempts(class_id);
create index if not exists idx_attempts_student_id on public.attempts(student_id);
create index if not exists idx_subjects_class_id on public.subjects(class_id);
create index if not exists idx_tests_subject_id on public.tests(subject_id);
create index if not exists idx_questions_test_id on public.questions(test_id);
create index if not exists idx_attempt_answers_attempt_id on public.attempt_answers(attempt_id);

-- 12. AUTH TRIGGER: Automatically create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'student';
begin
  if exists (
    select 1 from public.admin_emails
    where email = lower(trim(new.email))
  ) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, role, created_at)
  values (new.id, new.email, v_role, now())
  on conflict (id) do update
  set email = excluded.email,
      role = case
        when exists (select 1 from public.admin_emails where email = lower(trim(excluded.email))) then 'admin'
        else profiles.role
      end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 13. SECURITY FUNCTIONS
-- Helper: Check if current authenticated user has the admin role
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where public.profiles.id = auth.uid() and public.profiles.role = 'admin'
  ) or exists (
    select 1 from public.admin_emails
    where public.admin_emails.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- Function: get_test_questions(test_id)
-- Security definer: allows students to retrieve questions for published tests.
-- CRITICAL SECURITY: Never returns correct_option or explanation.
create or replace function public.get_test_questions(p_test_id uuid)
returns table (
  id uuid,
  test_id uuid,
  "position" int,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tests
    where id = p_test_id and (is_published = true or public.is_admin())
  ) then
    raise exception 'Test is not available or not published';
  end if;

  return query
  select
    q.id,
    q.test_id,
    q."position",
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d
  from public.questions q
  where q.test_id = p_test_id
  order by q."position" asc;
end;
$$;

-- Function: submit_attempt(test_id, student_name, class_id, answers)
create or replace function public.submit_attempt(
  p_test_id uuid,
  p_student_name text,
  p_class_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_test record;
  v_q record;
  v_selected char(1);
  v_raw_val text;
  v_is_correct boolean;
  v_total_questions int := 0;
  v_correct int := 0;
  v_wrong int := 0;
  v_unanswered int := 0;
  v_score numeric := 0;
  v_attempt_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication required to submit test';
  end if;

  select id, marks_per_question, negative_marks, show_result, is_published
  into v_test
  from public.tests
  where id = p_test_id;

  if v_test.id is null then
    raise exception 'Test not found';
  end if;

  if not v_test.is_published and not public.is_admin() then
    raise exception 'Test is not published and cannot be submitted';
  end if;

  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'Invalid class level';
  end if;

  if exists (
    select 1 from public.attempts
    where test_id = p_test_id and student_id = v_student_id
  ) then
    raise exception 'You have already submitted an attempt for this test';
  end if;

  insert into public.attempts (
    test_id,
    student_id,
    student_name,
    class_id,
    total_questions,
    correct,
    wrong,
    unanswered,
    score,
    started_at,
    submitted_at
  ) values (
    p_test_id,
    v_student_id,
    trim(p_student_name),
    p_class_id,
    0, 0, 0, 0, 0,
    now(),
    now()
  ) returning id into v_attempt_id;

  for v_q in
    select id, correct_option
    from public.questions
    where test_id = p_test_id
    order by "position" asc
  loop
    v_total_questions := v_total_questions + 1;

    if jsonb_typeof(p_answers) = 'object' then
      v_raw_val := p_answers->>v_q.id::text;
    else
      select elem->>'selected_option'
      into v_raw_val
      from jsonb_array_elements(p_answers) elem
      where elem->>'question_id' = v_q.id::text;
    end if;

    v_selected := upper(trim(v_raw_val));

    if v_selected is null or v_selected = '' or v_selected not in ('A', 'B', 'C', 'D') then
      v_selected := null;
      v_unanswered := v_unanswered + 1;
      v_is_correct := false;
    elsif v_selected = v_q.correct_option then
      v_correct := v_correct + 1;
      v_score := v_score + coalesce(v_test.marks_per_question, 1);
      v_is_correct := true;
    else
      v_wrong := v_wrong + 1;
      v_score := v_score - coalesce(v_test.negative_marks, 0);
      v_is_correct := false;
    end if;

    insert into public.attempt_answers (
      attempt_id,
      question_id,
      selected_option,
      is_correct
    ) values (
      v_attempt_id,
      v_q.id,
      v_selected,
      v_is_correct
    );
  end loop;

  update public.attempts
  set total_questions = v_total_questions,
      correct = v_correct,
      wrong = v_wrong,
      unanswered = v_unanswered,
      score = v_score
  where id = v_attempt_id;

  if v_test.show_result = true then
    return jsonb_build_object(
      'success', true,
      'show_result', true,
      'attempt_id', v_attempt_id,
      'score', v_score,
      'total_questions', v_total_questions,
      'correct', v_correct,
      'wrong', v_wrong,
      'unanswered', v_unanswered
    );
  else
    return jsonb_build_object(
      'success', true,
      'show_result', false,
      'attempt_id', v_attempt_id
    );
  end if;
end;
$$;

-- Function: get_attempt_result(attempt_id)
create or replace function public.get_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_attempt record;
  v_test record;
  v_subject record;
  v_class record;
  v_is_visible boolean;
  v_questions jsonb := '[]'::jsonb;
begin
  if v_student_id is null then
    raise exception 'Authentication required to view attempt result';
  end if;

  select a.id, a.test_id, a.student_id, a.student_name, a.class_id,
         a.total_questions, a.correct, a.wrong, a.unanswered, a.score,
         a.started_at, a.submitted_at
  into v_attempt
  from public.attempts a
  where a.id = p_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.student_id != v_student_id and not public.is_admin() then
    raise exception 'Access denied: You can only view your own attempt results';
  end if;

  select t.id, t.title, t.marks_per_question, t.negative_marks, t.show_result, t.subject_id
  into v_test
  from public.tests t
  where t.id = v_attempt.test_id;

  if v_test.id is null then
    raise exception 'Associated test not found';
  end if;

  select s.name, s.class_id into v_subject from public.subjects s where s.id = v_test.subject_id;
  select c.grade into v_class from public.classes c where c.id = v_attempt.class_id;

  v_is_visible := coalesce(v_test.show_result, false);
  if public.is_admin() then
    v_is_visible := true;
  end if;

  if not v_is_visible then
    return jsonb_build_object(
      'is_visible', false,
      'attempt_id', v_attempt.id,
      'test_id', v_test.id,
      'test_title', v_test.title,
      'subject_name', coalesce(v_subject.name, 'Subject'),
      'class_grade', coalesce(v_class.grade, 10),
      'student_name', v_attempt.student_name,
      'submitted_at', v_attempt.submitted_at,
      'status', 'submitted'
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'position', q."position",
      'question_text', q.question_text,
      'option_a', q.option_a,
      'option_b', q.option_b,
      'option_c', q.option_c,
      'option_d', q.option_d,
      'student_selected_option', aa.selected_option,
      'correct_option', q.correct_option,
      'is_correct', coalesce(aa.is_correct, false),
      'explanation', coalesce(q.explanation, '')
    ) order by q."position" asc
  ), '[]'::jsonb)
  into v_questions
  from public.questions q
  left join public.attempt_answers aa
    on aa.question_id = q.id and aa.attempt_id = v_attempt.id
  where q.test_id = v_test.id;

  return jsonb_build_object(
    'is_visible', true,
    'attempt_id', v_attempt.id,
    'test_id', v_test.id,
    'test_title', v_test.title,
    'subject_name', coalesce(v_subject.name, 'Subject'),
    'class_grade', coalesce(v_class.grade, 10),
    'student_name', v_attempt.student_name,
    'submitted_at', v_attempt.submitted_at,
    'score', v_attempt.score,
    'marks_per_question', v_test.marks_per_question,
    'negative_marks', v_test.negative_marks,
    'total_questions', v_attempt.total_questions,
    'correct', v_attempt.correct,
    'wrong', v_attempt.wrong,
    'unanswered', v_attempt.unanswered,
    'questions', v_questions
  );
end;
$$;

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.app_settings enable row level security;

-- Admin Full Access Policies
drop policy if exists "Admin full access on admin_emails" on public.admin_emails;
create policy "Admin full access on admin_emails" on public.admin_emails for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on profiles" on public.profiles;
create policy "Admin full access on profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on classes" on public.classes;
create policy "Admin full access on classes" on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on subjects" on public.subjects;
create policy "Admin full access on subjects" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on tests" on public.tests;
create policy "Admin full access on tests" on public.tests for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on questions" on public.questions;
create policy "Admin full access on questions" on public.questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on attempts" on public.attempts;
create policy "Admin full access on attempts" on public.attempts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on attempt_answers" on public.attempt_answers;
create policy "Admin full access on attempt_answers" on public.attempt_answers for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin full access on app_settings" on public.app_settings;
create policy "Admin full access on app_settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Student & Authenticated Read/Write Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Students can view classes" on public.classes;
create policy "Students can view classes" on public.classes for select to authenticated using (true);

drop policy if exists "Students can view subjects" on public.subjects;
create policy "Students can view subjects" on public.subjects for select to authenticated using (true);

drop policy if exists "Students can view published tests" on public.tests;
create policy "Students can view published tests" on public.tests for select to authenticated using (is_published = true);

drop policy if exists "Students can view own attempts" on public.attempts;
create policy "Students can view own attempts" on public.attempts for select to authenticated using (student_id = auth.uid());

drop policy if exists "Students can insert own attempts" on public.attempts;
create policy "Students can insert own attempts" on public.attempts for insert to authenticated with check (student_id = auth.uid());

drop policy if exists "Students can view own attempt answers" on public.attempt_answers;
create policy "Students can view own attempt answers" on public.attempt_answers for select to authenticated using (
  exists (
    select 1 from public.attempts a
    join public.tests t on t.id = a.test_id
    where a.id = attempt_answers.attempt_id
      and a.student_id = auth.uid()
      and t.show_result = true
  )
);

drop policy if exists "Authenticated users can view app settings" on public.app_settings;
create policy "Authenticated users can view app settings" on public.app_settings for select to authenticated using (true);

-- 15. INITIAL SEED DATA
-- Coaching Centre Admin Email (Replace with your actual owner Gmail)
insert into public.admin_emails (email) values ('owner@gmail.com') on conflict (email) do nothing;

-- Default Settings
insert into public.app_settings (key, value) values ('default_show_result', 'false'::jsonb)
on conflict (key) do update set value = excluded.value;

-- Grades 8 through 12
insert into public.classes (grade) values (8), (9), (10), (11), (12) on conflict (grade) do nothing;

-- Standard Subjects for Classes 8, 9, 10
insert into public.subjects (class_id, name)
select c.id, s.name from public.classes c
cross join (values ('Mathematics'), ('Science'), ('English'), ('Social Science'), ('Hindi')) as s(name)
where c.grade in (8, 9, 10)
on conflict (class_id, name) do nothing;

-- Standard Subjects for Classes 11, 12
insert into public.subjects (class_id, name)
select c.id, s.name from public.classes c
cross join (values ('Physics'), ('Chemistry'), ('Mathematics'), ('Biology'), ('English')) as s(name)
where c.grade in (11, 12)
on conflict (class_id, name) do nothing;
