-- ==============================================================================
-- TestHub Schema Migration: 20261122000000_create_testhub_schema.sql
-- Online MCQ Test Platform for Coaching Centre (Classes 8 to 12)
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABLE: admin_emails
-- Designated Gmail addresses that are granted the ADMIN role on sign-in.
-- ------------------------------------------------------------------------------
create table if not exists public.admin_emails (
  email text primary key check (email = lower(trim(email)))
);

comment on table public.admin_emails is 'Authorized Gmail accounts with admin rights for the coaching owner';

-- ------------------------------------------------------------------------------
-- 2. TABLE: profiles
-- User profiles linked to auth.users with strict role check (admin | student).
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'student')) default 'student',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles with role assignment';

-- ------------------------------------------------------------------------------
-- 3. TABLE: classes
-- Grades 8 through 12.
-- ------------------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  grade int not null unique check (grade >= 8 and grade <= 12)
);

comment on table public.classes is 'Coaching centre class levels (Grades 8, 9, 10, 11, 12)';

-- ------------------------------------------------------------------------------
-- 4. TABLE: subjects
-- Subjects taught under each class (e.g. Class 10 -> Mathematics).
-- ------------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint uq_subject_per_class unique (class_id, name)
);

comment on table public.subjects is 'Subjects offered under specific classes';

-- ------------------------------------------------------------------------------
-- 5. TABLE: tests
-- MCQ tests created by admin under a subject.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. TABLE: questions
-- MCQ questions for tests.
-- CRITICAL SECURITY: Direct SELECT is denied to students to prevent cheating.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. TABLE: attempts
-- Student test submissions with graded scores. One attempt per test per student.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. TABLE: attempt_answers
-- Individual student answer selections for each question.
-- ------------------------------------------------------------------------------
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option char(1) null check (selected_option is null or selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  constraint uq_one_answer_per_attempt_question unique (attempt_id, question_id)
);

comment on table public.attempt_answers is 'Detailed question-by-question student responses';

-- ------------------------------------------------------------------------------
-- 9. TABLE: app_settings
-- System-wide key-value configurations (e.g. default_show_result).
-- ------------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

comment on table public.app_settings is 'Coaching portal configuration settings';

-- ------------------------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------------------------
create index if not exists idx_attempts_test_id on public.attempts(test_id);
create index if not exists idx_attempts_class_id on public.attempts(class_id);
create index if not exists idx_attempts_student_id on public.attempts(student_id);
create index if not exists idx_subjects_class_id on public.subjects(class_id);
create index if not exists idx_tests_subject_id on public.tests(subject_id);
create index if not exists idx_questions_test_id on public.questions(test_id);
create index if not exists idx_attempt_answers_attempt_id on public.attempt_answers(attempt_id);

-- ------------------------------------------------------------------------------
-- AUTH TRIGGER: Automatically create profile on new user signup
-- Checks if email exists in admin_emails to assign 'admin' role, otherwise 'student'.
-- ------------------------------------------------------------------------------
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

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- SECURITY FUNCTIONS
-- ------------------------------------------------------------------------------

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
  -- Ensure test exists and is published (or caller is admin)
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
    q.position,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d
  from public.questions q
  where q.test_id = p_test_id
  order by q.position asc;
end;
$$;

-- Function: submit_attempt(test_id, student_name, class_id, answers)
-- Server-side grading function:
-- 1. Checks test is published and exists
-- 2. Enforces one attempt per student (rejects second attempt)
-- 3. Grades each answer server-side against correct_option and applies negative_marks
-- 4. Stores attempt and attempt_answers
-- 5. Returns scorecard ONLY if tests.show_result is true, otherwise returns just a success flag
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
  -- 1. Verify caller is authenticated
  if v_student_id is null then
    raise exception 'Authentication required to submit test';
  end if;

  -- 2. Retrieve test details & verify publication
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

  -- 3. Verify student class exists
  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'Invalid class level';
  end if;

  -- 4. Reject duplicate attempts
  if exists (
    select 1 from public.attempts
    where test_id = p_test_id and student_id = v_student_id
  ) then
    raise exception 'You have already submitted an attempt for this test';
  end if;

  -- 5. Create attempt record first to acquire attempt_id
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

  -- 6. Server-side grading of questions
  for v_q in
    select id, correct_option
    from public.questions
    where test_id = p_test_id
    order by position asc
  loop
    v_total_questions := v_total_questions + 1;

    -- Extract student answer for question (handles either map {"q_id": "A"} or array of objects)
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

    -- Store individual attempt answer
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

  -- 7. Update attempt with final graded tallies
  update public.attempts
  set total_questions = v_total_questions,
      correct = v_correct,
      wrong = v_wrong,
      unanswered = v_unanswered,
      score = v_score
  where id = v_attempt_id;

  -- 8. Return result response
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

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on every table
-- ------------------------------------------------------------------------------
alter table public.admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.app_settings enable row level security;

-- === ADMIN POLICIES (Full read and write on everything) ===
create policy "Admin full access on admin_emails"
  on public.admin_emails for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on profiles"
  on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on classes"
  on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on subjects"
  on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on tests"
  on public.tests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on questions"
  on public.questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on attempts"
  on public.attempts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on attempt_answers"
  on public.attempt_answers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin full access on app_settings"
  on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- === STUDENT & AUTHENTICATED POLICIES ===

-- Profiles: Students can view their own profile
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

-- Classes: Authenticated students can view all active classes
create policy "Students can view classes"
  on public.classes for select to authenticated
  using (true);

-- Subjects: Authenticated students can view all subjects
create policy "Students can view subjects"
  on public.subjects for select to authenticated
  using (true);

-- Tests: Students can view published tests only
create policy "Students can view published tests"
  on public.tests for select to authenticated
  using (is_published = true);

-- Questions:
-- STRICT RULE: Students must have NO direct SELECT access to the questions table.
-- (No student policy is defined on public.questions; access is solely via get_test_questions function).

-- Attempts: Students can view and insert only their own attempts
create policy "Students can view own attempts"
  on public.attempts for select to authenticated
  using (student_id = auth.uid());

create policy "Students can insert own attempts"
  on public.attempts for insert to authenticated
  with check (student_id = auth.uid());

-- Attempt Answers: Students can view their own answers only if test allows result or caller owns attempt
create policy "Students can view own attempt answers"
  on public.attempt_answers for select to authenticated
  using (
    exists (
      select 1 from public.attempts a
      join public.tests t on t.id = a.test_id
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
        and t.show_result = true
    )
  );

-- App Settings: Authenticated users can view settings
create policy "Authenticated users can view app settings"
  on public.app_settings for select to authenticated
  using (true);
